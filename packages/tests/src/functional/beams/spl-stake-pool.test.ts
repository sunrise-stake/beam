/**
 * A suite of tests for the spl stake pool sunbeam. The spl stake pool sunbeam uses the SPL stake pool
 * to generate yield.
 */
import { SplClient } from "@sunrisestake/beams-spl";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  expectTokenBalance,
  fund,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import { sunriseStateKeypair } from "../setup.js";
import { expect } from "chai";

describe("sunrise-spl", () => {
  let client: SplClient;
  const provider = AnchorProvider.env();

  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {},
  );

  let vaultBsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  /** The blaze stake devnet pool address.
   * Setup as a fixture in `fixtures/blaze/pool.json` */
  const stakePool: PublicKey = new PublicKey(
    "azFVdHtAJN8BX3sbGAYkXvtdjdrT5U6rj9rovvUFos9",
  );

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const withdrawalAmount = 10;

  it("can initialize a state", async () => {
    const treasury = Keypair.generate();
    client = await SplClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
      stakePool,
    );

    client = await client.refresh();
    const info = client.state.pretty();
    expect(info.proxyState).to.equal(client.spl.stakePoolAddress.toBase58());
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBsolBalance = await tokenAccountBalance(
      provider,
      client.spl.beamVault,
    );
  });

  it("can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.state.updateAuthority,
      sunriseState: client.state.sunriseState,
      vaultAuthorityBump: client.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      stakePool: client.spl.stakePoolAddress,
    };
    await sendAndConfirmTransaction(
      provider,
      await client.update(provider.publicKey, updateParams),
      [],
    );

    client = await client.refresh();
    expect(client.state.treasury.toBase58()).to.equal(
      newTreasury.publicKey.toBase58(),
    );
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await SplClient.get(client.stateAddress, stakerIdentity);

    console.log(await client.details());

    console.log("ABOUT TO DEPOSIT");
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10)),
      [],
    );
    console.log("DEPOSIT COMPLETE");

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedBsol = vaultBsolBalance.addn(
      Math.floor(depositAmount / (await client.poolTokenPrice())),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.spl.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
  });

  it("can't deposit due to exceeding allocation", async () => {
    const shouldFail = sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(failedDepositAmount)),
      [],
    );

    await expect(shouldFail).to.be.rejectedWithAnchorError(
      6001,
      client.sunrise.program.idl["errors"][1].name,
      client.sunrise.program.programId,
    );
  });

  it("can withdraw and burn gsol", async () => {
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.withdraw(new BN(withdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.subn(withdrawalAmount);
    const expectedBsol = vaultBsolBalance.subn(
      Math.floor(withdrawalAmount / (await client.poolTokenPrice())),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.spl.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
  });
});
