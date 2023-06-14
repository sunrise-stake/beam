use std::ops::Deref;
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, TokenAccount};
use marinade_cpi::State as MarinadeState;

mod state;
mod utils;
mod cpi_interface;

use state::State;
use cpi_interface::sunrise as sunrise_interface;
use cpi_interface::marinade_lp as marinade_lp_interface;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

mod constants {
    /// Seed of the PDA that can authorize spending from the vault that holds pool tokens.
    pub const VAULT_AUTHORITY: &[u8] = b"vault-authority";
    /// Seed of this program's state address.
    pub const STATE: &[u8] = b"sunrise-marinade-lp";
}

#[program]
pub mod marinade_lp_beam {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, input: State) -> Result<()> {
        ctx.accounts.state.set_inner(input);
        Ok(())
    }

    pub fn add_liquidity(ctx: Context<AddLiquidity>, lamports: u64) -> Result<()> {
        // CPI: Add liquidity to Marinade liq_pool. The liq_pool tokens are minted into a 
        // vault controlled by a PDA of this program. 
        marinade_lp_interface::add_liquidity(ctx.accounts, lamports, None)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Mint GSOL of the same proportion as the lamports deposited to the depositor.
        sunrise_interface::mint_gsol(
            ctx.accounts.deref(),
            ctx.accounts.beam_program.to_account_info(),
            state_bump,
            lamports,
        )?;

        Ok(())
    }

    pub fn remove_liquidity(ctx: Context<RemoveLiquidity>, lamports: u64) -> Result<()> {
        // Calculate the number of liq_pool tokens `lamports` is worth.
        let liq_pool_tokens = utils::liq_pool_tokens_from_lamports(
            &ctx.accounts.marinade_state,
            &ctx.accounts.liq_pool_mint,
            &ctx.accounts.liq_pool_sol_leg_pda,
            lamports
        )?;
        // CPI: Remove liquidity from Marinade liq_pool. The liq_pool tokens vault owned by
        // this vault is the source burning lp tokens.
        marinade_lp_interface::remove_liquidity(ctx.accounts, liq_pool_tokens)?;

        let state_bump = *ctx.bumps.get("state").unwrap();
        // CPI: Burn GSOL of the same proportion as the lamports withdrawn from the depositor.
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
pub struct AddLiquidity<'info> {
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
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = liq_pool_mint,
        token::authority = liq_pool_vault_authority,
    )]
    pub liq_pool_token_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.liq_pool_vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub liq_pool_vault_authority: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(mut)]
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    pub liq_pool_msol_leg: Box<Account<'info, TokenAccount>>,
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Marinade program.
    pub system_program: UncheckedAccount<'info>,
    /// CHECK: Checked in the Marinade program.
    pub token_program: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
    /// CHECK: The Sunrise ProgramID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade ProgramID.
    pub marinade_program: UncheckedAccount<'info>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
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
    pub withdrawer: Signer<'info>,
    #[account(mut, token::mint = gsol_mint)]
    pub gsol_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub liq_pool_mint: Box<Account<'info, Mint>>,
    #[account(
        mut,
        token::mint = liq_pool_mint,
        token::authority = liq_pool_vault_authority,
    )]
    pub liq_pool_token_vault: Account<'info, TokenAccount>,
    #[account(
        seeds = [
            state.key().as_ref(),
            constants::VAULT_AUTHORITY
        ],
        bump = state.liq_pool_vault_authority_bump
    )]
    /// CHECK: The vault authority PDA with verified seeds.
    pub liq_pool_vault_authority: UncheckedAccount<'info>,

    #[account(mut, address = state.msol_token_account)]
    /// CHECK: TODO! 
    pub transfer_msol_to: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_sol_leg_pda: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_msol_leg: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: Checked in the Marinade program.
    pub liq_pool_msol_leg_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Marinade program.
    pub system_program: UncheckedAccount<'info>,
    /// CHECK: Checked in the Marinade program.
    pub token_program: UncheckedAccount<'info>,

    #[account(mut)]
    pub gsol_mint: Account<'info, Mint>,
    /// CHECK: Checked in the Sunrise beam program.
    pub gsol_mint_authority: UncheckedAccount<'info>,
    /// CHECK: Checked in the Sunrise beam program.
    pub instructions_sysvar: UncheckedAccount<'info>,

    #[account(address = sunrise_beam::ID)]
    /// CHECK: The Sunrise program ID.
    pub beam_program: UncheckedAccount<'info>,
    #[account(address = marinade_cpi::ID)]
    /// CHECK: The Marinade program ID.
    pub marinade_program: UncheckedAccount<'info>,
}


#[error_code]
pub enum MarinadeLpBeamError {
    #[msg("An error occurred during calculation")]
    CalculationFailure,
}