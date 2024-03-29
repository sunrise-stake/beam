#![allow(clippy::result_large_err)]
// Temporarily allow to pass clippy ci
#![allow(dead_code)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_spl::associated_token::{AssociatedToken, Create};
use anchor_spl::token::{Mint, Token, TokenAccount};
use marinade_cpi::{State as MarinadeState, TicketAccountData as MarinadeTicketAccount};
use std::ops::Deref;

mod cpi_interface;
mod state;
mod system;

use cpi_interface::marinade as marinade_interface;
use cpi_interface::sunrise as sunrise_interface;
use state::{State, StateEntry};
use system::accounts::ProxyTicket;
use system::utils;

use crate::cpi_interface::program::Marinade;
use sunrise_core as sunrise_core_cpi;

declare_id!("G9nMA5HvMa1HLXy1DBA3biH445Zxb2dkqsG4eDfcvgjm");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-marinade";
    // TODO: RECOVERED_MARGIN is needed because, for some reason, the claim tickets have a couple of lamports less than they should,
    // probably due to a rounding error converting to and from marinade.
    // Figure this out and then remove this margin
    const RECOVERED_MARGIN: u64 = 10;
}

#[program]
pub mod marinade_beam {
    use super::*;
    use crate::cpi_interface::marinade;
    use marinade_common::calc_msol_from_lamports;

    pub fn initialize(ctx: Context<Initialize>, input: StateEntry) -> Result<()> {
        ctx.accounts.state.set_inner(input.into());
        let cpi_program = ctx.accounts.associated_token_program.to_account_info();
        let cpi_accounts = Create {
            payer: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.msol_vault_authority.to_account_info(),
            associated_token: ctx.accounts.msol_vault.to_account_info(),
            mint: ctx.accounts.msol_mint.to_account_info(),
            system_program: ctx.accounts.system_program.to_account_info(),
            token_program: ctx.accounts.token_program.to_account_info(),
        };
        anchor_spl::associated_token::create(CpiContext::new(cpi_program, cpi_accounts))?;
        Ok(())
    }

    pub fn update(ctx: Context<Update>, update_input: StateEntry) -> Result<()> {
        ctx.accounts.state.set_inner(update_input.into());
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // CPI: Deposit SOL to Marinade pool. The msol tokens are minted into a vault controlled
        // by a PDA of this program.
        marinade_interface::deposit(ctx.accounts, lamports)?;

        let bump = ctx.bumps.state;
        // CPI: Mint GSOL of the same proportion as the lamports deposited to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn deposit_stake_account(ctx: Context<DepositStake>, validator_index: u32) -> Result<()> {
        // Get the stake value in lamports of the stake account.
        let lamports = utils::get_delegated_stake_amount(&ctx.accounts.stake_account)?;

        // CPI: Deposit stake account to Marinade.
        marinade_interface::deposit_stake_account(ctx.accounts, validator_index)?;

        let bump = ctx.bumps.state;
        // CPI: Mint GSOL of the same proportion as the stake amount to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate how much msol_lamports need to be deposited to unstake `lamports` lamports.
        let msol_lamports = calc_msol_from_lamports(ctx.accounts.marinade_state.as_ref(), lamports);

        msg!("Liquid Unstake {} msol", msol_lamports);
        // CPI: Liquid unstake.
        let accounts = ctx.accounts.deref().into();
        marinade::liquid_unstake(
            &ctx.accounts.marinade_program,
            &ctx.accounts.state,
            accounts,
            msol_lamports,
        )?;

        msg!("Burn {} lamports", lamports);
        let bump = ctx.bumps.state;
        // CPI: Burn GSOL of the same proportion as the number of lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn order_withdrawal(ctx: Context<OrderWithdrawal>, lamports: u64) -> Result<()> {
        // Calculate how much msol_lamports need to be deposited to unstake `lamports` lamports.
        let msol_lamports = calc_msol_from_lamports(ctx.accounts.marinade_state.as_ref(), lamports);

        // CPI: Order unstake and receive a Marinade unstake ticket.
        let accounts = ctx.accounts.deref().into();
        marinade_interface::order_unstake(
            &ctx.accounts.marinade_program,
            &ctx.accounts.state,
            accounts,
            msol_lamports,
        )?;

        // Create a program-owned account mapping the Marinade ticket to the beneficiary that ordered it.
        let ticket_account = &mut ctx.accounts.proxy_ticket_account;
        ticket_account.state = ctx.accounts.state.key();
        ticket_account.marinade_ticket_account = ctx.accounts.new_ticket_account.key();
        ticket_account.beneficiary = ctx.accounts.withdrawer.key();

        let bump = ctx.bumps.state;
        // CPI: Burn GSOL of the same proportion as the number of lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    /// Burning is withdrawing without redeeming the pool tokens. The result is a beam that is "worth more"
    /// than the SOL that has been staked into it, i.e. the pool tokens are more valuable than the SOL.
    /// This allows yield extraction and can be seen as a form of "donation".
    pub fn burn(ctx: Context<Burn>, lamports: u64) -> Result<()> {
        let state_bump = ctx.bumps.state;
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn redeem_ticket(ctx: Context<RedeemTicket>) -> Result<()> {
        // CPI: Claim SOL via Marinade unstake ticket:
        marinade_interface::claim_unstake_ticket(ctx.accounts)?;

        // Transfer the released SOL to the ticket beneficiary:
        let lamports = ctx.accounts.marinade_ticket_account.lamports_amount;
        let ix = system_instruction::transfer(
            &ctx.accounts.vault_authority.key(),
            &ctx.accounts.beneficiary.key(),
            lamports,
        );

        let bump = &[ctx.accounts.state.vault_authority_bump][..];
        let state_address = ctx.accounts.state.key();
        let seeds = &[state_address.as_ref(), constants::VAULT_AUTHORITY, bump][..];
        invoke_signed(
            &ix,
            &[
                ctx.accounts.vault_authority.to_account_info(),
                ctx.accounts.beneficiary.to_account_info(),
            ],
            &[seeds],
        )?;

        Ok(())
    }

    pub fn extract_yield(ctx: Context<ExtractYield>) -> Result<()> {
        let yield_lamports = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.marinade_state,
            &ctx.accounts.msol_vault,
        )?;
        let yield_msol = calc_msol_from_lamports(&ctx.accounts.marinade_state, yield_lamports);

        let yield_account_balance_before = ctx.accounts.yield_account.lamports();

        // TODO: Change to use delayed unstake so as not to incur fees.
        let accounts = ctx.accounts.deref().into();
        marinade::liquid_unstake(
            &ctx.accounts.marinade_program,
            &ctx.accounts.state,
            accounts,
            yield_msol,
        )?;

        let yield_account_balance_after = ctx.accounts.yield_account.lamports();
        let withdrawn_lamports =
            yield_account_balance_after.saturating_sub(yield_account_balance_before);

        msg!("Withdrawn {} lamports to yield account", withdrawn_lamports);

        // CPI: update the epoch report with the extracted yield.
        let state_bump = ctx.bumps.state;
        sunrise_interface::extract_yield(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            withdrawn_lamports,
        )?;

        Ok(())
    }

    pub fn update_epoch_report(ctx: Context<UpdateEpochReport>) -> Result<()> {
        let yield_lamports = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.marinade_state,
            &ctx.accounts.msol_vault,
        )?;

        // Reduce by fee
        // TODO can we do better than an estimate?
        let extractable_lamports = (yield_lamports as f64) * 0.997; // estimated 0.3% unstake fee

        // CPI: update the epoch report with the extracted yield.
        let state_bump = ctx.bumps.state;
        sunrise_interface::update_epoch_report(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            extractable_lamports as u64,
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
        seeds = [constants::STATE, input.sunrise_state.as_ref()],
        bump
    )]
    pub state: Account<'info, State>,
    /// CHECK: The msol mint.
    pub msol_mint: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Initialized as token account in handler.
    pub msol_vault: UncheckedAccount<'info>,
    /// CHECK: PDA authority of the msol vault.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = input.vault_authority_bump
    )]
    pub msol_vault_authority: UncheckedAccount<'info>,
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
        has_one = marinade_state,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered marinade state.
    pub marinade_state: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The registered sunrise state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut,token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority
    )]
    pub msol_vault: Account<'info, TokenAccount>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    // Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub msol_mint_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub reserve_pda: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The registered Marinade state.
    pub marinade_state: UncheckedAccount<'info>,
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
    // Checked by Marinade CPI.
    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
    )]
    pub msol_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub validator_list: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub stake_list: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub duplication_flag: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub msol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub stake_program: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts, Clone)]
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub marinade_state: Box<Account<'info, MarinadeState>>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
    )]
    pub msol_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub treasury_msol_account: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OrderWithdrawal<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub marinade_state: Box<Account<'info, MarinadeState>>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
    )]
    pub msol_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    /// CHECK: Checked by Marinade CPI.
    #[account(mut)]
    pub new_ticket_account: UncheckedAccount<'info>,
    #[account(
        init,
        space = ProxyTicket::SPACE,
        payer = withdrawer
    )]
    pub proxy_ticket_account: Box<Account<'info, ProxyTicket>>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RedeemTicket<'info> {
    #[account(mut, has_one = marinade_state)]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered Marinade state.
    pub marinade_state: UncheckedAccount<'info>,

    pub beneficiary: Signer<'info>,
    #[account(
        mut,
        has_one = marinade_ticket_account,
        has_one = beneficiary,
        close = beneficiary,
    )]
    pub sunrise_ticket_account: Account<'info, ProxyTicket>,
    #[account(mut)]
    pub marinade_ticket_account: Account<'info, MarinadeTicketAccount>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI
    pub reserve_pda: UncheckedAccount<'info>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        mut,
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY,
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    pub marinade_program: Program<'info, Marinade>,
    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Burn<'info> {
    #[account(
    mut,
    has_one = sunrise_state,
    seeds = [constants::STATE, sunrise_state.key().as_ref()],
    bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub burner: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
    seeds = [
    state.key().as_ref(),
    constants::VAULT_AUTHORITY
    ],
    bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by Marinade CPI.
    pub system_program: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub token_program: UncheckedAccount<'info>,

    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
}

#[derive(Accounts, Clone)]
pub struct ExtractYield<'info> {
    #[account(
        has_one = marinade_state,
        has_one = sunrise_state,
        seeds = [constants::STATE, sunrise_state.key().as_ref()],
        bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(
        mut, // Update the extracted yield on the state's epoch report.
        has_one = yield_account
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    #[account(mut)]
    pub marinade_state: Box<Account<'info, MarinadeState>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
    )]
    pub msol_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Matches the yield account key stored in the state.
    pub yield_account: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub treasury_msol_account: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts, Clone)]
pub struct UpdateEpochReport<'info> {
    #[account(
    has_one = marinade_state,
    has_one = sunrise_state,
    seeds = [constants::STATE, sunrise_state.key().as_ref()],
    bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(
    mut, // Update the extractable yield on the state's epoch report.
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    #[account(
        has_one = msol_mint,
    )]
    pub marinade_state: Box<Account<'info, MarinadeState>>,

    pub msol_mint: Box<Account<'info, Mint>>,
    #[account(
        token::mint = msol_mint,
        token::authority = vault_authority,
    )]
    pub msol_vault: Box<Account<'info, TokenAccount>>,
    /// CHECK: Seeds of the MSOL vault authority.
    #[account(
    seeds = [
        state.key().as_ref(),
        constants::VAULT_AUTHORITY
    ],
    bump = state.vault_authority_bump
    )]
    pub vault_authority: UncheckedAccount<'info>,

    /// Required to update the core state epoch report
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
}

#[error_code]
pub enum MarinadeBeamError {
    #[msg("No delegation for stake account deposit")]
    NotDelegated,
    #[msg("The epoch report account has not been updated to the current epoch yet")]
    InvalidEpochReportAccount,
    #[msg("The total ordered ticket amount exceeds the amount in all found tickets")]
    RemainingUnclaimableTicketAmount,
    #[msg("Delayed unstake tickets for the current epoch can not yet be claimed")]
    DelayedUnstakeTicketsNotYetClaimable,
    #[msg("The amount of delayed unstake tickets requested to be recovered exceeds the amount in the report")]
    TooManyTicketsClaimed,
}
