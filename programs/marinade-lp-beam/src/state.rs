use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The marinade state account for this liquidity pool.
    pub marinade_state: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_beam: Pubkey,

    /// The sunrise gsol mint.
    pub gsol_mint: Pubkey,

    /// The bump of the PDA that can authorize spending from the vault
    /// that holds the liquidity pool's tokens.
    pub liq_pool_vault_authority_bump: u8,

    /// The account that receives tokens
    pub msol_token_account: Pubkey,

    /// This state's SOL vault.
    pub treasury: Pubkey,
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*marinade_state*/
        32 + /*sunrise_beam*/
        32 + /*gsol_mint*/
        1  + /*liq_pool_vault_authority_bump*/
        32 + /*msol_token_account*/
        32; /*treasury*/
}
