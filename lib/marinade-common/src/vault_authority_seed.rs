use anchor_lang::prelude::{Account, Key};
use anchor_lang::{AccountDeserialize, AccountSerialize};

// NOTE: this must match the constant used by the programs themselves
const VAULT_AUTHORITY: &[u8] = b"vault-authority";

pub struct VaultAuthoritySeed<'a> {
    state_address: Vec<u8>,
    vault_authority: &'a [u8],
    bump: Vec<u8>,
}

pub trait HasVaultAuthority: AccountSerialize + AccountDeserialize + Clone {
    fn vault_authority_bump(&self) -> u8;
}

impl<'a> VaultAuthoritySeed<'a> {
    pub fn new<'info>(state: &'a Account<'info, impl HasVaultAuthority>) -> Self {
        let state_address = state.key().to_bytes().to_vec();
        let vault_authority = VAULT_AUTHORITY;
        let bump = vec![state.vault_authority_bump()];

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
