use crate::BeamError;
use anchor_lang::prelude::*;

/// The state for the Sunrise beam controller program.
#[account]
#[derive(Debug, Default)]
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

    /// Bump of the eppch report PDA.
    pub epoch_report_bump: u8,

    /// The Sunrise yield account.
    pub yield_account: Pubkey,

    /// Reserved space for adding future fields.
    pub reserved_space: [u32; 32], // 128 bytes - used u32;32 over u8;128 to take advantage of rust's built-in default trait implementation for 32-sized arrays

    /// Holds [BeamDetails] for all supported beams.
    pub allocations: Vec<BeamDetails>,
}

/// Holds information about a registed beam.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct BeamDetails {
    /// The beam's signer for mint and burn requests.
    pub key: Pubkey,

    /// This beam's allocation expressed as a percentage.
    pub allocation: u8,

    /// The total amount of circulating gsol this beam is responsible for.
    pub partial_gsol_supply: u64,

    /// A beam in drain accepts withdrawals but not deposits.
    pub draining_mode: bool,

    /// Reserved space for adding future fields.
    pub reserved_space: [u32; 32], // 128 bytes - used u32;32 over u8;128 to take advantage of rust's built-in default trait implementation for 32-sized arrays
}

impl BeamDetails {
    /// Size in bytes of a borsh-serialized [BeamDetails] struct.
    pub const SIZE: usize = 32 + // key
        1 +  // allocation
        8 +  // minted
        1 + // draining_mode
        128; // reserved_space

    /// Create a new instance of Self.
    pub fn new(key: Pubkey, allocation: u8) -> Self {
        BeamDetails {
            key,
            allocation,
            partial_gsol_supply: 0,
            draining_mode: false, // initially set draining_mode to false.
            reserved_space: Default::default(),
        }
    }
}

impl State {
    /// The size of a state account with an empty allocations vector.
    pub const SIZE_WITH_ZERO_BEAMS: usize = 8 + // discriminator 
        32 + // update_authority
        32 + // gsol_mint
        8 +  // pre_supply
        1 +  // gsol_mint_authority_bump
        1 +  // epoch_report_bump
        32 + // yield_account
        128 + // reserved_space
        4; // vec size

    /// Calculate the borsh-serialized size of a state with `beam_count` number of beams.
    pub fn size(beam_count: usize) -> usize {
        Self::SIZE_WITH_ZERO_BEAMS + (BeamDetails::SIZE * beam_count) // allocations vec
    }

    /// Calculate the size of a state account.
    pub fn size_inner(&self) -> usize {
        State::size(self.allocations.len())
    }

    /// Register a new [State] with the given information.
    pub fn register(
        &mut self,
        input: RegisterStateInput,
        gsol_mint_auth_bump: u8,
        gsol_mint: &Pubkey,
        gsol_mint_supply: u64,
        epoch_report_bump: u8,
    ) {
        self.update_authority = input.update_authority;
        self.yield_account = input.yield_account;
        self.gsol_mint = *gsol_mint;
        // Since the pre_supply is meant to be used during calculations, it requires
        // that it only be set after this program has the mint_authority so that total
        // accuracy is maintained in tracking allocations.
        self.pre_supply = gsol_mint_supply;
        self.gsol_mint_authority_bump = gsol_mint_auth_bump;

        // The epoch report bump is used to derive the PDA of this state's epoch report account.
        // Storing it here reduces the cost of subsequent update operations.
        self.epoch_report_bump = epoch_report_bump;

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
        self.allocations = vec![BeamDetails::default(); input.initial_capacity as usize];
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
        if let Some(yield_account) = input.new_yield_account {
            self.yield_account = yield_account;
        }
    }

    /// Add a new [BeamDetails] to the state.
    ///
    /// Errors if any of the following conditions is true:
    /// * The state already contains a [BeamDetails] of that key.
    /// * The state no longer has any space for allocations.
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
    /// Errors if:
    /// * The beam is not present in the state's allocations vector.
    /// * The beam is present but its allocation is not zero.
    pub fn remove_beam(&mut self, beam: &Pubkey) -> Result<()> {
        let found = self.get_mut_beam_details(beam);

        if let Some(allocation) = found {
            if allocation.allocation != 0 {
                Err(BeamError::NonZeroAllocation.into())
            } else {
                *allocation = BeamDetails::default();
                Ok(())
            }
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
    pub yield_account: Pubkey,
    pub initial_capacity: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Default)]
/// Arguments for updating [State] parameters.
pub struct UpdateStateInput {
    pub new_update_authority: Option<Pubkey>,
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

#[account]
pub struct EpochReport {
    pub epoch: u64,
    pub extractable_yield: u64,
    pub extracted_yield: u64,
    pub current_gsol_supply: u64,
    pub bump: u8,
}
impl EpochReport {
    pub const SIZE: usize = 8 + // discriminator
        8 + // epoch
        8 +  // extractable_yield
        8 +  // extracted_yield
        8 +  // current_gsol_supply
        1; // bump
}

#[cfg(test)]
mod internal_tests {
    use super::*;

    #[test]
    fn test_register_beam() {
        let mut state = State::default();
        let mut input = RegisterStateInput::default();
        input.initial_capacity = 10;

        state.register(input, 0, &Pubkey::default(), 1000, 0);
        assert_eq!(state.allocations, vec![BeamDetails::default(); 10]);
    }
    #[test]
    fn test_contains_beam() {
        let mut state = State::default();

        let beam_program_id = Pubkey::new_unique();

        let key1 = Pubkey::new_unique();
        let key2 = Pubkey::new_unique();
        state.allocations = vec![key1, key2]
            .iter()
            .map(|key| BeamDetails::new(*key, 20))
            .collect();

        assert!(state.contains_beam(&key1));
        assert!(state.contains_beam(&key2));
    }
    #[test]
    fn test_beam_count() {
        let mut state = State::default();

        let beam_program_id = Pubkey::new_unique();

        let key1 = Pubkey::new_unique();
        let key2 = Pubkey::new_unique();

        state.allocations = vec![
            BeamDetails::new(key1, 20),
            BeamDetails::default(),
            BeamDetails::new(key2, 10),
            BeamDetails::default(),
        ];

        assert_eq!(state.beam_count(), 2);
    }
    #[test]
    fn test_add_beam() {
        let mut state = State::default();
        let mut input = RegisterStateInput::default();

        input.initial_capacity = 2;
        state.register(input, 0, &Pubkey::new_unique(), 1000, 0);

        let beam_key = Pubkey::new_unique();
        let new_beam = BeamDetails::new(beam_key, 10);

        assert!(state.add_beam(new_beam.clone()).is_ok());
        // Should fail because duplicate entry
        let expect_to_fail = state.add_beam(new_beam.clone());
        assert_eq!(
            format!("{:?}", expect_to_fail),
            format!(
                "{:?}",
                Err::<(), anchor_lang::error::Error>(BeamError::DuplicateBeamEntry.into())
            )
        );

        assert!(state.contains_beam(&beam_key) == true);
        assert!(state.beam_count() == 1);

        assert!(state
            .add_beam(BeamDetails::new(Pubkey::new_unique(), 20))
            .is_ok());
        assert!(state.beam_count() == 2);

        // Should fail because no space
        let expect_to_fail2 = state.add_beam(BeamDetails::new(Pubkey::new_unique(), 20));
        assert_eq!(
            format!("{:?}", expect_to_fail2),
            format!(
                "{:?}",
                Err::<(), anchor_lang::error::Error>(BeamError::NoSpaceInAllocations.into())
            )
        );
    }
    #[test]
    fn test_remove_beam() {
        let mut state = State::default();
        let beam_program_id = Pubkey::new_unique();

        let keys = vec![
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        ];

        state.allocations = vec![
            BeamDetails::new(keys[0], 20),
            BeamDetails::new(keys[1], 50),
            BeamDetails::new(keys[2], 0),
        ];

        // Fails because allocation is non-zero.
        let expect_to_fail1 = state.remove_beam(&keys[0]);
        assert_eq!(
            format!("{:?}", expect_to_fail1),
            format!(
                "{:?}",
                Err::<(), anchor_lang::error::Error>(BeamError::NonZeroAllocation.into())
            )
        );
        assert!(state.remove_beam(&keys[1]).is_err());
        assert!(state.remove_beam(&keys[2]).is_ok());

        // Fails because key[2] has been removed and is no longer in allocations.
        let expect_to_fail2 = state.remove_beam(&keys[2]);
        assert_eq!(
            format!("{:?}", expect_to_fail2),
            format!(
                "{:?}",
                Err::<(), anchor_lang::error::Error>(BeamError::UnidentifiedBeam.into())
            )
        );
    }
    #[test]
    fn test_get_beam_details() {
        let mut state = State::default();
        let beam_program_id = Pubkey::new_unique();
        let key = Pubkey::new_unique();

        state.allocations = vec![
            BeamDetails::new(key, 90),
            BeamDetails::default(),
            BeamDetails::new(Pubkey::new_unique(), 10),
        ];

        assert!(matches!(state.get_beam_details(&key), Some(&ref _discard)));
        assert!(matches!(
            state.get_mut_beam_details(&key.clone()),
            Some(&mut ref _discard)
        ));

        if let Some(res) = state.get_beam_details(&key) {
            assert!(res.key == key);
            assert!(res.allocation == 90);
        } else {
            panic!("")
        }

        if let Some(res) = state.get_mut_beam_details(&key) {
            assert!(res.key == key);
            assert!(res.allocation == 90);
        } else {
            panic!("")
        }
    }
    #[test]
    fn test_size_calculations() {
        let mut state = State::default();

        let initial_size = state.size_inner();
        assert!(state.allocations.len() == 0);
        assert!(initial_size == State::SIZE_WITH_ZERO_BEAMS);
        assert!(initial_size == State::size(0));

        state.allocations = vec![BeamDetails::default(); 10];
        let size = state.size_inner();
        assert!(size == State::size(10));
        assert!(size == initial_size + (10 * BeamDetails::SIZE))
    }
}
