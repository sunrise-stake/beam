use anchor_lang::{InstructionData, ToAccountMetas};
use solana_sdk::{instruction::Instruction, pubkey::Pubkey, system_program, sysvar};
use sunrise_core::{accounts as sunrise_accounts, instruction as sunrise_instructions};

pub fn register_state(
    payer: &Pubkey,
    gsol_mint: &Pubkey,
    epoch_report: &Pubkey,
    update_authority: &Pubkey,
    state: &Pubkey,
    yield_account: &Pubkey,
    gsol_mint_auth_pda: &Pubkey,
    initial_capacity: u8,
) -> (sunrise_accounts::RegisterState, Instruction) {
    let accounts = sunrise_accounts::RegisterState {
        payer: *payer,
        state: *state,
        epoch_report: *epoch_report,
        gsol_mint: *gsol_mint,
        gsol_mint_authority: *gsol_mint_auth_pda,
        system_program: system_program::id(),
        rent: sysvar::rent::id(),
    };

    let data = sunrise_instructions::RegisterState {
        input: sunrise_core::RegisterStateInput {
            update_authority: *update_authority,
            yield_account: *yield_account,
            initial_capacity,
        },
    };

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        data: data.data(),
        accounts: accounts.to_account_metas(None),
    };

    (accounts, instruction)
}

pub fn update_state(
    update_authority: &Pubkey,
    state: &Pubkey,
    new_update_authority: Option<&Pubkey>,
    new_yield_account: Option<&Pubkey>,
    new_gsol_mint: Option<&Pubkey>,
    new_gsol_mint_authority_bump: Option<u8>,
) -> (sunrise_accounts::UpdateState, Instruction) {
    let accounts = sunrise_accounts::UpdateState {
        state: *state,
        update_authority: *update_authority,
    };

    let data = sunrise_instructions::UpdateState {
        input: sunrise_core::UpdateStateInput {
            new_update_authority: new_update_authority.map(|n| *n),
            new_yield_account: new_yield_account.map(|n| *n),
            new_gsol_mint: new_gsol_mint.map(|n| *n),
            new_gsol_mint_authority_bump,
        },
    };

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        data: data.data(),
        accounts: accounts.to_account_metas(None),
    };

    (accounts, instruction)
}

pub fn register_beam(
    update_authority: &Pubkey,
    state: &Pubkey,
    new_beam_state: &Pubkey,
) -> (sunrise_accounts::RegisterBeam, Instruction) {
    let accounts = sunrise_accounts::RegisterBeam {
        state: *state,
        update_authority: *update_authority,
        beam_account: *new_beam_state,
    };

    let data = sunrise_instructions::RegisterBeam {};

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        data: data.data(),
        accounts: accounts.to_account_metas(None),
    };

    (accounts, instruction)
}

pub fn resize_allocations(
    update_authority: &Pubkey,
    payer: &Pubkey,
    state: &Pubkey,
    additional_beams: u8,
) -> (sunrise_accounts::ResizeAllocations, Instruction) {
    let accounts = sunrise_accounts::ResizeAllocations {
        update_authority: *update_authority,
        payer: *payer,
        state: *state,
        system_program: system_program::id(),
    };
    let data = sunrise_instructions::ResizeAllocations { additional_beams };

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        accounts: accounts.to_account_metas(None),
        data: data.data(),
    };

    (accounts, instruction)
}

pub fn update_allocations(
    update_authority: &Pubkey,
    state: &Pubkey,
    new_allocations: Vec<sunrise_core::AllocationUpdate>,
) -> (sunrise_accounts::UpdateBeamAllocations, Instruction) {
    let accounts = sunrise_accounts::UpdateBeamAllocations {
        state: *state,
        update_authority: *update_authority,
    };
    let data = sunrise_instructions::UpdateAllocations { new_allocations };

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        accounts: accounts.to_account_metas(None),
        data: data.data(),
    };

    (accounts, instruction)
}

pub fn remove_beam(
    update_authority: &Pubkey,
    state: &Pubkey,
    beam_to_remove: &Pubkey,
) -> (sunrise_accounts::RemoveBeam, Instruction) {
    let accounts = sunrise_accounts::RemoveBeam {
        state: *state,
        update_authority: *update_authority,
    };
    let data = sunrise_instructions::RemoveBeam {
        beam: *beam_to_remove,
    };

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        accounts: accounts.to_account_metas(None),
        data: data.data(),
    };

    (accounts, instruction)
}

pub fn export_mint_authority(
    update_authority: &Pubkey,
    state: &Pubkey,
    gsol_mint: &Pubkey,
    gsol_mint_authority: &Pubkey,
    new_authority: &Pubkey,
    spl_token_program: &Pubkey,
) -> (sunrise_accounts::ExportMintAuthority, Instruction) {
    let accounts = sunrise_accounts::ExportMintAuthority {
        update_authority: *update_authority,
        state: *state,
        gsol_mint: *gsol_mint,
        gsol_mint_authority: *gsol_mint_authority,
        new_authority: *new_authority,
        token_program: *spl_token_program,
    };
    let data = sunrise_instructions::ExportMintAuthority {};

    let instruction = Instruction {
        program_id: sunrise_core::id(),
        accounts: accounts.to_account_metas(None),
        data: data.data(),
    };

    (accounts, instruction)
}
