mod context;
mod instructions;
pub mod utils;

pub use context::*;

use solana_program_test::{processor, BanksClientError, ProgramTest};
use solana_sdk::program_error::ProgramError;
use thiserror::Error;

type Result<T> = std::result::Result<T, SunriseContextError>;

pub fn program_test() -> ProgramTest {
    let mut program_test = ProgramTest::new(
        "sunrise-beam",
        sunrise_beam::id(),
        processor!(sunrise_beam::entry),
    );
    program_test.prefer_bpf(false);
    program_test
}

#[derive(Error, Debug)]
pub enum SunriseContextError {
    #[error(transparent)]
    Program(#[from] ProgramError),
    #[error(transparent)]
    Client(#[from] BanksClientError),
    #[error(transparent)]
    Lang(#[from] anchor_lang::error::Error),
    #[error("Tried to fetch a non-existent account")]
    AccountNotFound,
}
