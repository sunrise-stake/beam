#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::AnchorDeserialize;
use anchor_spl::associated_token::{AssociatedToken, Create};
use anchor_spl::token::{Mint, Token, TokenAccount};
use constants::STAKE_ACCOUNT_SIZE;
use cpi_interface::{
    program::{NativeStakeProgram, SplStakePool},
    spl as spl_interface,
    stake_pool::StakePool,
    sunrise as sunrise_interface,
};
use seeds::*;
use state::{State, StateEntry};
use std::ops::Deref;

use crate::cpi_interface::stake_account::StakeAccount;
use sunrise_core as sunrise_core_cpi;

mod constants;
mod cpi_interface;
mod seeds;
mod state;
mod utils;

declare_id!("EUZfY4LePXSZVMvRuiVzbxazw9yBDYU99DpGJKCthxbS");

#[program]
pub mod spl_beam {
    use super::*;
    use crate::cpi_interface::stake_account::claim_stake_account;
    use crate::utils::proportional;

    pub fn initialize(ctx: Context<Initialize>, input: StateEntry) -> Result<()> {
        ctx.accounts.state.set_inner(input.into());
        let cpi_program = ctx.accounts.associated_token_program.to_account_info();
        let cpi_accounts = Create {
            payer: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
            associated_token: ctx.accounts.pool_token_vault.to_account_info(),
            mint: ctx.accounts.pool_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        anchor_spl::associated_token::create(CpiContext::new(cpi_program, cpi_accounts))?;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, update_input: StateEntry) -> Result<()> {
        let updated_state: State = update_input.into();
        ctx.accounts.state.set_inner(updated_state);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // CPI: Deposit SOL to SPL stake pool.
        spl_interface::deposit(ctx.accounts, lamports)?;

        let state_bump = ctx.bumps.state;
        // CPI: Mint GSOL of the same proportion as the lamports deposited to depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            ctx.accounts.stake_pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn deposit_stake(ctx: Context<DepositStake>) -> Result<()> {
        // Get the stake value in lamports of the stake account.
        let lamports = utils::get_delegated_stake_amount(&ctx.accounts.stake_account)?;
        // CPI: Deposit staked SOL to SPL stake pool.
        spl_interface::deposit_stake(ctx.accounts)?;

        let state_bump = ctx.bumps.state;
        // CPI: Mint Gsol of the same proportion as the stake amount.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            ctx.accounts.stake_pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` lamports.
        let pool = &ctx.accounts.stake_pool;
        let pool_tokens_amount =
            utils::pool_tokens_from_lamports(&pool.clone().into_inner(), lamports)?;

        // CPI: Withdraw SOL from SPL stake pool.
        spl_interface::withdraw(ctx.accounts.deref(), pool_tokens_amount)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    /// Burning is withdrawing without redeeming the pool tokens. The result is a beam that is "worth more"
    /// than the SOL that has been staked into it, i.e. the pool tokens are more valuable than the SOL.
    /// This allows yield extraction and can be seen as a form of "donation".
    pub fn burn(ctx: Context<Burn>, lamports: u64) -> Result<()> {
        let pool = &ctx.accounts.stake_pool;

        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn withdraw_stake(ctx: Context<WithdrawStake>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` worth of stake.
        let pool = &ctx.accounts.stake_pool;
        let pool_tokens_amount =
            utils::pool_tokens_from_lamports(&pool.clone().into_inner(), lamports)?;

        // CPI: Withdraw SOL from SPL stake pool into a stake account.
        let extract_stake_account_accounts = ctx.accounts.deref().into();
        spl_interface::extract_stake(&extract_stake_account_accounts, pool_tokens_amount)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            ctx.accounts.stake_pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn order_withdrawal(_ctx: Context<Noop>) -> Result<()> {
        // spl stake pools only support immediate withdrawals.
        Err(SplBeamError::Unimplemented.into())
    }

    pub fn redeem_ticket(_ctx: Context<Noop>) -> Result<()> {
        // spl stake pools only support immediate withdrawals.
        Err(SplBeamError::Unimplemented.into())
    }

    pub fn update_epoch_report(ctx: Context<UpdateEpochReport>) -> Result<()> {
        // Calculate how much yield can be extracted from the pool.
        let gross_extractable_yield = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.stake_pool,
            &ctx.accounts.pool_token_vault,
        )?;

        // Reduce by fee
        let fee = proportional(
            gross_extractable_yield,
            ctx.accounts.stake_pool.stake_withdrawal_fee.numerator,
            ctx.accounts.stake_pool.stake_withdrawal_fee.denominator,
        )?;
        let net_extractable_yield = gross_extractable_yield.saturating_sub(fee);

        // CPI: update the epoch report with the extracted yield.
        let state_bump = ctx.bumps.state;
        sunrise_interface::update_epoch_report(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            ctx.accounts.stake_pool.key(),
            state_bump,
            net_extractable_yield,
        )?;

        Ok(())
    }

    pub fn extract_yield(ctx: Context<ExtractYield>) -> Result<()> {
        // Calculate how much yield can be extracted from the pool.
        let extractable_yield = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.stake_pool,
            &ctx.accounts.pool_token_vault,
        )?;

        // CPI: Extract this yield into a new stake account.
        let extract_stake_account_accounts = ctx.accounts.deref().into();
        spl_interface::extract_stake(&extract_stake_account_accounts, extractable_yield)?;

        // get the staked lamports amount
        let stake_account = &mut ctx.accounts.new_stake_account;
        stake_account.reload()?;
        let lamports = stake_account.to_account_info().lamports();

        // CPI: Withdraw the lamports from the stake account.
        let claim_stake_account_accounts = ctx.accounts.deref().into();
        claim_stake_account(&claim_stake_account_accounts, lamports)?;

        // CPI: update the epoch report with the extracted yield.
        let state_bump = ctx.bumps.state;
        sunrise_interface::extract_yield(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            ctx.accounts.stake_pool.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
#[instruction(input: StateEntry)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        space = State::SPACE,
        payer = payer,
        seeds = [STATE, input.sunrise_state.as_ref(), input.stake_pool.as_ref()],
        bump
    )]
    pub state: Account<'info, State>,
    /// CHECK: The pool token mint.
    pub pool_mint: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Initialized as token account in handler.
    pub pool_token_vault: UncheckedAccount<'info>,
    /// CHECK: PDA authority of the pool tokens.
    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = input.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
}

#[derive(Accounts)]
pub struct Update<'info> {
    #[account(mut)]
    pub update_authority: Signer<'info>,
    #[account(
        mut,
        has_one = update_authority
    )]
    pub state: Account<'info, State>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [STATE, sunrise_state.key().as_ref(), stake_pool.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,

    #[account(mut)]
    pub stake_pool: Box<Account<'info, StakePool>>,

    #[account(mut)]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut,token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by CPI to Sunrise.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub spl_stake_pool_program: Program<'info, SplStakePool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered SPL stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub stake_owner: Signer<'info>,
    #[account(mut)]
    /// CHECK: The stake account to be deposited.
    pub stake_account: UncheckedAccount<'info>,
    #[account(mut,token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub validator_list: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub stake_pool_deposit_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub validator_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub sysvar_stake_history: UncheckedAccount<'info>,

    pub sysvar_clock: Sysvar<'info, Clock>,
    pub native_stake_program: Program<'info, NativeStakeProgram>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by CPI to Sunrise.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub spl_stake_pool_program: Program<'info, SplStakePool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [STATE, sunrise_state.key().as_ref(), stake_pool.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub stake_pool: Box<Account<'info, StakePool>>,
    #[account(mut)]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub sysvar_stake_history: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub spl_stake_pool_program: Program<'info, SplStakePool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered spl stake pool.
    pub stake_pool: Box<Account<'info, StakePool>>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,
    /// CHECK: The uninitialized new stake account.
    pub new_stake_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by CPI to SPL StakePool program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub validator_stake_list: UncheckedAccount<'info>,
    #[account(mut)]
    // The SPL StakePool program checks that this is either
    // the stake account of a recognized validator, or the
    // pool's reserve stake account.
    /// CHECK: The stake account to split from.
    pub stake_account_to_split: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub sysvar_stake_history: UncheckedAccount<'info>,

    pub sysvar_clock: Sysvar<'info, Clock>,
    pub native_stake_program: Program<'info, NativeStakeProgram>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub spl_stake_pool_program: Program<'info, SplStakePool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts, Clone)]
pub struct ExtractYield<'info> {
    #[account(
        has_one = stake_pool,
        has_one = sunrise_state,
        seeds = [STATE, sunrise_state.key().as_ref(), stake_pool.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(
        mut, // Update the extracted yield on the state's epoch report.
        has_one = yield_account
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    #[account(
        mut,
        has_one = pool_mint
    )]
    pub stake_pool: Box<Account<'info, StakePool>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    pub pool_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    /// CHECK: Matches the yield key stored in the state.
    pub yield_account: UncheckedAccount<'info>,

    #[account(
    init_if_needed,
    space = STAKE_ACCOUNT_SIZE,
    payer = payer,
    owner = anchor_lang::solana_program::stake::program::ID,
    seeds = [
        state.key().as_ref(),
        EXTRACT_YIELD_STAKE_ACCOUNT
    ],
    bump
    )]
    /// The uninitialized new stake account. Will be initialised by CPI to the SPL StakePool program.
    pub new_stake_account: Account<'info, StakeAccount>,

    #[account(
    seeds = [
        state.key().as_ref(),
        VAULT_AUTHORITY
    ],
    bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub validator_stake_list: UncheckedAccount<'info>,
    #[account(mut)]
    // The SPL StakePool program checks that this is either
    // the stake account of a recognized validator, or the
    // pool's reserve stake account.
    /// CHECK: The stake account to split from. - Checked by CPI to SPL StakePool Program.
    pub stake_account_to_split: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,

    pub sysvar_clock: Sysvar<'info, Clock>,
    pub native_stake_program: Program<'info, NativeStakeProgram>,
    /// CHECK: Checked by CPI to SPL Stake program.
    pub sysvar_stake_history: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub spl_stake_pool_program: Program<'info, SplStakePool>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts, Clone)]
pub struct UpdateEpochReport<'info> {
    #[account(
        has_one = stake_pool,
        has_one = sunrise_state,
        seeds = [STATE, sunrise_state.key().as_ref(), stake_pool.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(
    mut, // Update the extractable yield on the state's epoch report.
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    pub stake_pool: Box<Account<'info, StakePool>>,
    pub pool_mint: Box<Account<'info, Mint>>,

    #[account(
        seeds = [
            state.key().as_ref(),
            VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    #[account(
        token::mint = pool_mint,
        token::authority = vault_authority
    )]
    pub pool_token_vault: Box<Account<'info, TokenAccount>>,

    /// Required to update the core state epoch report
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(
    has_one = sunrise_state,
    has_one = stake_pool,
    seeds = [STATE, sunrise_state.key().as_ref(), stake_pool.key().as_ref()],
    bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    pub stake_pool: Box<Account<'info, StakePool>>,

    #[account(mut)]
    pub burner: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by CPI to Sunrise.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Noop {}

#[error_code]
pub enum SplBeamError {
    #[msg("No delegation for stake account deposit")]
    NotDelegated,
    #[msg("An error occurred during calculation")]
    CalculationFailure,
    #[msg("This feature is unimplemented for this beam")]
    Unimplemented,
    #[msg("The yield stake account cannot yet be claimed")]
    YieldStakeAccountNotCooledDown,
    #[msg("The yield being extracted is insufficient to cover the rent of the stake account")]
    InsufficientYieldToExtract,
}
