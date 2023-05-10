use crate::BeamProgramError;
use anchor_lang::prelude::*;

/// The state for the main beam controller program. A single
/// instance can have multiple [BeamApprovalState] accounts.
#[account]
pub struct ControllerState {
    /// Update authority for the main program.
    pub update_authority: Pubkey,
    /// The Sunrise gsol mint
    pub gsol_mint: Pubkey,
    /// The Sunrise gsol mint authority bump
    pub gsol_mint_authority_bump: u8,
    /// The beam controller yield account.
    pub yield_account: Pubkey,
    /// Holds [Allocation] details for beams.
    pub allocations: Vec<Allocation>,
}

/// The allocation details for a beam.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct Allocation {
    /// Expected signer for mint and burn requests.
    pub beam: Pubkey,
    /// This beam's allocation expressed as a percentage.
    pub allocation: u8,
    /// A beam in drain accepts withdrawals but no deposits.
    pub draining_mode: bool,
}

impl Allocation {
    pub const SPACE: usize = 32 + 1 + 1;

    pub fn new(beam: Pubkey, allocation: u8) -> Self {
        Allocation {
            beam,
            allocation,
            draining_mode: false,
        }
    }
}

impl ControllerState {
    pub fn size(initial_capacity: usize) -> usize {
        8 + //discriminator
        32 + 32 + 1 + 32 + (4 + (Allocation::SPACE * initial_capacity))
    }

    pub fn register(
        &mut self,
        input: RegisterStateInput,
        gsol_mint_auth_bump: u8,
        gsol_mint: &Pubkey,
    ) {
        self.update_authority = input.update_authority;
        self.yield_account = input.yield_account;
        self.gsol_mint = *gsol_mint;
        self.gsol_mint_authority_bump = gsol_mint_auth_bump;
        self.allocations = vec![Allocation::default(); input.initial_capacity];
    }

    pub fn update(&mut self, input: UpdateStateInput) {
        if let Some(update_authority) = input.new_update_authority {
            self.update_authority = update_authority;
        }
        if let Some(gsol_mint) = input.new_gsol_mint {
            self.gsol_mint = gsol_mint;
        }
        if let Some(bump) = input.new_gsol_mint_authority_bump {
            self.gsol_mint_authority_bump = bump;
        }
        if let Some(yield_account) = input.new_yield_account {
            self.yield_account = yield_account;
        }
    }

    /// A return value of [None] indicates no space was found.
    pub fn push_allocation(&mut self, new_allocation: Allocation) -> Result<Option<()>> {
        if self.contains_beam(&new_allocation.beam) {
            return Err(BeamProgramError::DuplicateBeamEntry.into());
        }

        let maybe_found = self
            .allocations
            .iter_mut()
            .find(|x| x.beam == Pubkey::default());

        if let Some(allocation) = maybe_found {
            *allocation = new_allocation;

            return Ok(Some(()));
        }

        todo!("Modify allocations");

        Ok(None)
    }

    /// Returns the number of active beams.
    pub fn beam_count(&self) -> usize {
        self.allocations
            .iter()
            .filter(|x| x.beam != Pubkey::default())
            .count()
    }

    /// Returns [None] if the allocation is not present.
    pub fn remove_beam(&mut self, beam: &Pubkey) -> Option<()> {
        if !self.contains_beam(beam) {
            return None;
        }

        let found = self
            .allocations
            .iter_mut()
            .find(|x| x.beam == *beam)
            .unwrap();

        let _allocation = found.allocation;
        *found = Allocation::default();

        todo!("Draining mode logic and modify allocations");

        Some(())
    }

    pub fn contains_beam(&self, beam: &Pubkey) -> bool {
        self.allocations
            .iter()
            .any(|allocation| allocation.beam == *beam)
    }

    pub fn check_beam_validity(&self, beam: &AccountInfo, cpi_program_id: &Pubkey) -> Result<()> {
        if !self.contains_beam(beam.key) {
            return Err(BeamProgramError::BeamNotPresent.into());
        }
        if beam.owner != cpi_program_id {
            return Err(BeamProgramError::UnexpectedCallingProgram.into());
        }

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct RegisterBeamInput {
    /// The beam state address
    pub beam: Pubkey,
    /// The allocation
    pub allocation: u8,
}

impl From<RegisterBeamInput> for Allocation {
    fn from(rbi: RegisterBeamInput) -> Self {
        Allocation::new(rbi.beam, rbi.allocation)
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct RegisterStateInput {
    pub update_authority: Pubkey,
    pub initial_capacity: usize,
    pub yield_account: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateStateInput {
    pub new_update_authority: Option<Pubkey>,
    pub new_yield_account: Option<Pubkey>,
    pub new_gsol_mint: Option<Pubkey>,
    pub new_gsol_mint_authority_bump: Option<u8>,
}
