use super::instructions::*;
use anchor_lang::prelude::*;
use solana_program_test::{processor, BanksClientError, ProgramTest, ProgramTestContext};
use solana_sdk::{
    instruction::Instruction,
    pubkey::Pubkey,
    signature::{Keypair, Signer},
    transaction::Transaction,
};
use std::cell::RefCell;
use std::result::Result as StdResult;
use sunrise_beam::State as StateAccount;

fn program_test() -> ProgramTest {
    ProgramTest::new(
        "sunrise-beam",
        sunrise_beam::id(),
        processor!(sunrise_beam::entry),
    )
}

pub struct SunriseContext {
    pub ctx: RefCell<ProgramTestContext>,
    pub update_authority: Keypair,
    pub state: Pubkey,
    pub gsol_mint_authority: Option<(Pubkey, u8)>,
}

impl SunriseContext {
    pub async fn init(
        state: &Keypair,
        gsol_mint: &Keypair,
        update_authority: &Pubkey,
        yield_account: &Pubkey,
        initial_capacity: u8,
    ) -> StdResult<(), BanksClientError> {
        let ctx = program_test().start_with_context().await;
        let gsol_mint_authority = Self::find_gsol_mint_authority_pda(&state.pubkey());

        let (_, instruction) = register_state(
            &ctx.payer.pubkey(),
            &gsol_mint.pubkey(),
            update_authority,
            &state.pubkey(),
            yield_account,
            &gsol_mint_authority.0,
            initial_capacity,
        );

        let sunrise = SunriseContext {
            ctx: RefCell::new(ctx),
            state: Pubkey::default(),
            gsol_mint_authority: Some(gsol_mint_authority),
            update_authority: Keypair::new(),
        };

        sunrise
            .send_and_confirm_tx(vec![instruction], Some(vec![state, gsol_mint]))
            .await
    }

    pub fn set_update_authority(&mut self, auth: Keypair) {
        self.update_authority = auth;
    }

    pub async fn send_and_confirm_tx(
        &self,
        ix: Vec<Instruction>,
        signers: Option<Vec<&Keypair>>,
    ) -> StdResult<(), BanksClientError> {
        let tx = match signers {
            Some(signer_keypairs) => {
                let last_blockhash = self.ctx.borrow().last_blockhash;
                Transaction::new_signed_with_payer(
                    &ix,
                    Some(&self.ctx.borrow().payer.pubkey()),
                    &signer_keypairs,
                    last_blockhash,
                )
            }
            None => Transaction::new_with_payer(&ix, Some(&self.ctx.borrow().payer.pubkey())),
        };

        self.ctx
            .borrow_mut()
            .banks_client
            .process_transaction(tx)
            .await
    }

    pub async fn update_state(
        &self,
        new_update_authority: Option<&Pubkey>,
        new_yield_account: Option<&Pubkey>,
        new_gsol_mint: Option<&Pubkey>,
        new_gsol_mint_authority_bump: Option<u8>,
    ) -> StdResult<(), BanksClientError> {
        let (_, instruction) = update_state(
            &self.update_authority.pubkey(),
            &self.state,
            new_update_authority,
            new_yield_account,
            new_gsol_mint,
            new_gsol_mint_authority_bump,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    pub async fn register_beam(&self, new_beam: &Pubkey) -> StdResult<(), BanksClientError> {
        let (_, instruction) =
            register_beam(&self.update_authority.pubkey(), &self.state, new_beam);
        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    pub async fn resize_allocations(
        &self,
        additional_beams: u8,
    ) -> StdResult<(), BanksClientError> {
        let (_, instruction) = resize_allocations(
            &self.update_authority.pubkey(),
            &self.ctx.borrow().payer.pubkey(),
            &self.state,
            additional_beams,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    pub async fn update_allocations(
        &self,
        new_allocations: Vec<sunrise_beam::AllocationUpdate>,
    ) -> StdResult<(), BanksClientError> {
        let (_, instruction) = update_allocations(
            &self.update_authority.pubkey(),
            &self.state,
            new_allocations,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    pub async fn remove_beam(&self, beam: &Pubkey) -> StdResult<(), BanksClientError> {
        let (_, instruction) = remove_beam(&self.update_authority.pubkey(), &self.state, beam);

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    pub async fn export_mint_authority(
        &self,
        new_authority: &Pubkey,
    ) -> StdResult<(), BanksClientError> {
        let state_account = self
            .ctx
            .borrow_mut()
            .banks_client
            .get_account(self.state)
            .await?
            .unwrap();
        let state = StateAccount::try_deserialize(&mut state_account.data.as_ref()).unwrap();
        let (_, instruction) = export_mint_authority(
            &self.update_authority.pubkey(),
            &self.state,
            &state.gsol_mint,
            &self.gsol_mint_authority(),
            new_authority,
            &anchor_spl::token::ID,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    fn gsol_mint_authority(&self) -> Pubkey {
        self.gsol_mint_authority
            .map(|a| a.0)
            .unwrap_or(Self::find_gsol_mint_authority_pda(&self.state).0)
    }

    fn find_gsol_mint_authority_pda(state: &Pubkey) -> (Pubkey, u8) {
        let seeds = &[state.as_ref(), sunrise_beam::GSOL_AUTHORITY];
        Pubkey::find_program_address(seeds, &sunrise_beam::id())
    }
}
