/**
 * A suite of tests for the marinade sunbeam. The marinade sunbeam uses the marinade stake pool
 * to generate yield.
 */
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
  createTokenAccount,
  expectStakerSolBalance,
  expectTokenBalance,
  fund,
  sendAndConfirmTransaction,
  solBalance,
  tokenAccountBalance,
  waitForNextEpoch,
} from "../../utils.js";
import { sunriseStateKeypair } from "../setup.js";
import { expect } from "chai";
import { MSOL_MINT, SUNRISE_CORE_STATE } from "../consts.js";
import { SunriseClient } from "@sunrisestake/beams-core";

describe("Marinade stake pool beam", () => {
  let beamClient: MarinadeClient;
  const provider = AnchorProvider.env();

  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {},
  );

  let vaultMsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  let sunriseDelayedTicket: PublicKey;
  let orderUnstakeLamports: number;

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const liquidWithdrawalAmount = 5;
  const delayedWithdrawalAmount = 5;

  before("Fund the staker", () => fund(provider, staker.publicKey, 30));

  it("can initialize a state", async () => {
    // create an MSol token account for the beam.
    await createTokenAccount(
      provider,
      sunriseStateKeypair.publicKey,
      MSOL_MINT,
    );
    const treasury = Keypair.generate();
    beamClient = await MarinadeClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.marinade.state.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
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
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: beamClient.state.updateAuthority,
      sunriseState: beamClient.state.sunriseState,
      vaultAuthorityBump: beamClient.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
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
    // register the beam on sunrise
    const coreClient = await SunriseClient.get(provider, SUNRISE_CORE_STATE);
    await sendAndConfirmTransaction(
      provider,
      await coreClient.registerBeam(beamClient.stateAddress),
    );

    // try depositing again
    beamClient = await MarinadeClient.get(
      stakerIdentity,
      beamClient.stateAddress,
    );
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.deposit(new BN(10)),
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedMsol = vaultMsolBalance.addn(
      Math.floor(depositAmount / beamClient.marinade.state.mSolPrice),
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
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(new BN(liquidWithdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.subn(liquidWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(liquidWithdrawalAmount / beamClient.marinade.state.mSolPrice),
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
    );
    stakerGsolBalance = expectedGsol;
    vaultMsolBalance = expectedMsol;
  });

  it("can order a withdrawal and burn gsol", async () => {
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

    const expectedGsol = stakerGsolBalance.subn(delayedWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(delayedWithdrawalAmount / beamClient.marinade.state.mSolPrice),
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
    );

    sunriseDelayedTicket = sunriseTicket.publicKey;
    orderUnstakeLamports = 5;
  });

  it("can redeem an unstake ticket after one epoch has passed", async () => {
    const stakerPreSolBalance = await solBalance(beamClient.provider);

    // unfortunately with the test validator, it is impossible to move the epoch forward without just waiting.
    // we run the validator at 32 slots per epoch, so we "only" need to wait for ~12 seconds
    // An alternative is to write rust tests using solana-program-test
    await waitForNextEpoch(beamClient.provider);

    const sunriseLamports = await beamClient.provider.connection
      .getAccountInfo(sunriseDelayedTicket)
      .then((account) => account?.lamports);
    await sendAndConfirmTransaction(
      beamClient.provider,
      await beamClient.redeemTicket(sunriseDelayedTicket),
      [],
    );

    // the staker does not get the marinade ticket rent
    const expectedPostUnstakeBalance = stakerPreSolBalance
      .addn(orderUnstakeLamports)
      .addn(sunriseLamports ?? 0)
      .subn(5000);
    await expectStakerSolBalance(
      beamClient.provider,
      expectedPostUnstakeBalance,
      100,
    );
  });
});
