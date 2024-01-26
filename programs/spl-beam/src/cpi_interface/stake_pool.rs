use crate::cpi_interface::program::SPL_STAKE_POOL_PROGRAM_ID;
use anchor_lang::prelude::borsh::BorshDeserialize;
use anchor_lang::prelude::Pubkey;
use anchor_lang::{AccountDeserialize, AccountSerialize};
use std::ops::Deref;

#[derive(Clone, Debug, Default, PartialEq)]
pub struct StakePool(spl_stake_pool::state::StakePool);

impl AccountDeserialize for StakePool {
    fn try_deserialize_unchecked(buf: &mut &[u8]) -> anchor_lang::Result<Self> {
        spl_stake_pool::state::StakePool::deserialize(buf)
            .map(StakePool)
            .map_err(Into::into)
    }
}

impl AccountSerialize for StakePool {}

impl anchor_lang::Owner for StakePool {
    fn owner() -> Pubkey {
        SPL_STAKE_POOL_PROGRAM_ID
    }
}

impl Deref for StakePool {
    type Target = spl_stake_pool::state::StakePool;

    fn deref(&self) -> &Self::Target {
        &self.0
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use anchor_lang::Owner;
    use anchor_lang::__private::base64;

    // This is a stake pool account - see packages/tests/fixtures/spl/pool.json
    const BASE64_POOL_DATA: &str = "AQi2aQPmj/kyc1PszrLaqtyAYSpJobj5d6Ix+gjkmqjkCLZpA+aP+TJzU+zOstqq3IBhKkmhuPl3ojH6COSaqOR0TlK3ODVp7q8xpWvvF7+QNZz/+Qxc/JYj8YXrjzH2C/wIg0ukdM5I0b2+7xzv1QkIWnhD3KHOW51k82GiSUI9HwiQKTXm+75i8/+yT5wnONmvFKIUMPYZ6vcHRhqy8CAcCNLpcPk8ez1QGR5hGs2TqoClRrReyWXhiwWHFVaZyKy+io330TRBlc2b9EScxWN+/9wvGEkjPl5KMq8RBlm3bgbd9uHXZaGT2cvhRs7reawctIXtX1s3kTqM9YV+/wCp1QsvlBIAAADIq5cMEgAAALoBAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAECcAAAAAAAD0AQAAAAAAAAAAABAnAAAAAAAACAAAAAAAAAAQJwAAAAAAAAoAAAAAAAAAAGQAECcAAAAAAAAIAAAAAAAAAGQAECcAAAAAAAADAAAAAAAAAADIq5cMEgAAANULL5QSAAAAAwAAAAAAAAEAAAAAAAAAARAnAAAAAAAAAwAAAAAAAAAJLUF3EAAAANWF8/IQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
    // bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1
    const EXPECTED_POOL_MINT: Pubkey = Pubkey::new_from_array([
        8, 210, 233, 112, 249, 60, 123, 61, 80, 25, 30, 97, 26, 205, 147, 170, 128, 165, 70, 180,
        94, 201, 101, 225, 139, 5, 135, 21, 86, 153, 200, 172,
    ]);

    #[test]
    fn test_deserialize_spl_stake_pool() {
        let bytes = &base64::decode(BASE64_POOL_DATA).unwrap();
        let stake_pool = StakePool::try_deserialize(&mut &bytes[..]).unwrap();
        assert_eq!(stake_pool.pool_mint, EXPECTED_POOL_MINT);
    }

    #[test]
    fn test_owner() {
        assert_eq!(StakePool::owner(), SPL_STAKE_POOL_PROGRAM_ID);
    }
}
