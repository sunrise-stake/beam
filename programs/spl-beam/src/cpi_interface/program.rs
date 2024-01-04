use anchor_lang::prelude::Pubkey;
use anchor_lang::solana_program::stake;
use anchor_lang::Id;

// SPoo1Ku8WFXoNDMHPsrGSTSG1Y47rzgn41SLUNakuHy
pub const SPL_STAKE_POOL_PROGRAM_ID: Pubkey = Pubkey::new_from_array([
    6, 129, 78, 212, 202, 246, 138, 23, 70, 114, 253, 172, 134, 3, 26, 99, 232, 78, 161, 94, 250,
    29, 68, 183, 34, 147, 246, 219, 219, 0, 22, 80,
]);

pub struct SplStakePool;

impl Id for SplStakePool {
    fn id() -> Pubkey {
        SPL_STAKE_POOL_PROGRAM_ID
    }
}

pub struct NativeStakeProgram;

impl Id for NativeStakeProgram {
    fn id() -> Pubkey {
        stake::program::ID
    }
}
