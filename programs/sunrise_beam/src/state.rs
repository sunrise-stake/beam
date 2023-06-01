use crate::BeamError;
use anchor_lang::prelude::*;

/// The state for the Sunrise beam controller program.
#[account]
#[derive(Default)]
pub struct State {
    /// Update authority for this state.
    pub update_authority: Pubkey,

    /// The Sunrise gSol mint.
    pub gsol_mint: Pubkey,

    /// The gSol mint supply when this program started
    /// monitoring it.
    pub pre_supply: u64,

    /// Bump of the gSol mint authority PDA.
    pub gsol_mint_authority_bump: u8,

    /// The Sunrise yield account.
    pub yield_account: Pubkey,

    /// The factor to increase space by during a resize.
    pub alloc_window: u8,

    /// Holds [BeamDetails] for all supported beams.
    pub allocations: Vec<BeamDetails>,
}

/// Holds information about a registed beam.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct BeamDetails {
    /// Expected signer for mint and burn requests.
    pub key: Pubkey,

    /// This beam's allocation expressed as a percentage.
    pub allocation: u8,

    /// The total amount of gSol this beam has minted.
    pub minted: u64,

    /// A beam in drain accepts withdrawals but not deposits.
    pub draining_mode: bool,
}

impl BeamDetails {
    /// Space in bytes of a borsh-serialized [BeamDetails] struct.
    pub const SPACE: usize = 32 + // key
        1 +  // allocation
        8 +  // minted
        1; // draining_mode

    /// Create a new instance of Self.
    pub fn new(key: Pubkey, allocation: u8) -> Self {
        BeamDetails {
            key,
            allocation,
            minted: 0,
            draining_mode: false, // initially set draining_mode to false.
        }
    }
}

impl State {
    /// Calculate the borsh-serialized size of a state with
    /// `beam_count` number of beams.
    pub fn size(beam_count: usize) -> usize {
        8 + // discriminator 
            32 + // update_authority
            32 + // gsol_mint
            8 +  // pre_supply
            1 +  // gsol_mint_authority_bump
            32 + // yield_account
            1 +  // alloc_window
            4 + (BeamDetails::SPACE * beam_count) // allocations vec
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
        // Since the pre_supply is meant to be used during calculations, it requires
        // that it only be set after this program has the mint_authority so that total
        // accuracy is maintained in tracking allocations.
        self.pre_supply = gsol_mint_supply;
        self.gsol_mint_authority_bump = gsol_mint_auth_bump;
        self.alloc_window = input.alloc_window;

        // We fill up the vec because deserialization of an empty vec would result
        // in the active capacity being lost. i.e a vector with capacity 10 but length
        // 4 would be deserialized as having both length and capacity of 4.
        //
        // To prevent needing to store an extra field tracking the capacity or figuring
        // it out with calculations based on the size, we use the following strategy:
        //
        // * Completely fill up the vec so that the length also gives the capacity.
        // * Add a beam by finding and replacing a default BeamDetails struct.
        // * Remove a beam by replacing it with a default BeamDetails struct.
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

    /// Add a new [BeamDetails] to the state.
    ///
    /// Errors if a beam with that key is already present in the state.
    ///
    /// Returns [None] if the vec is filled. i.e no default to replace.
    /// Returns [Some(())] on success.
    pub fn add_beam(&mut self, new_beam: BeamDetails) -> Result<()> {
        if self.contains_beam(&new_beam.key) {
            return Err(BeamError::DuplicateBeamEntry.into());
        }

        // Find and replace a default.
        let found = self.get_mut_beam_details(&Pubkey::default());
        if let Some(beam) = found {
            *beam = new_beam;

            return Ok(());
        }

        Err(BeamError::NoSpaceInAllocations.into())
    }

    /// Get the number of beams in the state.
    pub fn beam_count(&self) -> usize {
        self.allocations
            .iter()
            .filter(|x| **x != BeamDetails::default())
            .count()
    }

    /// Get a shared reference to a [BeamDetails] given its key.
    pub fn get_beam_details(&self, key: &Pubkey) -> Option<&BeamDetails> {
        self.allocations.iter().find(|x| x.key == *key)
    }

    /// Get a mutable reference to a [BeamDetails] given its key.
    pub fn get_mut_beam_details(&mut self, key: &Pubkey) -> Option<&mut BeamDetails> {
        self.allocations.iter_mut().find(|x| x.key == *key)
    }

    /// Remove a beam from the state via its key.
    ///
    /// Returns [None] if the beam is not present.
    pub fn remove_beam(&mut self, beam: &Pubkey) -> Result<()> {
        let found = self.get_mut_beam_details(beam);

        if let Some(allocation) = found {
            *allocation = BeamDetails::default();
            Ok(())
        } else {
            Err(BeamError::UnidentifiedBeam.into())
        }
    }

    /// Check if the state contains a beam of this particular `key`.
    pub fn contains_beam(&self, key: &Pubkey) -> bool {
        self.get_beam_details(key).is_some()
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
/// Arguments for registering a new [State].
pub struct RegisterStateInput {
    pub update_authority: Pubkey,
    pub alloc_window: u8,
    pub yield_account: Pubkey,
    pub initial_capacity: usize,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
/// Arguments for updating [State] parameters.
pub struct UpdateStateInput {
    pub new_update_authority: Option<Pubkey>,
    pub new_alloc_window: Option<u8>,
    pub new_yield_account: Option<Pubkey>,
    pub new_gsol_mint: Option<Pubkey>,
    pub new_gsol_mint_authority_bump: Option<u8>,
}

#[derive(AnchorSerialize, AnchorDeserialize)]
/// Arguments for updating a beam's allocation.
pub struct AllocationUpdate {
    pub beam: Pubkey,
    pub new_allocation: u8,
}
