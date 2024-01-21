use crate::cpi_interface::stake_pool::StakePool;
use crate::state::State;
use anchor_lang::prelude::*;
use anchor_lang::solana_program::{
    borsh0_10::try_from_slice_unchecked, stake::state::StakeStateV2,
};
use anchor_spl::token::TokenAccount;
use sunrise_core::BeamError;

/// calculate amount*numerator/denominator
/// as value  = shares * share_price where share_price=total_value/total_shares
/// or shares = amount_value / share_price where share_price=total_value/total_shares
///     => shares = amount_value * 1/share_price where 1/share_price=total_shares/total_value
pub fn proportional(amount: u64, numerator: u64, denominator: u64) -> Result<u64> {
    if denominator == 0 {
        return Ok(amount);
    }
    u64::try_from((amount as u128) * (numerator as u128) / (denominator as u128))
        .map_err(|_| error!(crate::SplBeamError::CalculationFailure))
}

pub fn pool_tokens_from_lamports(stake_pool: &StakePool, lamports: u64) -> Result<u64> {
    let token_supply = stake_pool.pool_token_supply;
    let total_lamports = stake_pool.total_lamports;

    proportional(lamports, token_supply, total_lamports)
}

pub fn get_delegated_stake_amount(stake_account: &AccountInfo) -> Result<u64> {
    // Gets the active stake amount of the stake account. We need this to determine how much gSol to mint.
    let stake_state = try_from_slice_unchecked::<StakeStateV2>(&stake_account.data.borrow())?;

    match stake_state.delegation() {
        Some(delegation) => Ok(delegation.stake),
        None => Err(crate::SplBeamError::NotDelegated.into()),
    }
}

/// Calculates the amount of yield that can be extracted from this pool.
/// This is calculated as:
/// The value of the pool tokens minus the amount of SOL staked in the beam
pub fn calculate_extractable_yield(
    sunrise_state: &sunrise_core::State,
    beam_state: &Account<State>,
    stake_pool: &StakePool,
    pool_token_vault: &TokenAccount,
) -> Result<u64> {
    // Calculate the beam's ownership of the stake pool state
    let total_lamports = stake_pool.total_lamports; // the total number of lamports staked in the pool
    let token_supply = stake_pool.pool_token_supply; // the total number of pool tokens in existence
    let balance = pool_token_vault.amount; // how many pool tokens the beam owns
    let owned_pool_value = proportional(balance, total_lamports, token_supply)?; // the value in lamports of the pool tokens owned by the beam

    msg!(
        "owned_pool_value: {}, total_lamports: {}, token_supply: {}, balance: {}",
        owned_pool_value,
        total_lamports,
        token_supply,
        balance
    );

    // Calculate the amount of SOL staked in the beam
    let details = sunrise_state
        .get_beam_details(&beam_state.key())
        .ok_or(BeamError::UnidentifiedBeam)?;
    let staked_sol = details.partial_gsol_supply;

    msg!("staked_sol: {}", staked_sol);

    Ok(owned_pool_value.saturating_sub(staked_sol))
}

#[cfg(test)]
mod utils_tests {
    use super::*;
    use anchor_lang::__private::base64;
    use anchor_lang::solana_program::program_pack::Pack;
    use anchor_spl::token::spl_token;
    use anchor_spl::token::spl_token::state::AccountState;
    use rstest::rstest;
    use std::cell::RefCell;
    use std::rc::Rc;
    use sunrise_core::BeamDetails;

    static mut LAMPORTS_STORAGE: u64 = 0;

    fn clone_token_account_with_amount(
        token_account: &TokenAccount,
        new_amount: u64,
    ) -> Result<TokenAccount> {
        let new_spl_account = spl_token::state::Account {
            mint: token_account.mint,
            owner: token_account.owner,
            amount: new_amount,
            delegate: token_account.delegate,
            state: AccountState::Initialized,
            is_native: token_account.is_native,
            delegated_amount: token_account.delegated_amount,
            close_authority: token_account.close_authority,
        };

        let mut dst = [0u8; spl_token::state::Account::LEN];
        spl_token::state::Account::pack(new_spl_account, &mut dst).unwrap();
        TokenAccount::try_deserialize_unchecked(&mut &dst[..])
    }

    pub fn create_stake_pool() -> StakePool {
        // This is a stake pool account - see packages/tests/fixtures/spl/pool.json
        const BASE64_POOL_DATA: &str = "AQi2aQPmj/kyc1PszrLaqtyAYSpJobj5d6Ix+gjkmqjkCLZpA+aP+TJzU+zOstqq3IBhKkmhuPl3ojH6COSaqOR0TlK3ODVp7q8xpWvvF7+QNZz/+Qxc/JYj8YXrjzH2C/wIg0ukdM5I0b2+7xzv1QkIWnhD3KHOW51k82GiSUI9HwiQKTXm+75i8/+yT5wnONmvFKIUMPYZ6vcHRhqy8CAcCNLpcPk8ez1QGR5hGs2TqoClRrReyWXhiwWHFVaZyKy+io330TRBlc2b9EScxWN+/9wvGEkjPl5KMq8RBlm3bgbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCp1QsvlBIAAADIq5cMEgAAALoBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECcAAAAAAAD0AQAAAAAAAAAAABAnAAAAAAAACAAAAAAAAAAQJwAAAAAAAAoAAAAAAAAAAGQAECcAAAAAAAAIAAAAAAAAAGQAECcAAAAAAAADAAAAAAAAAADIq5cMEgAAANULL5QSAAAAAwAAAAAAAAEAAAAAAAAAARAnAAAAAAAAAwAAAAAAAAAJLUF3EAAAANWF8/IQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
        let bytes = &base64::decode(BASE64_POOL_DATA).unwrap();
        StakePool::try_deserialize(&mut &bytes[..]).unwrap()
    }

    pub fn create_sunrise_state() -> sunrise_core::State {
        const BASE64_SUNRISE_DATA: &str = "2JJrXmhLtrHJi086QhFaVlGIukKID4tkZHDOjVITr4RH7vx5aT2Xqc2hpwNXs05dP6XFw8EiAxG+oWnkP5J1x/Y3KJwMAngLAAAAAAAAAAD//XTkcY2+Bb9ZFikxQyz/hY58xeSkY6ATmfCxiGP0DyhBDwAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==";
        let bytes = &base64::decode(BASE64_SUNRISE_DATA).unwrap();
        sunrise_core::State::try_deserialize(&mut &bytes[..]).unwrap()
    }

    pub fn create_mock_account_info<'info, T: AccountSerialize + AccountDeserialize + Clone>(
        data: &'info T,
        owner: &'info Pubkey,
        key: &'info Pubkey,
    ) -> AccountInfo<'info> {
        // Serialize T into a byte vector
        let mut data_vec = Vec::new();
        data.try_serialize(&mut data_vec).unwrap();
        // let mut data_storage = Box::new(data_vec.clone());
        // Get a mutable reference to the data (with static lifetime so that it can be returned from this function)
        // (NOTE: Only do this in test code)
        let static_ref: &'static mut [u8] = Box::leak(data_vec.into_boxed_slice());

        // Create a reference counted, mutable, interior-mutable cell to the data to match the AccountInfo `data` property
        let data_ref = Rc::new(RefCell::new(static_ref));

        // Get a mutable reference to the lamports storage (with a fixed dummy value)
        let lamports = unsafe { Rc::new(RefCell::new(&mut LAMPORTS_STORAGE)) };

        // Create the AccountInfo
        AccountInfo {
            key: &key,
            is_signer: false,
            is_writable: false,
            lamports,
            data: data_ref,
            owner,
            executable: false,
            rent_epoch: 0,
        }
    }

    fn create_and_register_beam_state(
        sunrise_state: &mut sunrise_core::State,
        gsol_supply: u64,
    ) -> Result<(State, Pubkey)> {
        let beam_key = Pubkey::new_unique();

        // add the beam to the core state
        let beam_details = BeamDetails {
            key: beam_key,
            partial_gsol_supply: gsol_supply,
            ..Default::default()
        };
        sunrise_state
            .allocations
            .extend(std::iter::repeat(BeamDetails::default()).take(1));
        sunrise_state.add_beam(beam_details)?;

        let beam_state = State::default();

        Ok((beam_state, beam_key))
    }

    #[test]
    fn test_proportional() {
        assert_eq!(proportional(100, 1, 1).unwrap(), 100);
        assert_eq!(proportional(100, 1, 2).unwrap(), 50);
        assert_eq!(proportional(100, 2, 1).unwrap(), 200);
        assert_eq!(proportional(100, 2, 2).unwrap(), 100);
        assert_eq!(proportional(100, 0, 1).unwrap(), 0);
        assert_eq!(proportional(100, 1, 0).unwrap(), 100);
        assert_eq!(proportional(100, 0, 0).unwrap(), 100);
    }

    #[test]
    fn test_pool_tokens_from_lamports() {
        let stake_pool = create_stake_pool();
        assert_eq!(pool_tokens_from_lamports(&stake_pool, 100).unwrap(), 97);
        assert_eq!(pool_tokens_from_lamports(&stake_pool, 0).unwrap(), 0);
        assert_eq!(pool_tokens_from_lamports(&stake_pool, 1000).unwrap(), 971);
    }

    #[rstest]
    // total supply is 77520677832, total lamports is 79795522517,
    // so the value of one pool token is 79795522517 / 77520677832 = 1.029345
    // 0 lamports are in the beam, so there is no extractable yield
    #[case::all_zeroes(0, 0, 0)]
    // 48 pool tokens are worth 48 * 1.029345 = 49.4 lamports
    // 50 lamports are in the beam, so the extractable yield is 0.
    #[case::no_accrued_value(48, 50, 0)]
    // 60 pool tokens are worth 60 * 1.029345 = 61.7607 lamports
    // 50 lamports are in the beam, so the extractable yield is 61.7607 - 50 = 11.7607, rounded down to 11.
    #[case::accrued_value(60, 50, 11)]
    fn test_calculate_extractable_yield(
        #[case] pool_value: u64,
        #[case] issued_gsol: u64,
        #[case] expected_extractable_yield: u64,
    ) -> Result<()> {
        let mut sunrise_state = create_sunrise_state();
        let stake_pool = create_stake_pool();

        // create a beam and register it against the sunrise state with the given issued_gsol (the amount of sol staked in the beam)
        let (beam_state, beam_key) =
            create_and_register_beam_state(&mut sunrise_state, issued_gsol)?;
        let beam_state_account_info = create_mock_account_info(&beam_state, &crate::ID, &beam_key);
        let beam_state_account = Account::try_from(&beam_state_account_info)?;

        // create a token account for the stake pool token vault with the given pool_value (the amount of pool tokens owned by the beam)
        let pool_token_vault =
            clone_token_account_with_amount(&TokenAccount::default(), pool_value)?;

        let extractable_yield = calculate_extractable_yield(
            &sunrise_state,
            &beam_state_account,
            &stake_pool,
            &pool_token_vault,
        )
        .unwrap();
        assert_eq!(extractable_yield, expected_extractable_yield);

        Ok(())
    }
}
