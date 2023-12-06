/**
 * A suite of tests for the marinade-lp sunbeam. The marinade-lp sunbeam uses the marinade mSOL/SOL
 * liquidity pool to generate yield.
 */
import { SunriseClient } from "@sunrisestake/beams-core";
import { MarinadeLpClient } from "@sunrisestake/beams-marinade-lp";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import { provider, sunriseStateKeypair } from "../setup.js";
import {
  createTokenAccount,
  expectTokenBalance,
  fund,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import { expect } from "chai";
import {MSOL_MINT, SUNRISE_CORE_STATE} from "../consts.js";

describe("Marinade liquidity pool beam", () => {
  let sunriseClient: SunriseClient;
  let beamClient: MarinadeLpClient;

  const mlpState = MarinadeLpClient.deriveStateAddress(
    sunriseStateKeypair.publicKey,
  )[0];
  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {},
  );

  let vaultBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const withdrawalAmount = 5;

  before("Fund the staker", () => fund(provider, staker.publicKey, 30));

  it("can initialize a state", async () => {
    // create an MSol token account for the beam.
    // NOTE - when combined with the marinade-sp beam, this should be the msol token account
    // associated with the marinade stake pool.
    const msolTokenAccount = await createTokenAccount(
        provider,
        sunriseStateKeypair.publicKey,
        MSOL_MINT,
    );

    sunriseClient = await SunriseClient.get(
      provider,
      sunriseStateKeypair.publicKey,
    );

    const treasury = Keypair.generate();
    beamClient = await MarinadeLpClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
      msolTokenAccount,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.marinadeLp.marinade.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
    expect(info.vaultAuthorityBump).to.equal(
      beamClient.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBalance = await tokenAccountBalance(
      provider,
      beamClient.marinadeLp.beamVault,
    );
  });

  it("can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: beamClient.state.updateAuthority,
      sunriseState: beamClient.state.sunriseState,
      vaultAuthorityBump: beamClient.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      msolTokenAccount: beamClient.state.msolTokenAccount,
      marinadeState: beamClient.state.proxyState,
    };
    await sendAndConfirmTransaction(
      provider,
      await beamClient.update(provider.publicKey, updateParams),
      [],
    );

    beamClient = await beamClient.refresh();
    expect(beamClient.state.treasury.toBase58()).to.equal(
      newTreasury.publicKey.toBase58(),
    );
  });

  it("cannot deposit and mint gsol if the beam is not registered into sunrise core", async () => {
    beamClient = await MarinadeLpClient.get(
      stakerIdentity,
      beamClient.stateAddress,
    );
    const shouldFail = sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(10)),
      [],
      {},
      false,
    );
    await expect(shouldFail).to.be.rejectedWithAnchorError(
      beamClient.sunrise.program.idl,
      6006,
      beamClient.sunrise.program.programId,
    );
  });

  it("can deposit and mint gsol", async () => {
    // register the beam on sunrise
    const coreClient = await SunriseClient.get(provider, SUNRISE_CORE_STATE);
    await sendAndConfirmTransaction(
      provider,
      await coreClient.registerBeam(beamClient.stateAddress),
    );

    beamClient = await MarinadeLpClient.get(
      stakerIdentity,
      beamClient.stateAddress,
    );
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(10)),
      [],
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedLpTokens = vaultBalance.addn(
      Math.floor(depositAmount / (await beamClient.poolTokenPrice())),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinadeLp.beamVault,
      expectedLpTokens,
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedLpTokens;
  });

  it("can't deposit due to exceeding allocation", async () => {
    const shouldFail = sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(failedDepositAmount)),
      [],
      {},
      false,
    );

    await expect(shouldFail).to.be.rejectedWithAnchorError(
      beamClient.sunrise.program.idl,
      6001,
      beamClient.sunrise.program.programId,
    );
  });

  it("can withdraw and burn gsol", async () => {
    // withdraw from the pool
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(new BN(withdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.subn(withdrawalAmount);
    const expectedBsol = vaultBalance.subn(
      Math.floor(withdrawalAmount / (await beamClient.poolTokenPrice())),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinadeLp.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedBsol;
  });
});
