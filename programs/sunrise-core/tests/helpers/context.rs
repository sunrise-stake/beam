use super::{instructions::*, Result, SunriseContextError};
use anchor_lang::prelude::*;
use solana_program_test::ProgramTestContext;
use solana_sdk::account::Account;
use solana_sdk::instruction::Instruction;
use solana_sdk::pubkey::Pubkey;
use solana_sdk::signature::{Keypair, Signer};
use std::cell::RefCell;
use sunrise_core::State as StateAccount;

pub struct SunriseContext {
    pub ctx: RefCell<ProgramTestContext>,
    pub update_authority: Keypair,
    pub state: Pubkey,
    pub gsol_mint_authority: Option<(Pubkey, u8)>,
    pub epoch_report: Option<(Pubkey, u8)>,
}

impl SunriseContext {
    pub async fn init(
        ctx: ProgramTestContext,
        state: &Keypair,
        gsol_mint: &Keypair,
        update_authority: &Pubkey,
        yield_account: &Pubkey,
        initial_capacity: u8,
    ) -> Result<Self> {
        let gsol_mint_authority = Self::find_gsol_mint_authority_pda(&state.pubkey());
        let epoch_report = Self::find_epoch_report_pda(&state.pubkey());

        let (_, instruction) = register_state(
            &ctx.payer.pubkey(),
            &gsol_mint.pubkey(),
            &epoch_report.0,
            update_authority,
            &state.pubkey(),
            yield_account,
            &gsol_mint_authority.0,
            initial_capacity,
        );

        let sunrise = SunriseContext {
            ctx: RefCell::new(ctx),
            state: state.pubkey(),
            gsol_mint_authority: Some(gsol_mint_authority),
            epoch_report: Some(epoch_report),
            update_authority: Keypair::new(),
        };

        sunrise
            .send_and_confirm_tx(vec![instruction], Some(vec![state]))
            .await?;

        Ok(sunrise)
    }

    #[allow(dead_code)]
    pub fn set_update_authority(&mut self, auth: Keypair) {
        self.update_authority = auth;
    }

    pub async fn send_and_confirm_tx(
        &self,
        ix: Vec<Instruction>,
        signers: Option<Vec<&Keypair>>,
    ) -> Result<()> {
        super::utils::send_and_confirm_tx(&mut self.ctx.borrow_mut(), ix, signers).await?;
        Ok(())
    }

    #[allow(dead_code)]
    pub async fn update_state(
        &self,
        new_update_authority: Option<&Pubkey>,
        new_yield_account: Option<&Pubkey>,
        new_gsol_mint: Option<&Pubkey>,
        new_gsol_mint_authority_bump: Option<u8>,
    ) -> Result<()> {
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

    #[allow(dead_code)]
    pub async fn register_beam(&self, new_beam: &Pubkey) -> Result<()> {
        let (_, instruction) =
            register_beam(&self.update_authority.pubkey(), &self.state, new_beam);
        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    #[allow(dead_code)]
    pub async fn resize_allocations(&self, additional_beams: u8) -> Result<()> {
        let (_, instruction) = resize_allocations(
            &self.update_authority.pubkey(),
            &self.ctx.borrow().payer.pubkey(),
            &self.state,
            additional_beams,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    #[allow(dead_code)]
    pub async fn update_allocations(
        &self,
        new_allocations: Vec<sunrise_core::AllocationUpdate>,
    ) -> Result<()> {
        let (_, instruction) = update_allocations(
            &self.update_authority.pubkey(),
            &self.state,
            new_allocations,
        );

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    #[allow(dead_code)]
    pub async fn remove_beam(&self, beam: &Pubkey) -> Result<()> {
        let (_, instruction) = remove_beam(&self.update_authority.pubkey(), &self.state, beam);

        self.send_and_confirm_tx(vec![instruction], Some(vec![&self.update_authority]))
            .await
    }

    #[allow(dead_code)]
    pub async fn export_mint_authority(&self, new_authority: &Pubkey) -> Result<()> {
        let state_account = self.get_account(&self.state).await?;
        let state = StateAccount::try_deserialize(&mut state_account.data.as_ref())?;
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

    pub async fn get_account(&self, address: &Pubkey) -> Result<Account> {
        let account = self
            .ctx
            .borrow_mut()
            .banks_client
            .get_account(*address)
            .await?
            .ok_or(SunriseContextError::AccountNotFound)?;

        Ok(account)
    }

    pub async fn fetch_decoded_state(&self) -> Result<StateAccount> {
        let account = &self.get_account(&self.state).await?;
        let decoded = StateAccount::try_deserialize(&mut account.data.as_ref())?;

        Ok(decoded)
    }

    #[allow(dead_code)]
    fn gsol_mint_authority(&self) -> Pubkey {
        self.gsol_mint_authority
            .map(|a| a.0)
            .unwrap_or(Self::find_gsol_mint_authority_pda(&self.state).0)
    }

    pub fn find_gsol_mint_authority_pda(state: &Pubkey) -> (Pubkey, u8) {
        let seeds = &[state.as_ref(), sunrise_core::seeds::GSOL_AUTHORITY];
        Pubkey::find_program_address(seeds, &sunrise_core::id())
    }

    #[allow(dead_code)]
    fn epoch_report(&self) -> Pubkey {
        self.epoch_report
            .map(|a| a.0)
            .unwrap_or(Self::find_epoch_report_pda(&self.state).0)
    }

    pub fn find_epoch_report_pda(state: &Pubkey) -> (Pubkey, u8) {
        let seeds = &[state.as_ref(), sunrise_core::seeds::EPOCH_REPORT];
        Pubkey::find_program_address(seeds, &sunrise_core::id())
    }
}
