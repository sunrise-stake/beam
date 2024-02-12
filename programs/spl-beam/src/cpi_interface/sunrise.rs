use crate::seeds::*;
use anchor_lang::prelude::*;
use sunrise_core as sunrise_core_cpi;
use sunrise_core_cpi::cpi::{
    accounts::{BurnGsol, ExtractYield, MintGsol, UpdateEpochReport},
    burn_gsol as cpi_burn_gsol, extract_yield as cpi_extract_yield, mint_gsol as cpi_mint_gsol,
    update_epoch_report as cpi_update_epoch_report,
};

pub fn mint_gsol<'a>(
    accounts: impl Into<MintGsol<'a>>,
    cpi_program: AccountInfo<'a>,
    sunrise_key: Pubkey,
    stake_pool: Pubkey,
    state_bump: u8,
    lamports: u64,
) -> Result<()> {
    let accounts: MintGsol<'a> = accounts.into();
    let seeds = [
        STATE,
        sunrise_key.as_ref(),
        stake_pool.as_ref(),
        &[state_bump],
    ];
    let signer = &[&seeds[..]];

    cpi_mint_gsol(
        CpiContext::new(cpi_program, accounts).with_signer(signer),
        lamports,
    )
}

impl<'a> From<&crate::Deposit<'a>> for MintGsol<'a> {
    fn from(accounts: &crate::Deposit<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            gsol_mint_authority: accounts.gsol_mint_authority.to_account_info(),
            mint_gsol_to: accounts.mint_gsol_to.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}
impl<'a> From<&crate::DepositStake<'a>> for MintGsol<'a> {
    fn from(accounts: &crate::DepositStake<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            gsol_mint_authority: accounts.gsol_mint_authority.to_account_info(),
            mint_gsol_to: accounts.mint_gsol_to.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

pub fn burn_gsol<'a>(
    accounts: impl Into<BurnGsol<'a>>,
    cpi_program: AccountInfo<'a>,
    sunrise_key: Pubkey,
    stake_pool: Pubkey,
    state_bump: u8,
    lamports: u64,
) -> Result<()> {
    let accounts: BurnGsol<'a> = accounts.into();
    let seeds = [
        STATE,
        sunrise_key.as_ref(),
        stake_pool.as_ref(),
        &[state_bump],
    ];
    let signer = &[&seeds[..]];

    cpi_burn_gsol(
        CpiContext::new(cpi_program, accounts).with_signer(signer),
        lamports,
    )
}

impl<'a> From<&crate::Withdraw<'a>> for BurnGsol<'a> {
    fn from(accounts: &crate::Withdraw<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            burn_gsol_from_owner: accounts.withdrawer.to_account_info(),
            burn_gsol_from: accounts.gsol_token_account.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

impl<'a> From<&crate::WithdrawStake<'a>> for BurnGsol<'a> {
    fn from(accounts: &crate::WithdrawStake<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            burn_gsol_from_owner: accounts.withdrawer.to_account_info(),
            burn_gsol_from: accounts.gsol_token_account.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

impl<'a> From<&crate::Burn<'a>> for BurnGsol<'a> {
    fn from(accounts: &crate::Burn<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            burn_gsol_from_owner: accounts.burner.to_account_info(),
            burn_gsol_from: accounts.gsol_token_account.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

pub fn extract_yield<'a>(
    accounts: impl Into<ExtractYield<'a>>,
    cpi_program: AccountInfo<'a>,
    sunrise_key: Pubkey,
    stake_pool: Pubkey,
    state_bump: u8,
    lamports: u64,
) -> Result<()> {
    let accounts: ExtractYield<'a> = accounts.into();
    let seeds = [
        STATE,
        sunrise_key.as_ref(),
        stake_pool.as_ref(),
        &[state_bump],
    ];
    let signer = &[&seeds[..]];

    cpi_extract_yield(
        CpiContext::new(cpi_program, accounts).with_signer(signer),
        lamports,
    )
}

impl<'a> From<&crate::ExtractYield<'a>> for ExtractYield<'a> {
    fn from(accounts: &crate::ExtractYield<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            sysvar_clock: accounts.sysvar_clock.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
        }
    }
}

pub fn update_epoch_report<'a>(
    accounts: impl Into<UpdateEpochReport<'a>>,
    cpi_program: AccountInfo<'a>,
    sunrise_key: Pubkey,
    stake_pool: Pubkey,
    state_bump: u8,
    extractable_yield: u64,
) -> Result<()> {
    let accounts: UpdateEpochReport<'a> = accounts.into();
    let seeds = [
        STATE,
        sunrise_key.as_ref(),
        stake_pool.as_ref(),
        &[state_bump],
    ];
    let signer = &[&seeds[..]];

    cpi_update_epoch_report(
        CpiContext::new(cpi_program, accounts).with_signer(signer),
        extractable_yield,
    )
}

impl<'a> From<&crate::UpdateEpochReport<'a>> for UpdateEpochReport<'a> {
    fn from(accounts: &crate::UpdateEpochReport<'a>) -> Self {
        Self {
            state: accounts.sunrise_state.to_account_info(),
            beam: accounts.state.to_account_info(),
            gsol_mint: accounts.gsol_mint.to_account_info(),
            sysvar_instructions: accounts.sysvar_instructions.to_account_info(),
        }
    }
}
