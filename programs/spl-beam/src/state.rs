use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The state account of the spl pool.
    pub stake_pool: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_state: Pubkey,

    /// The sunrise gsol mint.
    pub gsol_mint: Pubkey,

    /// The bump of the PDA that can authorize spending from the vault
    /// that holds pool tokens.
    pub vault_authority_bump: u8,

    /// This state's SOL vault.
    pub treasury: Pubkey,
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*spl_state*/
        32 + /*sunrise_state*/
        32 + /*gsol_mint*/
        1 +  /*vault_authority_bump*/
        32; /*treasury*/
}
