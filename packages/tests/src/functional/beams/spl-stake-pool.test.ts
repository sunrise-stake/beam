/**
 * A suite of tests for the spl stake pool sunbeam. The spl stake pool sunbeam uses the SPL stake pool
 * to generate yield.
 */
import { SplClient } from "@sunrisestake/beams-spl";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  expectSolBalance,
  expectTokenBalance,
  fund,
  registerSunriseState,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import { provider, staker, stakerIdentity } from "../setup.js";
import { expect } from "chai";
import { SPL_STAKE_POOL } from "../consts.js";
import { SunriseClient } from "@sunrisestake/beams-core";

describe("SPL stake pool beam", () => {
  let coreClient: SunriseClient;
  let beamClient: SplClient;
  let vaultStakePoolSolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);
  let sunriseStateAddress: PublicKey;
  let extractableYield: BN;

  const stakePool: PublicKey = SPL_STAKE_POOL;

  const depositAmount = 10 * LAMPORTS_PER_SOL;
  const failedDepositAmount = 5 * LAMPORTS_PER_SOL;
  const withdrawalAmount = 5 * LAMPORTS_PER_SOL;
  const burnAmount = new BN(1 * LAMPORTS_PER_SOL);

  before("Set up the sunrise state", async () => {
    coreClient = await registerSunriseState();
    sunriseStateAddress = coreClient.stateAddress;
  });

  before("Fund the staker", () => fund(provider, staker.publicKey, 100));

  it("can initialize a state", async () => {
    beamClient = await SplClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateAddress,
      stakePool,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.spl.stakePoolAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(sunriseStateAddress.toBase58());
    expect(info.vaultAuthorityBump).to.equal(
      beamClient.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultStakePoolSolBalance = await tokenAccountBalance(
      provider,
      beamClient.spl.beamVault,
    );
  });

  it("can update a state", async () => {
    const newUpdateAuthority = Keypair.generate();
    const updateParams = {
      updateAuthority: newUpdateAuthority.publicKey,
      sunriseState: beamClient.state.sunriseState,
      vaultAuthorityBump: beamClient.state.vaultAuthorityBump,
      stakePool: beamClient.spl.stakePoolAddress,
    };
    await sendAndConfirmTransaction(
      provider,
      await beamClient.update(provider.publicKey, updateParams),
      [],
    );

    beamClient = await beamClient.refresh();
    expect(beamClient.state.updateAuthority.toBase58()).to.equal(
      newUpdateAuthority.publicKey.toBase58(),
    );
  });

  it("cannot deposit and mint gsol if the beam is not registered into sunrise core", async () => {
    beamClient = await SplClient.get(stakerIdentity, beamClient.stateAddress);

    const shouldFail = sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(depositAmount)),
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
    coreClient = await coreClient.refresh();
    await sendAndConfirmTransaction(
      provider,
      await coreClient.registerBeam(beamClient.stateAddress),
    );

    // try depositing again
    beamClient = await beamClient.refresh();

    const depositAmountBN = new BN(depositAmount);

    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(depositAmountBN),
      [],
    );

    const expectedGsol = stakerGsolBalance.add(depositAmountBN);
    const depositAmountInStakePoolTokens = new BN(
      "" + Math.floor(depositAmount / (await beamClient.poolTokenPrice())),
    );
    const expectedStakePoolSol = vaultStakePoolSolBalance.add(
      depositAmountInStakePoolTokens,
    );

    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.spl.beamVault,
      expectedStakePoolSol,
    );
    stakerGsolBalance = expectedGsol;
    vaultStakePoolSolBalance = expectedStakePoolSol;
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
    const withdrawalAmountBN = new BN(withdrawalAmount);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(withdrawalAmountBN),
      [],
    );

    const expectedGsol = stakerGsolBalance.sub(withdrawalAmountBN);
    const expectedBsol = vaultStakePoolSolBalance.sub(
      new BN(
        "" + Math.floor(withdrawalAmount / (await beamClient.poolTokenPrice())),
      ),
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
    vaultStakePoolSolBalance = expectedBsol;
  });

  it("can burn gsol", async () => {
    // burn some gsol to simulate the creation of yield
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.burnGSol(burnAmount),
    );

    const expectedGsol = stakerGsolBalance.sub(burnAmount);

    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
  });

  it("can update the epoch report with the extractable yield", async () => {
    // we burned `burnAmount` gsol, so we should be able to extract `burnAmount` - estimated fee
    const expectedFee = burnAmount
      .mul(beamClient.spl.stakePoolState.stakeWithdrawalFee.numerator)
      .div(beamClient.spl.stakePoolState.stakeWithdrawalFee.denominator);
    extractableYield = burnAmount.sub(expectedFee);

    await sendAndConfirmTransaction(
      // anyone can update the epoch report, but let's use the staker provider (rather than the admin provider) for this test
      // to show that it doesn't have to be an admin
      stakerIdentity,
      await beamClient.updateEpochReport(),
    );

    // check that the epoch report has been updated
    beamClient = await beamClient.refresh();
    expect(
      beamClient.sunrise.state.epochReport.beamEpochDetails[0].extractableYield.toNumber(),
    ).to.equal(extractableYield.toNumber());
  });

  it("can extract yield into a stake account", async () => {
    // since we burned some sol - we now have yield to extract (the value of the LPs is higher than the value of the GSOL staked)
    await sendAndConfirmTransaction(
      // anyone can extract yield to the yield account, but let's use the staker provider (rather than the admin provider) for this test
      // to show that it doesn't have to be an admin
      stakerIdentity,
      await beamClient.extractYield(),
    );

    await expectSolBalance(
      beamClient.provider,
      beamClient.sunrise.state.yieldAccount,
      extractableYield,
      // the calculation appears to be slightly inaccurate at present, but in our favour,
      // so we can leave this as a low priority TODO to improve the accuracy
      3000,
    );
  });
});
