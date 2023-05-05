use anchor_lang::prelude::*;
use anchor_lang::solana_program::sysvar::instructions::get_instruction_relative;
use anchor_lang::solana_program::{program::invoke, system_instruction, sysvar::rent::Rent};

pub fn get_cpi_program_id(ix_sysvar: &AccountInfo) -> Result<Pubkey> {
    let relative_ix = get_instruction_relative(0, ix_sysvar)?;
    Ok(relative_ix.program_id)
}

// https://solanacookbook.com/references/programs.html#how-to-change-account-size
#[allow(dead_code)]
pub fn resize_account<'a>(
    target_account: &AccountInfo<'a>,
    funding_account: &AccountInfo<'a>,
    system_program: &AccountInfo<'a>,
    new_size: usize,
) -> Result<()> {
    let rent = Rent::get()?;
    let new_minimum_balance = rent.minimum_balance(new_size);

    let lamports_diff = new_minimum_balance.saturating_sub(target_account.lamports());
    invoke(
        &system_instruction::transfer(funding_account.key, target_account.key, lamports_diff),
        &[
            funding_account.clone(),
            target_account.clone(),
            system_program.clone(),
        ],
    )?;

    target_account.realloc(new_size, false)?;

    Ok(())
}
