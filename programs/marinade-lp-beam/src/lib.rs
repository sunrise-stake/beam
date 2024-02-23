#![allow(clippy::result_large_err)]
// Temporarily allow to pass clippy ci
#![allow(dead_code)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::{AssociatedToken, Create};
use anchor_spl::token::{Mint, Token, TokenAccount};
use marinade_cpi::State as MarinadeState;
use std::ops::Deref;
use cpi_interface::marinade_lp as marinade_lp_interface;
use cpi_interface::sunrise as sunrise_interface;
use state::{State, StateEntry};
use system::utils;

mod cpi_interface;
mod state;
mod system;

// TODO: Use actual CPI crate.
use crate::cpi_interface::program::Marinade;
use sunrise_core as sunrise_core_cpi;

declare_id!("9Xek4q2hsdPm4yaRt4giQnVTTgRGwGhXQ1HBXbinuPTP");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-marinade-lp";
}

#[program]
pub mod marinade_lp_beam {
    use marinade_common::calc_lamports_from_msol_amount;
    use super::*;
    use crate::cpi_interface::marinade_lp;

    pub fn initialize(ctx: Context<Initialize>, input: StateEntry) -> Result<()> {
        ctx.accounts.state.set_inner(input.into());
        let cpi_program = ctx.accounts.associated_token_program.to_account_info();
        let cpi_accounts = Create {
            payer: ctx.accounts.payer.to_account_info(),
            authority: ctx.accounts.vault_authority.to_account_info(),
            associated_token: ctx.accounts.liq_pool_vault.to_account_info(),
            mint: ctx.accounts.liq_pool_mint.to_account_info(),
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
        // CPI: Add liquidity to Marinade liq_pool. The liq_pool tokens are minted into a
        // vault controlled by a PDA of this program.
        marinade_lp_interface::add_liquidity(ctx.accounts, lamports, None)?;

        let state_bump = ctx.bumps.state;
        // CPI: Mint GSOL of the same proportion as the lamports deposited to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate the number of liq_pool tokens that would be needed to withdraw `lamports`
        let liq_pool_balance = utils::calculate_liq_pool_balance_required_to_withdraw_lamports(
            &ctx.accounts.marinade_state,
            &ctx.accounts.liq_pool_mint,
            &ctx.accounts.liq_pool_sol_leg_pda,
            &ctx.accounts.liq_pool_msol_leg,
            lamports,
        )?;
        // CPI: Remove liquidity from Marinade liq_pool. The liq_pool tokens vault owned by
        // this vault is the source burning lp tokens.
        // The result is a combination of SOL and mSOL.
        // The SOL goes to the withdrawer, and the mSOL goes to the designated mSOL token account.
        // which is typically the Marinade-SP's beam vault.
        // NOTE: This results in an asymmetry in the amount of gSOL each beam is responsible for
        // The lamport amount is burned, and the mSOL amount has been effectively moved from
        // the beam to the Marinade-SP (or whichever beam owns the msol token account)
        let accounts = ctx.accounts.deref().into();
        marinade_lp::remove_liquidity(
            &ctx.accounts.marinade_program,
            &ctx.accounts.state,
            accounts,
            liq_pool_balance.liq_pool_token,
        )?;

        let state_bump = ctx.bumps.state;
        // CPI: Burn GSOL of the same proportion as the lamports withdrawn from the depositor.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            lamports,
        )?;

        let lamport_value_of_msol = calc_lamports_from_msol_amount(
            &ctx.accounts.marinade_state,
            liq_pool_balance.msol
        ).map_err(|_| error!(crate::MarinadeLpBeamError::CalculationFailure))?;
        sunrise_interface::transfer_gsol(
            ctx.accounts.deref(),
            ctx.accounts.sunrise_program.to_account_info(),
            ctx.accounts.sunrise_state.key(),
            state_bump,
            ctx.accounts.state.msol_recipient_beam,
            lamport_value_of_msol,
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

    pub fn order_withdrawal(_ctx: Context<Noop>) -> Result<()> {
        // Marinade liq_pool only supports immediate withdrawals.
        Err(MarinadeLpBeamError::Unimplemented.into())
    }

    pub fn redeem_ticket(_ctx: Context<Noop>) -> Result<()> {
        // Marinade liq_pool only supports immediate withdrawals.
        Err(MarinadeLpBeamError::Unimplemented.into())
    }

    pub fn extract_yield(ctx: Context<ExtractYield>) -> Result<()> {
        let yield_balance = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.marinade_state,
            &ctx.accounts.liq_pool_mint,
            &ctx.accounts.liq_pool_token_vault,
            &ctx.accounts.liq_pool_sol_leg_pda,
            &ctx.accounts.liq_pool_msol_leg,
        )?;

        let yield_account_balance_before = ctx.accounts.yield_account.lamports();

        let accounts = ctx.accounts.deref().into();
        marinade_lp::remove_liquidity(
            &ctx.accounts.marinade_program,
            &ctx.accounts.state,
            accounts,
            yield_balance.liq_pool_token,
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
        let yield_balance = utils::calculate_extractable_yield(
            &ctx.accounts.sunrise_state,
            &ctx.accounts.state,
            &ctx.accounts.marinade_state,
            &ctx.accounts.liq_pool_mint,
            &ctx.accounts.liq_pool_token_vault,
            &ctx.accounts.liq_pool_sol_leg_pda,
            &ctx.accounts.liq_pool_msol_leg,
        )?;

        // in the marinade-lp beam, extractable yield is equivalent to surplus LP tokens
        // when LP tokens are redeemed, the result is SOL and mSOL (both sides of the pool)
        // the SOL is sent to the yield account,
        // and the mSOL is sent to the beam's mSOL token account, which is typically
        // the Marinade-SP's beam vault.
        // This results in less extractable yield for this beam, and more for the Marinade-SP beam.
        // (However, in reality, this beam should rarely be extracted from, as it is
        // included as a buffer to allow for fee-less gSOL withdrawals)
        // Subtract fee TODO can we do better than an estimate?
        let extractable_lamports = (yield_balance.lamports as f64) * 0.997; // estimated 0.3% unstake fee
        msg!("yield_balance: {:?}", yield_balance);
        msg!("Extractable yield: {}", extractable_lamports);

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
    /// CHECK: The liquidity pool token mint.
    pub liq_pool_mint: UncheckedAccount<'info>,
    #[account(mut)]

    /// The token account of the liquidity pool tokens held by the beam.
    /// CHECK: Initialized as token account in handler.
    pub liq_pool_vault: UncheckedAccount<'info>,
    /// CHECK: PDA authority of the lp tokens.
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
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub mint_gsol_to: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = liq_pool_mint,
        token::authority = vault_authority,
    )]
    pub liq_pool_token_vault: Box<Account<'info, TokenAccount>>,
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
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Box<Account<'info, Mint>>,
    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    pub liq_pool_msol_leg: Box<Account<'info, TokenAccount>>,
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub system_program: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub token_program: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(
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
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = liq_pool_mint,
        token::authority = vault_authority,
    )]
    pub liq_pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.
    /// The SOL portion is transferred to the user (withdrawer) and the mSOL portion
    /// is transferred to the msol_token_account owned by the marinade stake pool.
    #[account(mut, address = state.msol_token_account)]
    pub transfer_msol_to: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
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
    pub marinade_program: Program<'info, Marinade>,
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
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub burner: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Box<Account<'info, TokenAccount>>,

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

#[derive(Accounts)]
pub struct ExtractYield<'info> {
    #[account(
    has_one = sunrise_state,
    has_one = marinade_state,
    seeds = [constants::STATE, sunrise_state.key().as_ref()],
    bump
    )]
    pub state: Box<Account<'info, State>>,
    #[account(mut)]
    pub marinade_state: Box<Account<'info, MarinadeState>>,
    #[account(
        mut, // Update the extracted yield on the state's epoch report.
        has_one = yield_account
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(mut)]
    /// CHECK: Matches the yield account key stored in the state.
    pub yield_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
    mut,
    token::mint = liq_pool_mint,
    token::authority = vault_authority,
    )]
    pub liq_pool_token_vault: Box<Account<'info, TokenAccount>>,
    #[account(
    seeds = [
    state.key().as_ref(),
    constants::VAULT_AUTHORITY
    ],
    bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub vault_authority: UncheckedAccount<'info>,

    /// When withdrawing from the Marinade LP, the withdrawal is part SOL, part mSOL.
    /// The SOL portion is transferred to the user (withdrawer) and the mSOL portion
    /// is transferred to the msol_token_account owned by the marinade stake pool.
    #[account(mut, address = state.msol_token_account)]
    pub transfer_msol_to: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub system_program: UncheckedAccount<'info>,
    /// CHECK: Checked by Marinade CPI.
    pub token_program: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
    pub marinade_program: Program<'info, Marinade>,
}

#[derive(Accounts)]
pub struct UpdateEpochReport<'info> {
    #[account(
    has_one = sunrise_state,
    has_one = marinade_state,
    seeds = [constants::STATE, sunrise_state.key().as_ref()],
    bump
    )]
    pub state: Box<Account<'info, State>>,
    pub marinade_state: Box<Account<'info, MarinadeState>>,
    #[account(
    mut, // Update the extracted yield on the state's epoch report.
    )]
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,

    /// Required to update the core state epoch report
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,

    #[account(mut)]
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
    mut,
    token::mint = liq_pool_mint,
    token::authority = vault_authority,
    )]
    pub liq_pool_token_vault: Box<Account<'info, TokenAccount>>,
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
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub sysvar_instructions: UncheckedAccount<'info>,

    pub sunrise_program: Program<'info, sunrise_core_cpi::program::SunriseCore>,
}

#[derive(Accounts)]
pub struct Noop {}

#[error_code]
pub enum MarinadeLpBeamError {
    #[msg("An error occurred during calculation")]
    CalculationFailure,
    #[msg("This feature is unimplemented for this beam")]
    Unimplemented,
}
