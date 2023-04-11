use anchor_lang::prelude::*;

/// The state for the main beam controller program. A single
/// instance can have multiple [BeamApprovalState] accounts.
#[account]
pub struct State {
    /// Update authority for the main program.
    pub update_authority: Pubkey,
    /// The Sunrise gsol mint
    pub gsol_mint: Pubkey,
    /// The Sunrise gsol mint authority bump
    pub gsol_mint_authority_bump: u8,
    /// The number of previously-created beams.
    /// This is also used to generate the seeds
    /// for a new [BeamApprovalState] account.
    pub beams: u8,
}

impl State {
    pub const SPACE: usize = 32 + 32 + 1 + 1;

    pub fn register(&mut self, input: &StateInput, gsol_mint: &Pubkey) {
        self.set_values(input, Some(gsol_mint));
        self.beams = 0;
    }

    pub fn set_values(&mut self, input: &StateInput, gsol_mint: Option<&Pubkey>) {
        self.update_authority = input.update_authority;
        self.gsol_mint_authority_bump = input.gsol_mint_authority_bump;
        self.gsol_mint = *gsol_mint.unwrap_or(&self.gsol_mint);
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct StateInput {
    pub update_authority: Pubkey,
    pub gsol_mint_authority_bump: u8,
}

/// Represents a contract between the Sunrise main
/// program and a "Beam" program that's allowed to
/// mint gsol.
#[account]
pub struct BeamApprovalState {
    /// The beam program's ID, used in generating its PDA.
    pub id: u8,
    /// The sunrise state this beam belongs to.
    pub state: Pubkey,
    /// The beam's Program ID.
    pub program_id: Pubkey,
    /// The internal state of the beam program.
    pub beam_state: Pubkey,
    /// Total gsol minted by this beam.
    pub minted_gsol: u64,
    /// Minimum gsol allocation to the beam.
    pub min_allocation: u64,
    /// Maximum gsol allocation to the beam.
    pub max_allocation: u64,
    /// Expected signer for CPIs from the beam.
    pub beam_authority: Pubkey,
    /// Whether or not the beam is active.
    pub frozen: bool,
}

impl BeamApprovalState {
    pub const SPACE: usize = 1 + 32 + 32 + 8 + 8 + 8 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BeamInput {
    /// The address of the beam program.
    pub program_id: Pubkey,
    /// The minimum gsol allocation for this beam.
    pub min_allocation: u64,
    /// The maximum gsol allocation for this beam.
    pub max_allocation: u64,
    /// The expected signer for CPIs from the beam.
    pub beam_authority: Pubkey,
}
