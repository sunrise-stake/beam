use crate::BeamError;
use anchor_lang::prelude::*;

/// The state for the Sunrise beam controller program.
#[account]
pub struct State {
    /// Update authority for this state.
    pub update_authority: Pubkey,
    /// The Sunrise Gsol mint.
    pub gsol_mint: Pubkey,
    /// The starting Gsol supply.
    pub pre_supply: u64,
    /// Bump of the gsol mint authority PDA.
    pub gsol_mint_authority_bump: u8,
    /// The Sunrise yield account.
    pub yield_account: Pubkey,
    /// The factor to increase space by during a resize.
    pub alloc_window: u8,
    /// Holds [BeamDetails] for all supported beams.
    pub allocations: Vec<BeamDetails>,
}

/// Holds information about a registed beam.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default, Eq, Hash, PartialEq)]
pub struct BeamDetails {
    /// Expected signer for mint and burn requests.
    pub beam: Pubkey,
    /// This beam's allocation expressed as a percentage.
    pub allocation: u8,
    /// The total amount of Gsol this beam has minted.
    pub minted: u64,
    /// A beam in drain accepts withdrawals but not deposits.
    pub draining_mode: bool,
}

impl BeamDetails {
    /// Space in bytes of a borsh-serialized [BeamDetails] struct.
    pub const SPACE: usize = 32 + 1 + 8 + 1;

    pub fn new(beam: Pubkey, allocation: u8) -> Self {
        BeamDetails {
            beam,
            allocation,
            minted: 0,
            draining_mode: false,
        }
    }
}

impl State {
    /// Calculate the space that would be allocated to hold a `beam_count`
    /// number of beams.
    pub fn size(beam_count: usize) -> usize {
        8 /*discriminator*/
        + 32 + 32 + 8 + 1 + 32 + 1 + (4 + (BeamDetails::SPACE * beam_count))
    }

    /// Register a new [State] with the given information.
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
        self.allocations = vec![BeamDetails::default(); input.initial_capacity];
    }

    /// Update the fields of a [State] object.
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
    pub fn push_allocation(&mut self, new_allocation: BeamDetails) -> Result<Option<()>> {
        if self.contains_beam(&new_allocation.beam) {
            return Err(BeamError::DuplicateBeamEntry.into());
        }

        let found = self.get_mut_beam_details(&Pubkey::default());
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
            .filter(|x| **x != BeamDetails::default())
            .count()
    }

    pub fn get_beam_details(&self, beam_key: &Pubkey) -> Option<&BeamDetails> {
        self.allocations.iter().find(|x| x.beam == *beam_key)
    }

    pub fn get_mut_beam_details(&mut self, beam_key: &Pubkey) -> Option<&mut BeamDetails> {
        self.allocations.iter_mut().find(|x| x.beam == *beam_key)
    }

    /// Returns [None] if the allocation is not present.
    pub fn remove_beam(&mut self, beam: &Pubkey) -> Option<()> {
        let found = self.get_mut_beam_details(beam);

        if let Some(allocation) = found {
            *allocation = BeamDetails::default();
            Some(())
        } else {
            None
        }
    }

    pub fn contains_beam(&self, beam: &Pubkey) -> bool {
        self.get_beam_details(beam).is_none()
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
