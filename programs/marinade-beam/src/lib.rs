#![allow(clippy::result_large_err)]

use anchor_lang::prelude::*;
use anchor_lang::solana_program::{program::invoke_signed, system_instruction};
use anchor_spl::token::{Mint, Token, TokenAccount};
use marinade_cpi::{State as MarinadeState, TicketAccountData as MarinadeTicketAccount};
use std::ops::Deref;

mod cpi_interface;
mod state;
mod utils;

use cpi_interface::marinade as marinade_interface;
use cpi_interface::sunrise as sunrise_interface;
use state::{ProxyTicketAccount, State};

// TODO: Use actual CPI crate.
use sunrise_beam as sunrise_beam_cpi;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-marinade";
}

#[program]
pub mod marinade_beam {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: State) -> Result<()> {
        ctx.accounts.state.set_inner(input);
        Ok(())
    }

    pub fn update(ctx: Context<Update>, update_input: State) -> Result<()> {
        ctx.accounts.state.set_inner(update_input);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // CPI: Deposit SOL to Marinade pool. The msol tokens are minted into a vault controlled
        // by a PDA of this program.
        marinade_interface::deposit(ctx.accounts, lamports)?;

        let bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint GSOL of the same proportion as the lamports deposited to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
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

        let bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint GSOL of the same proportion as the stake amount to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate how much msol_lamports need to be deposited to unstake `lamports` lamports.
        let msol_lamports =
            utils::calc_msol_from_lamports(ctx.accounts.marinade_state.as_ref(), lamports)?;

        // CPI: Liquid unstake.
        marinade_interface::liquid_unstake(ctx.accounts, msol_lamports)?;

        let bump = *ctx.bumps.get("state").unwrap();
        // CPI: Burn GSOL of the same proportion as the number of lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn order_withdrawal(ctx: Context<OrderWithdrawal>, lamports: u64) -> Result<()> {
        // Calculate how much msol_lamports need to be deposited to unstake `lamports` lamports.
        let msol_lamports =
            utils::calc_msol_from_lamports(ctx.accounts.marinade_state.as_ref(), lamports)?;
        // CPI: Order unstake and receive a Marinade unstake ticket.
        marinade_interface::order_unstake(ctx.accounts, msol_lamports)?;

        // Create a program-owned account mapping the Marinade ticket to the beneficiary that ordered it.
        let ticket_account = &mut ctx.accounts.proxy_ticket_account;
        ticket_account.state_address = ctx.accounts.state.key();
        ticket_account.marinade_ticket_account = ctx.accounts.new_ticket_account.key();
        ticket_account.beneficiary = ctx.accounts.withdrawer.key();

        let bump = *ctx.bumps.get("state").unwrap();
        // CPI: Burn GSOL of the same proportion as the number of lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            bump,
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
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered marinade state.
    pub marinade_state: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The registered sunrise state.
    pub sunrise_state: UncheckedAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut,token::mint = gsol_mint,token::authority = depositor)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Account<'info, Mint>,
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
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub instructions_sysvar: UncheckedAccount<'info>,

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

    #[account(address = sunrise_beam::ID)]
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
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
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
    #[account(mut,token::mint = gsol_mint,token::authority = stake_owner)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
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
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub instructions_sysvar: UncheckedAccount<'info>,

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
pub struct Withdraw<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
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
    pub gsol_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
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
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked by Marinade CPI.
    pub treasury_msol_account: UncheckedAccount<'info>,

    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise Program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade Program ID.
    pub marinade_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct OrderWithdrawal<'info> {
    #[account(
        mut,
        has_one = sunrise_state,
        has_one = marinade_state,
        seeds = [constants::STATE], bump
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
    pub gsol_token_account: Account<'info, TokenAccount>,
    #[account(mut)]
    /// Verified in CPI to Sunrise program.
    pub gsol_mint: Account<'info, Mint>,

    #[account(mut)]
    // Checked by Marinade CPI.
    pub msol_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = msol_mint,
        token::authority = vault_authority,
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

    /// CHECK: Checked by Sunrise CPI.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked by Sunrise CPI.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(zero, rent_exempt = enforce)]
    /// CHECK: Checked by Marinade CPI.
    pub new_ticket_account: UncheckedAccount<'info>,
    #[account(
        init,
        space = ProxyTicketAccount::SPACE,
        payer = withdrawer
    )]
    pub proxy_ticket_account: Account<'info, ProxyTicketAccount>,

    #[account(address = sunrise_beam_cpi::ID)]
    /// CHECK: The Sunrise Program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade Program ID.
    pub marinade_program: UncheckedAccount<'info>,

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
    pub sunrise_ticket_account: Account<'info, ProxyTicketAccount>,
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
    #[msg("An error occurred during calculation")]
    CalculationFailure,
}
