use anchor_lang::prelude::*;
use marinade_cpi::{
    cpi::{
        accounts::{AddLiquidity as MarinadeAddLiquidity, RemoveLiquidity as MarinadeRemoveLiquidity},
        add_liquidity as marinade_add_liquidity, remove_liquidity as marinade_remove_liquidity
    }
};

pub fn add_liquidity(accounts: &crate::AddLiquidity, lamports: u64, signer: Option<&[&[&[u8]]]>) -> Result<()> {
    let cpi_program = accounts.marinade_program.to_account_info();
    let cpi_ctx = match signer {
        Some(signature) => CpiContext::new(cpi_program, accounts.into()).with_signer(signature),
        None => CpiContext::new(cpi_program, accounts.into())
    };
    marinade_add_liquidity(cpi_ctx, lamports)?;

    Ok(())
}

pub fn remove_liquidity(accounts: &crate::RemoveLiquidity, liq_pool_tokens_amount: u64) -> Result<()> {
    let bump = &[accounts.state.liq_pool_vault_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[state_address.as_ref(), crate::constants::VAULT_AUTHORITY, bump][..];

    let cpi_program = accounts.marinade_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, accounts.into());
    marinade_remove_liquidity(cpi_ctx.with_signer(&[seeds]), liq_pool_tokens_amount)?;
    
    Ok(())
} 

impl<'a> From<&crate::AddLiquidity<'a>> for MarinadeAddLiquidity<'a> {
    fn from(accounts: &crate::AddLiquidity<'a>) -> MarinadeAddLiquidity<'a> {
        Self {
            state: accounts.marinade_state.to_account_info(),
            lp_mint: accounts.liq_pool_mint.to_account_info(),
            lp_mint_authority: accounts.liq_pool_mint_authority.to_account_info(),
            liq_pool_msol_leg: accounts.liq_pool_msol_leg.to_account_info(),
            liq_pool_sol_leg_pda: accounts.liq_pool_sol_leg_pda.to_account_info(),
            transfer_from: accounts.depositor.to_account_info(),
            mint_to: accounts.liq_pool_token_vault.to_account_info(),
            system_program: accounts.system_program.to_account_info(),
            token_program: accounts.token_program.to_account_info()
        }
    }
}

impl<'a> From<&crate::RemoveLiquidity<'a>> for MarinadeRemoveLiquidity<'a> {
    fn from(accounts: &crate::RemoveLiquidity<'a>) -> MarinadeRemoveLiquidity<'a> {
        Self {
            state: accounts.marinade_state.to_account_info(),
            lp_mint: accounts.liq_pool_mint.to_account_info(),
            burn_from: accounts.liq_pool_token_vault.to_account_info(),
            burn_from_authority: accounts.liq_pool_vault_authority.to_account_info(),
            transfer_sol_to: accounts.withdrawer.to_account_info(),
            transfer_msol_to: accounts.transfer_msol_to.to_account_info(),
            liq_pool_sol_leg_pda: accounts.liq_pool_sol_leg_pda.to_account_info(),
            liq_pool_msol_leg: accounts.liq_pool_msol_leg.to_account_info(),
            liq_pool_msol_leg_authority: accounts.liq_pool_msol_leg_authority.to_account_info(),
            system_program: accounts.system_program.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}