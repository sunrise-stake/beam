use crate::seeds::VAULT_AUTHORITY;
use crate::state::State;
use crate::ExtractYield;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::clock::Epoch;
use anchor_lang::solana_program::program::invoke_signed;
use anchor_lang::solana_program::stake::program::ID;
use anchor_lang::Key;
use anchor_spl::token::spl_token::solana_program;
use borsh::BorshDeserialize;
use spl_stake_pool::solana_program::stake::state::StakeStateV2;
use std::ops::Deref;

/// A redefined StakeAccount that wraps spl StakeStateV2
/// This is needed until anchor-spl updates to solana-program 1.17
#[derive(Clone)]
pub struct StakeAccount(StakeStateV2);

impl AccountDeserialize for StakeAccount {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        Self::try_deserialize_unchecked(buf)
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        StakeStateV2::deserialize(buf).map(Self).map_err(Into::into)
    }
}

impl AccountSerialize for StakeAccount {}

impl Owner for StakeAccount {
    fn owner() -> Pubkey {
        ID
    }
}

impl Deref for StakeAccount {
    type Target = StakeStateV2;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

impl StakeAccount {
    pub fn can_be_withdrawn(&self, current_epoch: &Epoch) -> bool {
        match self.0 {
            StakeStateV2::Stake(_, stake, _) => {
                stake.delegation.deactivation_epoch <= *current_epoch
            }
            StakeStateV2::Initialized(_) => true,
            _ => false,
        }
    }
}

pub struct ClaimStakeAccount<'info> {
    pub state: Box<Account<'info, State>>,
    pub stake_account: Account<'info, StakeAccount>,
    pub withdrawer: AccountInfo<'info>,
    pub to: AccountInfo<'info>,
    pub native_stake_program: AccountInfo<'info>,
    pub sysvar_clock: AccountInfo<'info>,
    pub sysvar_stake_history: AccountInfo<'info>,
}
impl<'a> From<ExtractYield<'a>> for ClaimStakeAccount<'a> {
    /// Convert the ExtractYield beam instruction accounts to the ClaimStakeAccount accounts
    fn from(extract_yield: ExtractYield<'a>) -> Self {
        Self {
            state: extract_yield.state,
            stake_account: extract_yield.new_stake_account,
            withdrawer: extract_yield.vault_authority.to_account_info(),
            to: extract_yield.yield_account.to_account_info(),
            native_stake_program: extract_yield.native_stake_program.to_account_info(),
            sysvar_clock: extract_yield.sysvar_clock.to_account_info(),
            sysvar_stake_history: extract_yield.sysvar_stake_history.to_account_info(),
        }
    }
}
impl<'a> From<&ExtractYield<'a>> for ClaimStakeAccount<'a> {
    fn from(extract_yield: &ExtractYield<'a>) -> Self {
        extract_yield.to_owned().into()
    }
}

pub fn claim_stake_account(accounts: &ClaimStakeAccount, lamports: u64) -> Result<()> {
    let bump = &[accounts.state.vault_authority_bump][..];
    let state_address = accounts.state.key();
    let seeds = &[state_address.as_ref(), VAULT_AUTHORITY, bump][..];

    invoke_signed(
        &solana_program::stake::instruction::withdraw(
            &accounts.stake_account.key(),
            accounts.withdrawer.key,
            accounts.to.key,
            lamports,
            None,
        ),
        &[
            accounts.stake_account.to_account_info(),
            accounts.to.clone(),
            accounts.sysvar_clock.clone(),
            accounts.sysvar_stake_history.clone(),
            accounts.withdrawer.clone(),
        ],
        &[seeds],
    )?;

    Ok(())
}
