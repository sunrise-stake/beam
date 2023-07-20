mod helpers;

use helpers::{program_test, utils, SunriseContext};
use solana_program_test::tokio;
use solana_sdk::signature::{Keypair, Signer};

#[tokio::test]
async fn register_success() {
    let state = Keypair::new();
    let update_authority = Keypair::new();
    let yield_account = Keypair::new();
    let gsol_mint = Keypair::new();
    let capacity = 5;

    let (gsol_mint_authority, bump) = SunriseContext::find_gsol_mint_authority_pda(&state.pubkey());

    let mut ctx = program_test().start_with_context().await;
    println!("a");
    let instructions =
        utils::create_token_mint(&mut ctx, &gsol_mint, &gsol_mint_authority, 8).unwrap();
    utils::send_and_confirm_tx(&mut ctx, instructions, Some(vec![&gsol_mint]))
        .await
        .unwrap();
    println!("b");

    let sunrise = SunriseContext::init(
        ctx,
        &state,
        &gsol_mint,
        &update_authority.pubkey(),
        &yield_account.pubkey(),
        capacity,
    )
    .await
    .unwrap();
    println!("c");

    let state = sunrise.fetch_decoded_state().await.unwrap();
    assert!(state.update_authority == update_authority.pubkey());
    assert!(state.pre_supply == 0);
    assert!(state.gsol_mint_authority_bump == bump);
}
