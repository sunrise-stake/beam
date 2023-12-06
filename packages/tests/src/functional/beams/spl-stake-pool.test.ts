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
import { SPL_STAKE_POOL, SUNRISE_CORE_STATE } from "../consts.js";
import { SunriseClient } from "@sunrisestake/beams-core";

describe("SPL stake pool beam", () => {
  let beamClient: SplClient;
  const provider = AnchorProvider.env();

  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {},
  );

  let vaultBsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  const stakePool: PublicKey = SPL_STAKE_POOL;

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const withdrawalAmount = 10;

  before("Fund the staker", () => fund(provider, staker.publicKey, 30));

  it("can initialize a state", async () => {
    const treasury = Keypair.generate();
    beamClient = await SplClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
      stakePool,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.spl.stakePoolAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
    expect(info.vaultAuthorityBump).to.equal(
      beamClient.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBsolBalance = await tokenAccountBalance(
      provider,
      beamClient.spl.beamVault,
    );
  });

  it("can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: beamClient.state.updateAuthority,
      sunriseState: beamClient.state.sunriseState,
      vaultAuthorityBump: beamClient.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      stakePool: beamClient.spl.stakePoolAddress,
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
    beamClient = await SplClient.get(beamClient.stateAddress, stakerIdentity);

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

    // try depositing again
    beamClient = await SplClient.get(beamClient.stateAddress, stakerIdentity);

    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(10)),
      [],
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedBsol = vaultBsolBalance.addn(
      Math.floor(depositAmount / (await beamClient.poolTokenPrice())),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.spl.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
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
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(new BN(withdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.subn(withdrawalAmount);
    const expectedBsol = vaultBsolBalance.subn(
      Math.floor(withdrawalAmount / (await beamClient.poolTokenPrice())),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.spl.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
  });
});
