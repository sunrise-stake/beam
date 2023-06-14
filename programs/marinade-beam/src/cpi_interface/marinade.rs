use anchor_lang::prelude::*;
use marinade_cpi::cpi::{
    accounts::{
        Claim as MarinadeClaim, Deposit as MarinadeDeposit,
        DepositStakeAccount as MarinadeDepositStakeAccount, OrderUnstake as MarinadeOrderUnstake,
    },
    claim as cpi_marinade_claim, deposit as cpi_deposit,
    deposit_stake_account as cpi_deposit_stake_account, order_unstake as cpi_order_unstake,
};

pub fn deposit(accounts: &crate::Deposit, lamports: u64) -> Result<()> {
    let cpi_program: AccountInfo<'_> = accounts.marinade_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, accounts.into());
    cpi_deposit(cpi_ctx, lamports)
}

pub fn deposit_stake_account(accounts: &crate::DepositStake, validator_index: u32) -> Result<()> {
    let cpi_program = accounts.marinade_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, accounts.into());
    cpi_deposit_stake_account(cpi_ctx, validator_index)
}

pub fn claim_unstake_ticket(accounts: &crate::ClaimUnstakeTicket) -> Result<()> {
    let cpi_program = accounts.marinade_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, accounts.into());
    cpi_marinade_claim(cpi_ctx)
}

pub fn order_unstake(accounts: &crate::OrderUnstake, msol_lamports: u64) -> Result<()> {
    let cpi_program = accounts.marinade_program.to_account_info();
    let cpi_accounts = MarinadeOrderUnstake {
        state: accounts.marinade_state.to_account_info(),
        msol_mint: accounts.msol_mint.to_account_info(),
        burn_msol_from: accounts.msol_vault.to_account_info(),
        burn_msol_authority: accounts.msol_vault_authority.to_account_info(),
        new_ticket_account: accounts.new_ticket_account.to_account_info(),
        token_program: accounts.token_program.to_account_info(),
        rent: accounts.rent.to_account_info(),
        clock: accounts.clock.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);

    let bump = &[accounts.state.msol_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[state_address.as_ref(), crate::constants::VAULT_AUTHORITY, bump][..];
    cpi_order_unstake(cpi_ctx.with_signer(&[seeds]), msol_lamports)
}

impl<'a> From<&crate::Deposit<'a>> for MarinadeDeposit<'a> {
    fn from(accounts: &crate::Deposit<'a>) -> Self {
        Self {
            state: accounts.marinade_state.to_account_info(),
            msol_mint: accounts.msol_mint.to_account_info(),
            liq_pool_sol_leg_pda: accounts.liq_pool_sol_leg_pda.to_account_info(),
            liq_pool_msol_leg: accounts.liq_pool_msol_leg.to_account_info(),
            liq_pool_msol_leg_authority: accounts.liq_pool_msol_leg_authority.to_account_info(),
            reserve_pda: accounts.reserve_pda.to_account_info(),
            transfer_from: accounts.depositor.to_account_info(),
            mint_to: accounts.msol_vault.to_account_info(),
            msol_mint_authority: accounts.msol_mint_authority.to_account_info(),
            system_program: accounts.system_program.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
        }
    }
}

impl<'a> From<&crate::DepositStake<'a>> for MarinadeDepositStakeAccount<'a> {
    fn from(accounts: &crate::DepositStake<'a>) -> Self {
        Self {
            state: accounts.marinade_state.to_account_info(),
            validator_list: accounts.validator_list.to_account_info(),
            stake_list: accounts.stake_list.to_account_info(),
            stake_account: accounts.stake_account.to_account_info(),
            stake_authority: accounts.stake_owner.to_account_info(),
            duplication_flag: accounts.duplication_flag.to_account_info(),
            rent_payer: accounts.stake_owner.to_account_info(),
            msol_mint: accounts.msol_mint.to_account_info(),
            mint_to: accounts.msol_vault.to_account_info(),
            msol_mint_authority: accounts.msol_mint_authority.to_account_info(),
            clock: accounts.clock.to_account_info(),
            rent: accounts.rent.to_account_info(),
            system_program: accounts.system_program.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
            stake_program: accounts.stake_program.to_account_info(),
        }
    }
}

impl<'a> From<&crate::OrderUnstake<'a>> for MarinadeOrderUnstake<'a> {
    fn from(accounts: &crate::OrderUnstake<'a>) -> Self {
        Self {
            state: accounts.marinade_state.to_account_info(),
            msol_mint: accounts.msol_mint.to_account_info(),
            burn_msol_from: accounts.msol_vault.to_account_info(),
            burn_msol_authority: accounts.msol_vault_authority.to_account_info(),
            new_ticket_account: accounts.new_ticket_account.to_account_info(),
            token_program: accounts.token_program.to_account_info(),
            rent: accounts.rent.to_account_info(),
            clock: accounts.clock.to_account_info(),
        }
    }
}

impl<'a> From<&crate::ClaimUnstakeTicket<'a>> for MarinadeClaim<'a> {
    fn from(accounts: &crate::ClaimUnstakeTicket<'a>) -> Self {
        Self {
            state: accounts.state.to_account_info(),
            reserve_pda: accounts.reserve_pda.to_account_info(),
            ticket_account: accounts.marinade_ticket_account.to_account_info(),
            transfer_sol_to: accounts.beneficiary.to_account_info(),
            clock: accounts.clock.to_account_info(),
            system_program: accounts.system_program.to_account_info(),
        }
    }
}

