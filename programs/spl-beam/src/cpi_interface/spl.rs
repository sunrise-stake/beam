use crate::cpi_interface::stake_pool::StakePool;
use crate::seeds::*;
use crate::state::State;
use crate::{ExtractYield, WithdrawStake};
use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
};

pub fn deposit(accounts: &crate::Deposit, lamports: u64) -> Result<()> {
    invoke(
        &spl_stake_pool::instruction::deposit_sol(
            &spl_stake_pool::ID,
            &accounts.stake_pool.key(),
            accounts.stake_pool_withdraw_authority.key,
            accounts.reserve_stake_account.key,
            accounts.depositor.key,
            &accounts.pool_token_vault.key(),
            accounts.manager_fee_account.key,
            &accounts.pool_token_vault.key(),
            &accounts.pool_mint.key(),
            accounts.token_program.key,
            lamports,
        ),
        &[
            accounts.spl_stake_pool_program.to_account_info(),
            accounts.stake_pool.to_account_info(),
            accounts.stake_pool_withdraw_authority.to_account_info(),
            accounts.reserve_stake_account.to_account_info(),
            accounts.depositor.to_account_info(),
            accounts.manager_fee_account.to_account_info(),
            accounts.pool_token_vault.to_account_info(),
            accounts.pool_mint.to_account_info(),
            accounts.system_program.to_account_info(),
            accounts.token_program.to_account_info(),
        ],
    )?;

    Ok(())
}

pub fn deposit_stake(accounts: &crate::DepositStake) -> Result<()> {
    // Returns a vector of 3 instructions. The 3rd instruction is the main one but requires
    // that both the `staker` authority and `withdrawer` authority permissions of the stake account
    // have been assigned to the stake pool's withdraw authority. The first and second instructions
    // transfer these permissions.
    let deposit_stake_instructions = &spl_stake_pool::instruction::deposit_stake(
        &spl_stake_pool::ID,
        accounts.stake_pool.key,
        accounts.validator_list.key,
        accounts.stake_pool_withdraw_authority.key,
        accounts.stake_account.key,
        accounts.stake_owner.key,
        accounts.validator_stake_account.key,
        accounts.reserve_stake_account.key,
        &accounts.pool_token_vault.key(),
        accounts.manager_fee_account.key,
        &accounts.pool_token_vault.key(),
        &accounts.pool_mint.key(),
        accounts.token_program.key,
    );

    let authorize_staker_ix = &deposit_stake_instructions[0];
    let authorize_withdrawer_ix = &deposit_stake_instructions[1];

    let invoke_accounts = &[
        accounts.native_stake_program.to_account_info(),
        accounts.stake_account.to_account_info(),
        accounts.sysvar_clock.to_account_info(),
        accounts.stake_owner.to_account_info(),
    ];

    invoke(authorize_staker_ix, invoke_accounts)?;
    invoke(authorize_withdrawer_ix, invoke_accounts)?;

    invoke(
        &deposit_stake_instructions[2],
        &[
            accounts.spl_stake_pool_program.to_account_info(),
            accounts.stake_pool.to_account_info(),
            accounts.validator_list.to_account_info(),
            accounts.stake_pool_deposit_authority.to_account_info(),
            accounts.stake_pool_withdraw_authority.to_account_info(),
            accounts.stake_account.to_account_info(),
            accounts.validator_stake_account.to_account_info(),
            accounts.reserve_stake_account.to_account_info(),
            accounts.manager_fee_account.to_account_info(),
            accounts.pool_token_vault.to_account_info(),
            accounts.pool_mint.to_account_info(),
            accounts.sysvar_clock.to_account_info(),
            accounts.sysvar_stake_history.to_account_info(),
            accounts.token_program.to_account_info(),
            accounts.native_stake_program.to_account_info(),
        ],
    )?;
    Ok(())
}

pub fn withdraw(accounts: &crate::Withdraw, pool_token_lamports: u64) -> Result<()> {
    let bump = &[accounts.state.vault_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[state_address.as_ref(), VAULT_AUTHORITY, bump][..];

    invoke_signed(
        &spl_stake_pool::instruction::withdraw_sol(
            &spl_stake_pool::ID,
            &accounts.stake_pool.key(),
            accounts.stake_pool_withdraw_authority.key,
            &accounts.vault_authority.key(),
            &accounts.pool_token_vault.key(),
            accounts.reserve_stake_account.key,
            accounts.withdrawer.key,
            accounts.manager_fee_account.key,
            &accounts.pool_mint.key(),
            accounts.token_program.key,
            pool_token_lamports,
        ),
        &[
            accounts.spl_stake_pool_program.to_account_info(),
            accounts.stake_pool.to_account_info(),
            accounts.stake_pool_withdraw_authority.to_account_info(),
            accounts.vault_authority.to_account_info(),
            accounts.pool_token_vault.to_account_info(),
            accounts.reserve_stake_account.to_account_info(),
            accounts.withdrawer.to_account_info(),
            accounts.manager_fee_account.to_account_info(),
            accounts.pool_mint.to_account_info(),
            accounts.sysvar_clock.to_account_info(),
            accounts.sysvar_stake_history.to_account_info(),
            accounts.native_stake_program.to_account_info(),
            accounts.token_program.to_account_info(),
        ],
        &[seeds],
    )?;

    Ok(())
}

/// Accounts required by the WithdrawStake program in the Stake Pool program
pub struct ExtractStakeAccount<'info> {
    pub state: Box<Account<'info, State>>,
    pub sunrise_state: Box<Account<'info, sunrise_core::State>>,
    pub stake_pool_program: AccountInfo<'info>,
    pub stake_pool: Box<Account<'info, StakePool>>,
    pub validator_list_storage: AccountInfo<'info>,
    pub stake_pool_withdraw: AccountInfo<'info>,
    pub stake_to_split: AccountInfo<'info>,
    pub stake_to_receive: AccountInfo<'info>,
    pub user_stake_authority: AccountInfo<'info>,
    pub user_transfer_authority: AccountInfo<'info>,
    pub user_pool_token_account: AccountInfo<'info>,
    pub manager_fee_account: AccountInfo<'info>,
    pub pool_mint: AccountInfo<'info>,
    pub token_program: AccountInfo<'info>,
    pub native_stake_program: AccountInfo<'info>,
    pub sysvar_clock: AccountInfo<'info>,
}

impl<'a> From<ExtractYield<'a>> for ExtractStakeAccount<'a> {
    /// Convert the ExtractYield beam instruction accounts to the ExtractStakeAccount accounts
    fn from(extract_yield: ExtractYield<'a>) -> Self {
        Self {
            state: extract_yield.state,
            sunrise_state: extract_yield.sunrise_state,
            stake_pool_program: extract_yield.spl_stake_pool_program.to_account_info(),
            stake_pool: extract_yield.stake_pool,
            validator_list_storage: extract_yield.validator_stake_list.to_account_info(),
            stake_pool_withdraw: extract_yield
                .stake_pool_withdraw_authority
                .to_account_info(),
            stake_to_split: extract_yield.stake_account_to_split.to_account_info(),
            stake_to_receive: extract_yield.new_stake_account.to_account_info(),
            user_stake_authority: extract_yield.vault_authority.to_account_info(),
            user_transfer_authority: extract_yield.vault_authority.to_account_info(),
            user_pool_token_account: extract_yield.pool_token_vault.to_account_info(),
            manager_fee_account: extract_yield.manager_fee_account.to_account_info(),
            pool_mint: extract_yield.pool_mint.to_account_info(),
            token_program: extract_yield.token_program.to_account_info(),
            native_stake_program: extract_yield.native_stake_program.to_account_info(),
            sysvar_clock: extract_yield.sysvar_clock.to_account_info(),
        }
    }
}
impl<'a> From<&ExtractYield<'a>> for ExtractStakeAccount<'a> {
    fn from(extract_yield: &ExtractYield<'a>) -> Self {
        extract_yield.to_owned().into()
    }
}
impl<'a> From<WithdrawStake<'a>> for ExtractStakeAccount<'a> {
    /// Convert the WithdrawStake beam instruction accounts to the ExtractStakeAccount accounts
    fn from(withdraw_stake: WithdrawStake<'a>) -> Self {
        Self {
            state: withdraw_stake.state,
            sunrise_state: withdraw_stake.sunrise_state,
            stake_pool_program: withdraw_stake.spl_stake_pool_program.to_account_info(),
            stake_pool: withdraw_stake.stake_pool,
            validator_list_storage: withdraw_stake.validator_stake_list.to_account_info(),
            stake_pool_withdraw: withdraw_stake
                .stake_pool_withdraw_authority
                .to_account_info(),
            stake_to_split: withdraw_stake.stake_account_to_split.to_account_info(),
            stake_to_receive: withdraw_stake.new_stake_account.to_account_info(),
            user_stake_authority: withdraw_stake.vault_authority.to_account_info(),
            user_transfer_authority: withdraw_stake.vault_authority.to_account_info(),
            user_pool_token_account: withdraw_stake.pool_token_vault.to_account_info(),
            manager_fee_account: withdraw_stake.manager_fee_account.to_account_info(),
            pool_mint: withdraw_stake.pool_mint.to_account_info(),
            token_program: withdraw_stake.token_program.to_account_info(),
            native_stake_program: withdraw_stake.native_stake_program.to_account_info(),
            sysvar_clock: withdraw_stake.sysvar_clock.to_account_info(),
        }
    }
}
impl<'a> From<&WithdrawStake<'a>> for ExtractStakeAccount<'a> {
    fn from(withdraw_stake: &WithdrawStake<'a>) -> Self {
        withdraw_stake.to_owned().into()
    }
}

pub fn extract_stake(accounts: &ExtractStakeAccount, lamports: u64) -> Result<()> {
    let bump = &[accounts.state.vault_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[state_address.as_ref(), VAULT_AUTHORITY, bump][..];

    let pool = &accounts.stake_pool;
    let pool_tokens =
        crate::utils::pool_tokens_from_lamports(&pool.clone().into_inner(), lamports)?;

    invoke_signed(
        &spl_stake_pool::instruction::withdraw_stake(
            &spl_stake_pool::ID,
            &pool.key(),
            accounts.validator_list_storage.key,
            accounts.stake_pool_withdraw.key,
            accounts.stake_to_split.key,
            accounts.stake_to_receive.key,
            accounts.user_stake_authority.key,
            &accounts.user_transfer_authority.key(),
            &accounts.user_pool_token_account.key(),
            accounts.manager_fee_account.key,
            &accounts.pool_mint.key(),
            accounts.token_program.key,
            pool_tokens,
        ),
        &[
            accounts.stake_pool_program.clone(),
            accounts.stake_pool.to_account_info(),
            accounts.validator_list_storage.to_account_info(),
            accounts.stake_pool_withdraw.to_account_info(),
            accounts.stake_to_split.to_account_info(),
            accounts.stake_to_receive.to_account_info(),
            accounts.user_stake_authority.to_account_info(),
            accounts.user_stake_authority.to_account_info(),
            accounts.user_pool_token_account.to_account_info(),
            accounts.manager_fee_account.to_account_info(),
            accounts.pool_mint.to_account_info(),
            accounts.sysvar_clock.to_account_info(),
            accounts.token_program.to_account_info(),
            accounts.native_stake_program.to_account_info(),
        ],
        &[seeds],
    )?;

    Ok(())
}
