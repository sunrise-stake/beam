#![allow(clippy::result_large_err)]

mod marinade_helpers;
mod state;
mod sunrise_helpers;
mod utils;

use std::ops::Deref;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_spl::token::{Mint, Token, TokenAccount};
use marinade_cpi::state::{State as MarinadeState, TicketAccountData as MarinadeTicketAccount};
use state::{ProxyTicketAccount, RegisterInput, State};
use sunrise_beam as sunrise_beam_cpi;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod constants {
    pub const MSOL_AUTH: &[u8] = b"msol_authority";
    pub const STATE: &[u8] = b"sunrise-marinade-seed";
}

#[program]
pub mod marinade_beam {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: RegisterInput) -> Result<()> {
        let account = &mut ctx.accounts.state;

        let state_object = State {
            update_authority: input.update_authority,
            marinade_state: input.marinade_state,
            gsol_mint: input.gsol_mint,
            treasury: input.treasury,
            sunrise_beam: input.sunrise_beam,
            msol_authority_bump: input.msol_authority_bump,
        };

        account.set_inner(state_object);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // cpi: deposit to marinade
        marinade_helpers::deposit(ctx.accounts, lamports)?;

        // cpi: mint gsol
        let bump = *ctx.bumps.get("state").unwrap();
        sunrise_helpers::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn deposit_stake_account(ctx: Context<DepositStake>, validator_index: u32) -> Result<()> {
        // cpi: deposit stake account to marinade
        marinade_helpers::deposit_stake_account(ctx.accounts, validator_index)?;

        // cpi: mint gsol
        let lamports = utils::get_delegated_stake_amount(&ctx.accounts.stake_account)?;
        let bump = *ctx.bumps.get("state").unwrap();
        sunrise_helpers::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn order_unstake(ctx: Context<OrderUnstake>, lamports: u64) -> Result<()> {
        // cpi: order unstake
        let msol_lamports =
            utils::calc_msol_from_lamports(ctx.accounts.marinade_state.as_ref(), lamports)?;
        marinade_helpers::order_unstake(ctx.accounts, msol_lamports)?;

        // set proxy-ticket values
        let ticket_account = &mut ctx.accounts.proxy_ticket_account;
        ticket_account.state_address = ctx.accounts.state.key();
        ticket_account.marinade_ticket_account = ctx.accounts.new_ticket_account.key();
        ticket_account.beneficiary = ctx.accounts.gsol_token_account_owner.key();

        // cpi: burn gsol
        let bump = *ctx.bumps.get("state").unwrap();
        sunrise_helpers::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn claim_unstake_ticket(ctx: Context<ClaimUnstakeTicket>) -> Result<()> {
        marinade_helpers::claim_unstake_ticket(ctx.accounts)?;

        // transfer the released SOL to the beneficiary
        let lamports = ctx.accounts.marinade_ticket_account.lamports_amount;
        let ix = system_instruction::transfer(
            &ctx.accounts.msol_vault_authority.key(),
            &ctx.accounts.beneficiary.key(),
            lamports,
        );

        let bump = &[ctx.accounts.state.msol_authority_bump][..];
        let state_address = ctx.accounts.state.key();
        let seeds = &[state_address.as_ref(), constants::MSOL_AUTH, bump][..];
        invoke_signed(
            &ix,
            &[
                ctx.accounts.msol_vault_authority.to_account_info(),
                ctx.accounts.beneficiary.to_account_info(),
            ],
            &[seeds],
        )?;

        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        init,
        space = State::SPACE,
        payer = payer,
        seeds = [constants::STATE], 
        bump
    )]
    pub state: Account<'info, State>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered Marinade state.
    pub marinade_state: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = msol_vault_authority
    )]
    pub msol_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::MSOL_AUTH
        ],
        bump = state.msol_authority_bump
    )]
    pub msol_vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    /// CHECK: Checked in Marinade program.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    /// CHECK: Checked in Marinade program.
    pub msol_mint_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub reserve_pda: UncheckedAccount<'info>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct DepositStake<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered Marinade state.
    pub marinade_state: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub stake_depositor: Signer<'info>,

    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = msol_vault_authority,
    )]
    pub msol_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::MSOL_AUTH
        ],
        bump = state.msol_authority_bump
    )]
    pub msol_vault_authority: UncheckedAccount<'info>,
    #[account(mut,token::mint = gsol_mint)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub validator_list: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub stake_list: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in Marinade program.
    pub duplication_flag: UncheckedAccount<'info>,
    /// CHECK: Checked in Marinade program.
    pub msol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in Marinade program.
    pub stake_program: UncheckedAccount<'info>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OrderUnstake<'info> {
    #[account(
        mut,
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    pub marinade_state: Account<'info, MarinadeState>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_token_account_owner: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,

    #[account(mut)]
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = msol_vault_authority,
    )]
    pub msol_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::MSOL_AUTH
        ],
        bump = state.msol_authority_bump
    )]
    pub msol_vault_authority: UncheckedAccount<'info>,

    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(zero, rent_exempt = enforce)]
    /// CHECK: Checked in Marinade program.
    pub new_ticket_account: UncheckedAccount<'info>,
    #[account(
        init,
        space = ProxyTicketAccount::SPACE,
        payer = gsol_token_account_owner
    )]
    pub proxy_ticket_account: Account<'info, ProxyTicketAccount>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub rent: Sysvar<'info, Rent>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimUnstakeTicket<'info> {
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
    pub sunrise_ticket_account: Account<'info, ProxyTicketAccount>,
    #[account(mut)]
    pub marinade_ticket_account: Account<'info, MarinadeTicketAccount>,

    #[account(mut)]
    /// CHECK: Checked in marinade program
    pub reserve_pda: UncheckedAccount<'info>,

    #[account(
        mut,
        seeds = [
            state.key().as_ref(),
            constants::MSOL_AUTH,
        ],
        bump = state.msol_authority_bump
    )]
    pub msol_vault_authority: UncheckedAccount<'info>,

    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,

    pub clock: Sysvar<'info, Clock>,
    pub system_program: Program<'info, System>,
}

#[error_code]
pub enum MarinadeBeamError {
    #[msg("No delegation for stake account deposit")]
    NotDelegated,
    #[msg("An error occurred when calculating an MSol value")]
    CalculationFailure,
}
