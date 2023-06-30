use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The marinade state account for this liquidity pool.
    pub marinade_state: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_state: Pubkey,

    /// The bump of the PDA that can authorize spending from the vault
    /// that holds pool tokens(both liq_pool and marinade stake pool).
    pub vault_authority_bump: u8,

    /// This state's SOL vault.
    pub treasury: Pubkey,

    /// The token-account that receives msol when withdrawing liquidity.
    pub msol_token_account: Pubkey,
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*marinade_state*/
        32 + /*sunrise_state*/
        1  + /*vault_authority_bump*/
        32 + /*treasury*/
        32; /*msol-token-account*/
}

// Anchor-ts only deserializes for instruction arguments types that explicitly derive
// AnchorSerialize & AnchorDeserialize.
#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct StateEntry {
    pub update_authority: Pubkey,
    pub marinade_state: Pubkey,
    pub sunrise_state: Pubkey,
    pub vault_authority_bump: u8,
    pub treasury: Pubkey,
    pub msol_token_account: Pubkey,
}

impl From<StateEntry> for State {
    fn from(se: StateEntry) -> Self {
        State {
            update_authority: se.update_authority,
            marinade_state: se.marinade_state,
            sunrise_state: se.sunrise_state,
            vault_authority_bump: se.vault_authority_bump,
            treasury: se.treasury,
            msol_token_account: se.msol_token_account,
        }
    }
}