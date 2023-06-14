use anchor_lang::prelude::*;

#[account]
pub struct State {
    /// The update authority of the state.
    pub update_authority: Pubkey,

    /// The marinade state account.
    pub marinade_state: Pubkey,

    /// The state of the main sunrise beam.
    pub sunrise_beam: Pubkey,

    /// The sunrise gsol mint.
    pub gsol_mint: Pubkey,

    /// The bump of the msol-authority PDA.
    pub msol_authority_bump: u8,

    /// This state's SOL vault.
    pub treasury: Pubkey,
}

impl State {
    pub const SPACE: usize = 8 +  /*discriminator*/
        32 + /*update_authority*/
        32 + /*marinade_state*/
        32 + /*sunrise_beam*/
        32 + /*gsol_mint*/
        1  + /*msol_authority_bump*/
        32; /*treasury*/
}

/// Maps a Marinade ticket account to a GSOL token holder
#[account]
pub struct ProxyTicketAccount {
    pub state_address: Pubkey,
    pub marinade_ticket_account: Pubkey,
    pub beneficiary: Pubkey,
}
impl ProxyTicketAccount {
    pub const SPACE: usize = 32 + 32 + 32 + 8 /* DISCRIMINATOR */;
}
