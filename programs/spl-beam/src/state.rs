use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The state account of the spl pool.
    pub stake_pool: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_state: Pubkey,

    /// The bump of the PDA that can authorize spending from the vault
    /// that holds pool tokens.
    pub vault_authority_bump: u8,

    /// The amount of the current gsol supply this beam is responsible for.
    /// This field is also tracked in the matching beam-details struct in the
    /// sunrise program's state and is expected to match that value.
    // TODO: Consider removing this and always use the value from the sunrise
    // state instead.
    pub partial_gsol_supply: u64,
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*spl_state*/
        32 + /*sunrise_state*/
        1 +  /*vault_authority_bump*/
        8; /*partial_gsol_supply*/
}

// Anchor-ts only supports deserialization(in instruction arguments) for types
// that explicitly derive AnchorSerialize & AnchorDeserialize.
// https://github.com/coral-xyz/anchor/issues/2545
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct StateEntry {
    pub update_authority: Pubkey,
    pub stake_pool: Pubkey,
    pub sunrise_state: Pubkey,
    pub vault_authority_bump: u8,
}

impl From<StateEntry> for State {
    fn from(se: StateEntry) -> Self {
        State {
            update_authority: se.update_authority,
            stake_pool: se.stake_pool,
            sunrise_state: se.sunrise_state,
            vault_authority_bump: se.vault_authority_bump,
            partial_gsol_supply: 0,
        }
    }
}
