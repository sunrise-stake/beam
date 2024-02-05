use anchor_lang::prelude::*;

/// Maps a Marinade ticket account to a GSOL token holder
#[account]
pub struct ProxyTicket {
    pub state: Pubkey,
    pub marinade_ticket_account: Pubkey,
    pub beneficiary: Pubkey,
}
impl ProxyTicket {
    pub const SPACE: usize = 32 + 32 + 32 + 8 /* DISCRIMINATOR */;
}
