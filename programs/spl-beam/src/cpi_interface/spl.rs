use anchor_lang::{
    prelude::*,
    solana_program::program::{invoke, invoke_signed},
};

pub fn deposit(accounts: &crate::Deposit, lamports: u64) -> Result<()> {
    invoke(
        &spl_stake_pool::instruction::deposit_sol(
            &spl_stake_pool::ID,
            accounts.stake_pool.key,
            accounts.stake_pool_withdraw_authority.key,
            accounts.reserve_stake_account.key,
            accounts.depositor.key,
            &accounts.pool_tokens_vault.key(),
            accounts.manager_fee_account.key,
            &accounts.pool_tokens_vault.key(),
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
            accounts.pool_tokens_vault.to_account_info(),
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
        &accounts.pool_tokens_vault.key(),
        accounts.manager_fee_account.key,
        &accounts.pool_tokens_vault.key(),
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
            accounts.pool_tokens_vault.to_account_info(),
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
    let seeds = &[
        state_address.as_ref(),
        crate::constants::VAULT_AUTHORITY,
        bump,
    ][..];

    invoke_signed(
        &spl_stake_pool::instruction::withdraw_sol(
            &spl_stake_pool::ID,
            accounts.stake_pool.key,
            accounts.stake_pool_withdraw_authority.key,
            &accounts.vault_authority.key(),
            &accounts.pool_tokens_vault.key(),
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
            accounts.pool_tokens_vault.to_account_info(),
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

pub fn withdraw_stake(accounts: &crate::WithdrawStake, lamports: u64) -> Result<()> {
    let bump = &[accounts.state.vault_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[
        state_address.as_ref(),
        crate::constants::VAULT_AUTHORITY,
        bump,
    ][..];

    let pool_tokens = crate::utils::pool_tokens_from_lamports(&accounts.stake_pool, lamports)?;

    invoke_signed(
        &spl_stake_pool::instruction::withdraw_stake(
            &spl_stake_pool::ID,
            accounts.stake_pool.key,
            accounts.validator_stake_list.key,
            accounts.stake_pool_withdraw_authority.key,
            accounts.stake_account_to_split.key,
            accounts.new_stake_account.key,
            accounts.withdrawer.key,
            &accounts.vault_authority.key(),
            &accounts.pool_tokens_vault.key(),
            accounts.manager_fee_account.key,
            &accounts.pool_mint.key(),
            accounts.token_program.key,
            pool_tokens,
        ),
        &[
            accounts.spl_stake_pool_program.to_account_info(),
            accounts.stake_pool.to_account_info(),
            accounts.validator_stake_list.to_account_info(),
            accounts.stake_pool_withdraw_authority.to_account_info(),
            accounts.stake_account_to_split.to_account_info(),
            accounts.new_stake_account.to_account_info(),
            accounts.withdrawer.to_account_info(),
            accounts.vault_authority.to_account_info(),
            accounts.pool_tokens_vault.to_account_info(),
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
