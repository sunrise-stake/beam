/**
 * A suite of tests for the marinade sunbeam. The marinade sunbeam uses the marinade stake pool
 * to generate yield.
 */
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import { SunriseClient } from "@sunrisestake/beams-core";
import {
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
  AccountInfo,
} from "@solana/web3.js";
import BN from "bn.js";
import {
  expectSolBalance,
  expectStakerSolBalance,
  expectTokenBalance,
  fund,
  logAtLevel,
  registerSunriseState,
  sendAndConfirmTransaction,
  solBalance,
  tokenAccountBalance,
  waitForNextEpoch,
} from "../../utils.js";
import { provider, staker, stakerIdentity } from "../setup.js";
import { expect } from "chai";
import { MSOL_MINT } from "../consts.js";

describe("Marinade stake pool beam", () => {
  let coreClient: SunriseClient;
  let beamClient: MarinadeClient;
  let vaultMsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);
  let extractableYield: BN;

  let sunriseStateAddress: PublicKey;
  let sunriseDelayedTicket: PublicKey;

  const depositAmount = 10 * LAMPORTS_PER_SOL;
  const failedDepositAmount = 5 * LAMPORTS_PER_SOL;
  const liquidWithdrawalAmount = 5 * LAMPORTS_PER_SOL;
  const delayedWithdrawalAmount = 1 * LAMPORTS_PER_SOL;
  const burnAmount = new BN(1 * LAMPORTS_PER_SOL);

  before("Set up the sunrise state", async () => {
    coreClient = await registerSunriseState();
    sunriseStateAddress = coreClient.stateAddress;
  });

  before("Fund the staker", () => fund(provider, staker.publicKey, 100));

  afterEach("Update balances", async () => {
    stakerGsolBalance = await tokenAccountBalance(
      stakerIdentity,
      coreClient.gsolAssociatedTokenAccount(staker.publicKey),
    ).catch(() => {
      logAtLevel("info")("Balance not found");
      return new BN(0);
    });

    vaultMsolBalance = await tokenAccountBalance(
      provider,
      beamClient.marinade.beamMsolVault,
    ).catch(() => {
      logAtLevel("info")("Balance not found");
      return new BN(0);
    });
  });

  it("can initialize a state", async () => {
    beamClient = await MarinadeClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateAddress,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.marinade.state.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(sunriseStateAddress.toBase58());
    expect(info.vaultAuthorityBump).to.equal(
      beamClient.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultMsolBalance = await tokenAccountBalance(
      provider,
      beamClient.marinade.beamMsolVault,
    );
  });

  it("can update a state", async () => {
    const newUpdateAuthority = Keypair.generate();
    const updateParams = {
      updateAuthority: newUpdateAuthority.publicKey,
      sunriseState: beamClient.state.sunriseState,
      vaultAuthorityBump: beamClient.state.vaultAuthorityBump,
      marinadeState: beamClient.state.proxyState,
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
    beamClient = await MarinadeClient.get(
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

  it("can deposit and mint gsol once the beam is registered", async () => {
    const depositAmountBN = new BN(depositAmount);

    // register the beam on sunrise
    coreClient = await coreClient.refresh();
    await sendAndConfirmTransaction(
      provider,
      await coreClient.registerBeam(beamClient.stateAddress),
    );

    // try depositing again
    beamClient = await beamClient.refresh();

    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(depositAmountBN),
    );

    const expectedGsol = stakerGsolBalance.add(depositAmountBN);
    const expectedMsol = vaultMsolBalance.add(
      new BN(
        "" + Math.floor(depositAmount / beamClient.marinade.state.mSolPrice),
      ),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinade.beamMsolVault,
      expectedMsol,
      5,
    );
    stakerGsolBalance = expectedGsol;
    vaultMsolBalance = expectedMsol;
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
    const liquidWithdrawalAmountBN = new BN(liquidWithdrawalAmount);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(liquidWithdrawalAmountBN),
      [],
    );

    const expectedGsol = stakerGsolBalance.sub(liquidWithdrawalAmountBN);
    const expectedMsol = vaultMsolBalance.sub(
      new BN(
        "" +
          Math.floor(
            liquidWithdrawalAmount / beamClient.marinade.state.mSolPrice,
          ),
      ),
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinade.beamMsolVault,
      expectedMsol,
      5,
    );
  });

  it("can order a withdrawal and burn gsol", async () => {
    const delayedWithdrawalAmountBN = new BN(delayedWithdrawalAmount);
    const {
      tx,
      sunriseTicket,
      proxyTicket: marinadeTicket,
    } = await beamClient.orderWithdraw(new BN(delayedWithdrawalAmount));
    await sendAndConfirmTransaction(stakerIdentity, tx, [
      sunriseTicket,
      marinadeTicket,
    ]);

    const ticketAccount = await beamClient.program.account.proxyTicket.fetch(
      sunriseTicket.publicKey,
    );
    expect(ticketAccount.beneficiary.toBase58()).to.equal(
      staker.publicKey.toBase58(),
    );
    expect(ticketAccount.marinadeTicketAccount.toBase58()).to.equal(
      marinadeTicket.publicKey.toBase58(),
    );
    expect(ticketAccount.state.toBase58()).to.equal(
      beamClient.stateAddress.toBase58(),
    );

    const expectedGsol = stakerGsolBalance.sub(delayedWithdrawalAmountBN);
    const expectedMsol = vaultMsolBalance.sub(
      new BN(
        "" +
          Math.round(
            delayedWithdrawalAmount / beamClient.marinade.state.mSolPrice,
          ),
      ),
    );

    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinade.beamMsolVault,
      expectedMsol,
      1,
    );

    sunriseDelayedTicket = sunriseTicket.publicKey;
  });

  it("can redeem an unstake ticket after one epoch has passed", async () => {
    const orderUnstakeLamportsBN = new BN(delayedWithdrawalAmount);
    const stakerPreSolBalance = await solBalance(beamClient.provider);

    // unfortunately with the test validator, it is impossible to move the epoch forward without just waiting.
    // we run the validator at 32 slots per epoch, so we "only" need to wait for ~12 seconds
    // An alternative is to write rust tests using solana-program-test
    await waitForNextEpoch(beamClient.provider);

    const sunriseLamports = await beamClient.provider.connection
      .getAccountInfo(sunriseDelayedTicket)
      .then((account: AccountInfo<Buffer> | null) => account?.lamports);
    await sendAndConfirmTransaction(
      beamClient.provider,
      await beamClient.redeemTicket(sunriseDelayedTicket),
      [],
    );

    // the staker does not get the marinade ticket rent
    const expectedPostUnstakeBalance = stakerPreSolBalance
      .add(orderUnstakeLamportsBN)
      .addn(sunriseLamports ?? 0)
      .subn(5000);
    await expectStakerSolBalance(
      beamClient.provider,
      expectedPostUnstakeBalance,
      100,
    );
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
    const expectedFee = burnAmount.toNumber() * 0.003;
    extractableYield = burnAmount.subn(expectedFee);

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
    // The beam performs a delayed unstake to reduce fees, so the result is a stake account with the yield in it.

    await sendAndConfirmTransaction(
      // anyone can extract yield to the yield account, but let's use the staker provider (rather than the admin provider) for this test
      // to show that it doesn't have to be an admin
      stakerIdentity,
      await beamClient.extractYield(),
    );

    await expectSolBalance(
      beamClient.provider,
      beamClient.sunrise.state.yieldAccount,
      extractableYield, // calculated in the previous test
      1,
    );
  });
});
