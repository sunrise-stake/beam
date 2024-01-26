use crate::MarinadeBeamError;
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

#[account]
pub struct EpochReport {
    pub state: Pubkey,
    pub epoch: u64,
    pub tickets: u64,
    pub total_ordered_lamports: u64,
    pub extractable_yield: u64,
    pub extracted_yield: u64,
    pub bump: u8,
}

impl EpochReport {
    pub const SPACE: usize = 32 + 8 + 8 + 8 + 8 + 8 + 1 + 8 /* DISCRIMINATOR */ ;

    pub fn all_extractable_yield(&self) -> u64 {
        self.extractable_yield
            .checked_add(self.extracted_yield)
            .unwrap()
    }

    pub fn add_ticket(&mut self, ticket_amount_lamports: u64, clock: &Sysvar<Clock>) -> Result<()> {
        require_eq!(
            self.epoch,
            clock.epoch,
            MarinadeBeamError::InvalidEpochReportAccount
        );
        self.tickets = self.tickets.checked_add(1).unwrap();
        self.total_ordered_lamports = self
            .total_ordered_lamports
            .checked_add(ticket_amount_lamports)
            .unwrap();
        Ok(())
    }

    pub fn add_extracted_yield(&mut self, extracted_yield: u64) {
        self.extracted_yield = self.extracted_yield.checked_add(extracted_yield).unwrap();
    }

    pub fn update_report(&mut self, extractable_yield: u64, add_extracted_yield: u64) {
        self.extractable_yield = extractable_yield;
        self.add_extracted_yield(add_extracted_yield);
    }
}
