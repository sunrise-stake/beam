use anchor_lang::prelude::*;
use marinade_common::vault_authority_seed::HasVaultAuthority;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The marinade state account.
    pub marinade_state: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_state: Pubkey,

    /// The bump of the PDA that can authorize spending from the vault
    /// that holds pool tokens (msol in this case).
    pub vault_authority_bump: u8,
}

impl HasVaultAuthority for State {
    fn vault_authority_bump(&self) -> u8 {
        self.vault_authority_bump
    }
}

// Anchor-ts only supports deserialization(in instruction arguments) for types
// that explicitly derive AnchorSerialize & AnchorDeserialize.
// https://github.com/coral-xyz/anchor/issues/2545
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct StateEntry {
    pub update_authority: Pubkey,
    pub marinade_state: Pubkey,
    pub sunrise_state: Pubkey,
    pub vault_authority_bump: u8,
}

impl From<StateEntry> for State {
    fn from(se: StateEntry) -> Self {
        State {
            update_authority: se.update_authority,
            marinade_state: se.marinade_state,
            sunrise_state: se.sunrise_state,
            vault_authority_bump: se.vault_authority_bump,
        }
    }
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*marinade_state*/
        32 + /*sunrise_state*/
        1; /*vault_authority_bump*/
}
