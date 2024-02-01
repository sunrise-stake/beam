use crate::state::State;
use anchor_lang::prelude::Account;
use anchor_lang::Key;

pub struct VaultAuthoritySeed<'a> {
    state_address: Vec<u8>,
    vault_authority: &'a [u8],
    bump: Vec<u8>,
}

impl<'a> VaultAuthoritySeed<'a> {
    pub fn new<'info>(state: &'a Account<'info, State>) -> Self {
        let state_address = state.key().to_bytes().to_vec();
        let vault_authority = crate::constants::VAULT_AUTHORITY;
        let bump = vec![state.vault_authority_bump];

        VaultAuthoritySeed {
            state_address,
            vault_authority,
            bump,
        }
    }

    pub fn as_slices(&self) -> [&[u8]; 3] {
        [&self.state_address, self.vault_authority, &self.bump]
    }
}
