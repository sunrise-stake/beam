use std::ops::Deref;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token, TokenAccount};

mod cpi_interface;
mod state;
mod utils;

use state::State;
use cpi_interface::spl as spl_interface;
use cpi_interface::sunrise as sunrise_interface;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-spl";
}

#[program]
pub mod spl_beam {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: State) -> Result<()> {
        ctx.accounts.state.set_inner(input);
        Ok(())
    }

    pub fn deposit(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
        // CPI: Deposit SOL to SPL stake pool.
        spl_interface::deposit(ctx.accounts, lamports)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint GSOL of the same proportion as the lamports deposited to depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(), 
            ctx.accounts.beam_program.to_account_info(), 
            state_bump, 
            lamports
        )?;
        Ok(())
    }

    pub fn deposit_stake(ctx: Context<DepositStake>) -> Result<()> {
        // Get the stake value in lamports of the stake account.
        let amount = utils::get_delegated_stake_amount(&ctx.accounts.stake_account)?;
        // CPI: Deposit staked SOL to SPL stake pool.
        spl_interface::deposit_stake(ctx.accounts)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint Gsol of the same proportion as the stake amount.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(), 
            ctx.accounts.beam_program.to_account_info(), 
            state_bump, 
            amount
        )?;
        Ok(())
    }

    pub fn withdraw(ctx: Context<Withdraw>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` lamports.
        let pool_tokens_amount = utils::pool_tokens_from_lamports(&ctx.accounts.stake_pool, lamports)?;
        let state_bump = *ctx.bumps.get("state").unwrap();

        // CPI: Withdraw SOL from SPL stake pool.
        spl_interface::withdraw(ctx.accounts.deref(), pool_tokens_amount, state_bump)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(), 
            ctx.accounts.beam_program.to_account_info(), 
            state_bump,
            lamports
        )?;

        Ok(())
    }

    pub fn withdraw_stake(ctx: Context<WithdrawStake>, lamports: u64) -> Result<()> {
        // Calculate the number of pool tokens needed to be burnt to withdraw `lamports` worth of stake.
        let pool_tokens_amount = utils::pool_tokens_from_lamports(&ctx.accounts.stake_pool, lamports)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Withdraw SOL from SPL stake pool into a stake account.
        spl_interface::withdraw_stake(ctx.accounts.deref(), pool_tokens_amount, state_bump)?;

        // CPI: Burn GSOL of the same proportion as the lamports withdrawn.
        sunrise_interface::burn_gsol(
            ctx.accounts.deref(), 
            ctx.accounts.beam_program.to_account_info(), 
            state_bump,
            lamports
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
        has_one = stake_pool,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered SPL stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub depositor: Signer<'info>,
    #[account(mut,token::mint = gsol_mint,token::authority = depositor)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = pool_tokens_vault_auth
    )]
    pub pool_tokens_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub pool_tokens_vault_auth: UncheckedAccount<'info>,

    /// CHECK: Checked in the SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked in the SPL StakePool Program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in the SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
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
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = stake_pool,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered SPL stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub stake_owner: Signer<'info>,
    #[account(mut)]
    /// CHECK: The stake account to be deposited.
    pub stake_account: UncheckedAccount<'info>,
    #[account(mut,token::mint = gsol_mint,token::authority = stake_owner)]
    pub mint_gsol_to: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = pool_tokens_vault_auth
    )]
    pub pool_tokens_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub pool_tokens_vault_auth: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked in SPL StakePool Program.
    pub validator_list: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub stake_pool_deposit_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked in SPL StakePool Program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub validator_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub sysvar_stake_history: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked in SPL StakePool Program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
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
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = stake_pool,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered Spl stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub pool_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = pool_tokens_vault_auth
    )]
    pub pool_tokens_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub pool_tokens_vault_auth: UncheckedAccount<'info>,

    /// CHECK: Checked in the SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked in SPL StakePool Program.
    pub reserve_stake_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in the SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub sysvar_stake_history: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
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
        has_one = gsol_mint,
        has_one = sunrise_beam,
        has_one = stake_pool,
        seeds = [constants::STATE], bump
    )]
    pub state: Account<'info, State>,
    #[account(mut)]
    /// CHECK: The registered Spl stake pool.
    pub stake_pool: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: The main Sunrise beam state.
    pub sunrise_beam: UncheckedAccount<'info>,

    #[account(mut)]
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Account<'info, TokenAccount>,
    /// CHECK: The uninitialized new stake account.
    pub new_stake_account: UncheckedAccount<'info>,

    #[account(mut)]
    pub pool_mint: Account<'info, Mint>,
    #[account(
        mut,
        token::mint = pool_mint,
        token::authority = pool_tokens_vault_auth
    )]
    pub pool_tokens_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub pool_tokens_vault_auth: UncheckedAccount<'info>,

    /// CHECK: Checked in SPL StakePool Program.
    pub stake_pool_withdraw_authority: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in SPL StakePool Program.
    pub validator_stake_list: UncheckedAccount<'info>,
    #[account(mut)]
    // The SPL StakePool program checks that this is either
    // the stake account of a recognized validator, or the 
    // pool's reserve stake account.
    /// CHECK: The stake account to split from.
    pub stake_account_to_split: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    #[account(mut)]
    /// CHECK: Checked in the SPL StakePool Program.
    pub manager_fee_account: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub sysvar_stake_history: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub sysvar_clock: UncheckedAccount<'info>,
    /// CHECK: Checked in the SPL StakePool Program.
    pub native_stake_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = spl_stake_pool::ID)]
    /// CHECK: The SPL StakePool ProgramID.
    pub spl_stake_pool_program: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[error_code]
pub enum SplBeamError {
    #[msg("No delegation for stake account deposit")]
    NotDelegated,
    #[msg("An error occurred during calculation")]
    CalculationFailure,
}