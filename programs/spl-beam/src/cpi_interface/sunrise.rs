use anchor_lang::prelude::*;
// TODO: Use actual CPI crate.
use sunrise_beam as sunrise_beam_cpi;
use sunrise_beam_cpi::cpi::{
    accounts::{BurnGsol, MintGsol},
    burn_gsol as cpi_burn_gsol, mint_gsol as cpi_mint_gsol,
};

pub fn mint_gsol<'a>(
    accounts: impl Into<MintGsol<'a>>,
    cpi_program: AccountInfo<'a>,
    state_bump: u8,
    lamports: u64,
) -> Result<()> {
    let accounts: MintGsol<'a> = accounts.into();
    let seeds = [crate::constants::STATE, &[state_bump]];
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
            instructions_sysvar: accounts.instructions_sysvar.to_account_info(),
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
            instructions_sysvar: accounts.instructions_sysvar.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

pub fn burn_gsol<'a>(
    accounts: impl Into<BurnGsol<'a>>,
    cpi_program: AccountInfo<'a>,
    state_bump: u8,
    lamports: u64,
) -> Result<()> {
    let accounts: BurnGsol<'a> = accounts.into();
    let seeds = [crate::constants::STATE, &[state_bump]];
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
            instructions_sysvar: accounts.instructions_sysvar.to_account_info(),
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
            instructions_sysvar: accounts.instructions_sysvar.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}
