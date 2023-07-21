#![allow(clippy::result_large_err)]
// Temporarily allow to pass clippy ci
#![allow(dead_code)]

use anchor_lang::prelude::*;
use anchor_spl::associated_token::{AssociatedToken, Create};
use anchor_spl::token::{Mint, Token, TokenAccount};
use marinade_cpi::State as MarinadeState;
use std::ops::Deref;

mod cpi_interface;
mod state;
mod system;

use cpi_interface::marinade_lp as marinade_lp_interface;
use cpi_interface::sunrise as sunrise_interface;
use state::{State, StateEntry};
use system::utils;

// TODO: Use actual CPI crate.
use sunrise_beam as sunrise_beam_cpi;

declare_id!("9Xek4q2hsdPm4yaRt4giQnVTTgRGwGhXQ1HBXbinuPTP");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-marinade-lp";
}

#[program]
pub mod marinade_lp_beam {
    use super::*;

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
        let mut updated_state: State = update_input.into();
        // Make sure the partial gsol supply remains consistent.
        updated_state.partial_gsol_supply = ctx.accounts.state.partial_gsol_supply;
        ctx.accounts.state.set_inner(updated_state);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // CPI: Add liquidity to Marinade liq_pool. The liq_pool tokens are minted into a
        // vault controlled by a PDA of this program.
        marinade_lp_interface::add_liquidity(ctx.accounts, lamports, None)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint GSOL of the same proportion as the lamports deposited to the depositor.
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
        // Calculate the number of liq_pool tokens `lamports` is worth.
        let liq_pool_tokens = utils::liq_pool_tokens_from_lamports(
            &ctx.accounts.marinade_state,
            &ctx.accounts.liq_pool_mint,
            &ctx.accounts.liq_pool_sol_leg_pda,
            lamports,
        )?;
        // CPI: Remove liquidity from Marinade liq_pool. The liq_pool tokens vault owned by
        // this vault is the source burning lp tokens.
        marinade_lp_interface::remove_liquidity(ctx.accounts, liq_pool_tokens)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Burn GSOL of the same proportion as the lamports withdrawn from the depositor.
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

    // pub fn extract_yield() {}

    pub fn order_withdrawal(_ctx: Context<Noop>) -> Result<()> {
        // Marinade liq_pool only supports immediate withdrawals.
        Err(MarinadeLpBeamError::Unimplemented.into())
    }

    pub fn redeem_ticket(_ctx: Context<Noop>) -> Result<()> {
        // Marinade liq_pool only supports immediate withdrawals.
        Err(MarinadeLpBeamError::Unimplemented.into())
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
    pub instructions_sysvar: UncheckedAccount<'info>,

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

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade ProgramID.
    pub marinade_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct Withdraw<'info> {
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

    #[account(mut, address = state.msol_token_account)]
    pub transfer_msol_to: Box<Account<'info, TokenAccount>>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
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
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,
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
