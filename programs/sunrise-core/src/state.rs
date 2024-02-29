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

    /// The Sunrise yield account.
    pub yield_account: Pubkey,

    /// Reserved space for adding future fields.
    pub reserved_space: [u32; 32], // 128 bytes - used u32;32 over u8;128 to take advantage of rust's built-in default trait implementation for 32-sized arrays

    /// Holds [BeamDetails] for all supported beams.
    pub allocations: Vec<BeamDetails>,

    pub epoch_report: EpochReport,
}

/// Holds information about a registered beam.
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
        32 + // yield_account
        128 + // reserved_space
        4; // allocations vec size
           // Does not include epoch_report min size (included in size() and size

    /// Calculate the borsh-serialized size of a state with `beam_count` number of beams.
    pub fn size(beam_count: usize) -> usize {
        Self::SIZE_WITH_ZERO_BEAMS +
            (BeamDetails::SIZE * beam_count) +// allocations vec
            EpochReport::size(beam_count) // epoch_reports
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
    ) -> Result<()> {
        self.update_authority = input.update_authority;
        self.yield_account = input.yield_account;
        self.gsol_mint = *gsol_mint;
        // Since the pre_supply is meant to be used during calculations, it requires
        // that it only be set after this program has the mint_authority so that total
        // accuracy is maintained in tracking allocations.
        self.pre_supply = gsol_mint_supply;
        self.gsol_mint_authority_bump = gsol_mint_auth_bump;

        // We fill up the vecs because deserialization of an empty vec would result
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

        let current_epoch = Clock::get()?.epoch;
        self.epoch_report = EpochReport::new(input.initial_capacity as usize, current_epoch);

        Ok(())
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

    pub fn find_beam_index(&self, key: &Pubkey) -> Option<usize> {
        self.allocations.iter().position(|x| x.key == *key)
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

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct EpochReport {
    pub current_gsol_supply: u64,

    /// Holds [BeamEpochDetails] for all supported beams.
    pub beam_epoch_details: Vec<BeamEpochDetails>,
}
impl EpochReport {
    pub const SIZE_WITH_ZERO_BEAMS: usize = 8 +  // current_gsol_supply
        4; // vec size

    pub fn new(beam_count: usize, current_epoch: u64) -> EpochReport {
        EpochReport {
            current_gsol_supply: 0,
            // see details in the State::register method
            beam_epoch_details: vec![BeamEpochDetails::new(current_epoch); beam_count],
        }
    }

    /// Calculate the borsh-serialized size of a state with `beam_count` number of beams.
    pub fn size(beam_count: usize) -> usize {
        Self::SIZE_WITH_ZERO_BEAMS + (BeamEpochDetails::SIZE * beam_count) // allocations vec
    }

    /// Calculate the size of a state account.
    pub fn size_inner(&self) -> usize {
        EpochReport::size(self.beam_epoch_details.len())
    }

    pub fn extractable_yield(&self) -> u64 {
        self.beam_epoch_details
            .iter()
            .map(|x| x.extractable_yield)
            .sum()
    }

    pub fn extracted_yield(&self) -> u64 {
        self.beam_epoch_details
            .iter()
            .map(|x| x.extracted_yield)
            .sum()
    }

    pub fn is_epoch_reported(&self, epoch: u64) -> bool {
        self.beam_epoch_details.iter().all(|x| x.epoch == epoch)
    }

    pub fn is_epoch_reported_for_beam_idx(&self, epoch: u64, beam_idx: usize) -> bool {
        self.beam_epoch_details[beam_idx].epoch == epoch
    }

    pub fn extract_yield_for_beam(
        &mut self,
        beam_idx: usize,
        yield_amount: u64,
        epoch: u64,
    ) -> Result<()> {
        let beam_details = &mut self.beam_epoch_details[beam_idx];

        // The epoch report must be already updated for this epoch and beam
        require!(
            beam_details.epoch == epoch,
            BeamError::EpochReportNotUpToDate
        );

        beam_details.extracted_yield = beam_details
            .extracted_yield
            .checked_add(yield_amount)
            .ok_or(BeamError::Overflow)
            .unwrap();

        // The extractable yield should be reduced (most likely to zero)
        beam_details.extractable_yield =
            beam_details.extractable_yield.saturating_sub(yield_amount);

        Ok(())
    }

    pub fn update_extractable_yield_and_epoch_for_beam(
        &mut self,
        beam_idx: usize,
        epoch: u64,
        extractable_yield: u64,
    ) {
        self.beam_epoch_details[beam_idx].epoch = epoch;
        self.beam_epoch_details[beam_idx].extractable_yield = extractable_yield;
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, Default, Eq, Hash, PartialEq)]
pub struct BeamEpochDetails {
    /// The most recent epoch that this beam has reported its extractable yield for
    pub epoch: u64,
    pub extractable_yield: u64,
    pub extracted_yield: u64,
}
impl BeamEpochDetails {
    pub const SIZE: usize = 8 + // epoch
        8 + // extractable_yield
        8; // extracted_yield

    pub fn new(epoch: u64) -> BeamEpochDetails {
        BeamEpochDetails {
            epoch,
            extractable_yield: 0,
            extracted_yield: 0,
        }
    }
}

#[cfg(test)]
mod internal_tests {
    use super::*;

    #[test]
    fn test_register_beam() {
        let mut state = State::default();
        let mut input = RegisterStateInput::default();
        input.initial_capacity = 10;

        state.register(input, 0, &Pubkey::default(), 1000);
        assert_eq!(state.allocations, vec![BeamDetails::default(); 10]);
    }
    #[test]
    fn test_contains_beam() {
        let mut state = State::default();

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
        state.register(input, 0, &Pubkey::new_unique(), 1000);

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

        assert_eq!(state.contains_beam(&beam_key), true);
        assert_eq!(state.beam_count(), 1);

        assert!(state
            .add_beam(BeamDetails::new(Pubkey::new_unique(), 20))
            .is_ok());
        assert_eq!(state.beam_count(), 2);

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
            assert_eq!(res.key, key);
            assert_eq!(res.allocation, 90);
        } else {
            panic!("")
        }

        if let Some(res) = state.get_mut_beam_details(&key) {
            assert_eq!(res.key, key);
            assert_eq!(res.allocation, 90);
        } else {
            panic!("")
        }
    }
    #[test]
    fn test_size_calculations() {
        let mut state = State::default();

        let initial_size = state.size_inner();
        assert_eq!(state.allocations.len(), 0);
        assert_eq!(initial_size, State::SIZE_WITH_ZERO_BEAMS);
        assert_eq!(initial_size, State::size(0));

        state.allocations = vec![BeamDetails::default(); 10];
        let size = state.size_inner();
        assert_eq!(size, State::size(10));
        assert_eq!(size, initial_size + (10 * BeamDetails::SIZE))
    }
}
