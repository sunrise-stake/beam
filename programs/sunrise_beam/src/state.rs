use crate::{utils::resize_account, BeamError};
use anchor_lang::prelude::*;

/// The state for the main beam controller program. A single
/// instance can have multiple [BeamApprovalState] accounts.
#[account]
pub struct ControllerState {
    /// Update authority for the main program.
    pub update_authority: Pubkey,
    /// The Sunrise gsol mint
    pub gsol_mint: Pubkey,
    /// The starting supply for the Gsol mint.
    pub pre_supply: u64,
    /// The Sunrise gsol mint authority bump
    pub gsol_mint_authority_bump: u8,
    /// The beam controller yield account.
    pub yield_account: Pubkey,
    /// The factor to increase by during a resize.
    pub alloc_window: u8,
    /// Holds [Allocation] details for beams.
    pub allocations: Vec<Allocation>,
}

/// The allocation details for a beam.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Eq, Hash, PartialEq)]
pub struct Allocation {
    /// Expected signer for mint and burn requests.
    pub beam: Pubkey,
    /// This beam's allocation expressed as a percentage.
    pub allocation: u8,
    /// The total amount of gsol minted by this beam.
    pub minted: u64,
    /// A beam in drain accepts withdrawals but no deposits.
    pub draining_mode: bool,
}

impl Allocation {
    pub const SPACE: usize = 32 + 1 + 8 + 1;

    pub fn new(beam: Pubkey, allocation: u8) -> Self {
        Allocation {
            beam,
            allocation,
            minted: 0,
            draining_mode: false,
        }
    }
}

impl ControllerState {
    pub fn size(allocations: usize) -> usize {
        8 + //discriminator
        32 + 32 + 8 + 1 + 32 + 1 + (4 + (Allocation::SPACE * allocations))
    }

    pub fn resize<'a>(
        &mut self,
        state_info: &AccountInfo<'a>,
        payer: &AccountInfo<'a>,
        system: &AccountInfo<'a>,
    ) -> Result<()> {
        if self.alloc_window == 0 {
            return Err(BeamError::WouldExceedBeamCapacity.into());
        }
        let new_length = self
            .allocations
            .len()
            .checked_add(self.alloc_window as usize)
            .unwrap();

        let size = ControllerState::size(new_length);
        resize_account(state_info, payer, system, size)?;

        self.allocations
            .extend(std::iter::repeat(Allocation::default()));
        Ok(())
    }

    pub fn register(
        &mut self,
        input: RegisterStateInput,
        gsol_mint_auth_bump: u8,
        gsol_mint: &Pubkey,
        gsol_mint_supply: u64,
    ) {
        self.update_authority = input.update_authority;
        self.yield_account = input.yield_account;
        self.gsol_mint = *gsol_mint;
        self.pre_supply = gsol_mint_supply;
        self.gsol_mint_authority_bump = gsol_mint_auth_bump;
        self.alloc_window = input.alloc_window;
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
        if let Some(window) = input.new_alloc_window {
            self.alloc_window = window;
        }
        if let Some(yield_account) = input.new_yield_account {
            self.yield_account = yield_account;
        }
    }

    /// A return value of [None] indicates no space was found.
    pub fn push_allocation(&mut self, new_allocation: Allocation) -> Result<Option<()>> {
        if self.contains_beam(&new_allocation.beam) {
            return Err(BeamError::DuplicateBeamEntry.into());
        }

        let found = self.get_mut_allocation(&Pubkey::default());
        if let Some(allocation) = found {
            *allocation = new_allocation;

            return Ok(Some(()));
        }

        Ok(None)
    }

    /// Returns the number of active beams.
    pub fn beam_count(&self) -> usize {
        self.allocations
            .iter()
            .filter(|x| **x != Allocation::default())
            .count()
    }

    pub fn get_allocation(&self, beam_key: &Pubkey) -> Option<&Allocation> {
        self.allocations.iter().find(|x| x.beam == *beam_key)
    }

    pub fn get_mut_allocation(&mut self, beam_key: &Pubkey) -> Option<&mut Allocation> {
        self.allocations.iter_mut().find(|x| x.beam == *beam_key)
    }

    /// Returns [None] if the allocation is not present.
    pub fn remove_beam(&mut self, beam: &Pubkey) -> Option<()> {
        let found = self.get_mut_allocation(beam);

        if let Some(allocation) = found {
            *allocation = Allocation::default();
            Some(())
        } else {
            None
        }
    }

    pub fn contains_beam(&self, beam: &Pubkey) -> bool {
        self.get_allocation(beam).is_none()
    }

    pub fn check_beam_validity(&self, beam: &AccountInfo, cpi_program_id: &Pubkey) -> Result<()> {
        if !self.contains_beam(beam.key) {
            return Err(BeamError::UnidentifiedBeam.into());
        }
        if beam.owner != cpi_program_id {
            return Err(BeamError::UnidentifiedCallingProgram.into());
        }

        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct RegisterStateInput {
    pub update_authority: Pubkey,
    pub alloc_window: u8,
    pub yield_account: Pubkey,
    pub initial_capacity: usize,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
pub struct UpdateStateInput {
    pub new_update_authority: Option<Pubkey>,
    pub new_alloc_window: Option<u8>,
    pub new_yield_account: Option<Pubkey>,
    pub new_gsol_mint: Option<Pubkey>,
    pub new_gsol_mint_authority_bump: Option<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct AllocationUpdate {
    pub beam: Pubkey,
    pub new_allocation: u8,
}
