#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::{AssociatedToken, Create};
use anchor_spl::token::{Mint, Token, TokenAccount};
use std::ops::Deref;

mod cpi_interface;
mod state;
mod utils;

use cpi_interface::spl as spl_interface;
use cpi_interface::sunrise as sunrise_interface;
use state::{State, StateEntry};

// TODO: Use actual CPI crate.
use sunrise_core as sunrise_core_cpi;

declare_id!("EUZfY4LePXSZVMvRuiVzbxazw9yBDYU99DpGJKCthxbS");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-spl";
}

#[program]
pub mod spl_beam {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: StateEntry) -> Result<()> {
        ctx.accounts.state.set_inner(input.into());
        let cpi_program = ctx.accounts.associated_token_program.to_account_info();
        let cpi_accounts = Create {
            payer: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
            associated_token: ctx.accounts.pool_tokens_vault.to_account_info(),
            mint: ctx.accounts.pool_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        anchor_spl::associated_token::create(CpiContext::new(cpi_program, cpi_accounts))?;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, update_input: StateEntry) -> Result<()> {
        let mut updated_state: State = update_input.into();
        // Make sure the partial gsol supply remains consistent.
        updated_state.partial_gsol_supply = ctx.accounts.state.partial_gsol_supply;
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
            ctx.accounts.beam_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        // Update the partial gsol supply for this beam.
        let state_account = &mut ctx.accounts.state;
        state_account.partial_gsol_supply = state_account
            .partial_gsol_supply
            .checked_add(lamports)
            .unwrap();
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
            ctx.accounts.beam_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        // Update the partial gsol supply for this beam.
        let state_account = &mut ctx.accounts.state;
        state_account.partial_gsol_supply = state_account
            .partial_gsol_supply
            .checked_add(lamports)
            .unwrap();
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` lamports.
        let pool_tokens_amount =
            utils::pool_tokens_from_lamports(&ctx.accounts.stake_pool, lamports)?;

        // CPI: Withdraw SOL from SPL stake pool.
        spl_interface::withdraw(ctx.accounts.deref(), pool_tokens_amount)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        // Update the partial gsol supply for this beam.
        let state_account = &mut ctx.accounts.state;
        state_account.partial_gsol_supply = state_account
            .partial_gsol_supply
            .checked_sub(lamports)
            .unwrap();

        Ok(())
    }

    pub fn withdraw_stake(ctx: Context<WithdrawStake>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` worth of stake.
        let pool_tokens_amount =
            utils::pool_tokens_from_lamports(&ctx.accounts.stake_pool, lamports)?;

        // CPI: Withdraw SOL from SPL stake pool into a stake account.
        spl_interface::withdraw_stake(ctx.accounts.deref(), pool_tokens_amount)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        // Update the partial gsol supply for this beam.
        let state_account = &mut ctx.accounts.state;
        state_account.partial_gsol_supply = state_account
            .partial_gsol_supply
            .checked_sub(lamports)
            .unwrap();

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
        seeds = [constants::STATE, input.sunrise_state.as_ref()],
        bump
    )]
    pub state: Account<'info, State>,
    /// CHECK: The pool token mint.
    pub pool_mint: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Initialized as token account in handler.
    pub pool_tokens_vault: UncheckedAccount<'info>,
    /// CHECK: PDA authority of the pool tokens.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
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
        mut,
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
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
    pub pool_tokens_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
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
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_core_cpi::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = spl_stake_pool::ID)]
    /// CHECK: The SPL StakePool ProgramID.
    pub spl_stake_pool_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
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
    pub pool_tokens_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
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
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by CPI to Sunrise.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to Sunrise.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_core_cpi::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = spl_stake_pool::ID)]
    /// CHECK: The SPL StakePool ProgramID.
    pub spl_stake_pool_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered Spl stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

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
    pub pool_tokens_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
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
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_core_cpi::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = spl_stake_pool::ID)]
    /// CHECK: The SPL StakePool ProgramID.
    pub spl_stake_pool_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct WithdrawStake<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = stake_pool,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered spl stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

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
    pub pool_tokens_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
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
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked by CPI to SPL StakePool Program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by CPI to Sunrise.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_core_cpi::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = spl_stake_pool::ID)]
    /// CHECK: The SPL StakePool ProgramID.
    pub spl_stake_pool_program: UncheckedAccount<'info>,

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
}
