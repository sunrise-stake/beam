/**
 * A suite of tests for the marinade sunbeam. The marinade sunbeam uses the marinade stake pool
 * to generate yield.
 */
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import {
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

describe("sunrise-marinade", () => {
  let client: MarinadeClient;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let msolTokenAccount: PublicKey; /** For the marinade beam, also registered as the msol token account for the marinade-lp beam*/
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

  it("can initialize a state", async () => {
    const treasury = Keypair.generate();
    client = await MarinadeClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
    );

    client = await client.refresh();
    const info = client.state.pretty();
    expect(info.proxyState).to.equal(
      client.marinade.state.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultMsolBalance = await tokenAccountBalance(
      provider,
      client.marinade.beamMsolVault,
    );
  });

  it("Can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.state.updateAuthority,
      sunriseState: client.state.sunriseState,
      vaultAuthorityBump: client.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      marinadeState: client.state.proxyState,
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
    msolTokenAccount = client.marinade.beamMsolVault;
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await MarinadeClient.get(stakerIdentity, client.stateAddress);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10)),
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedMsol = vaultMsolBalance.addn(
      Math.floor(depositAmount / client.marinade.state.mSolPrice),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
      expectedMsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultMsolBalance = expectedMsol;
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
      await client.withdraw(new BN(liquidWithdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.subn(liquidWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(liquidWithdrawalAmount / client.marinade.state.mSolPrice),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
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
    } = await client.orderWithdraw(new BN(delayedWithdrawalAmount));
    await sendAndConfirmTransaction(stakerIdentity, tx, [
      sunriseTicket,
      marinadeTicket,
    ]);

    const ticketAccount = await client.program.account.proxyTicket.fetch(
      sunriseTicket.publicKey,
    );
    expect(ticketAccount.beneficiary.toBase58()).to.equal(
      staker.publicKey.toBase58(),
    );
    expect(ticketAccount.marinadeTicketAccount.toBase58()).to.equal(
      marinadeTicket.publicKey.toBase58(),
    );
    expect(ticketAccount.state.toBase58()).to.equal(
      client.stateAddress.toBase58(),
    );

    const expectedGsol = stakerGsolBalance.subn(delayedWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(delayedWithdrawalAmount / client.marinade.state.mSolPrice),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
      expectedMsol,
    );

    sunriseDelayedTicket = sunriseTicket.publicKey;
    orderUnstakeLamports = 5;
  });

  it("can redeem an unstake ticket after one epoch has passed", async () => {
    const stakerPreSolBalance = await solBalance(client.provider);

    // unfortunately with the test validator, it is impossible to move the epoch forward without just waiting.
    // we run the validator at 32 slots per epoch, so we "only" need to wait for ~12 seconds
    // An alternative is to write rust tests using solana-program-test
    await waitForNextEpoch(client.provider);

    const sunriseLamports = await client.provider.connection
      .getAccountInfo(sunriseDelayedTicket)
      .then((account) => account?.lamports);
    await sendAndConfirmTransaction(
      client.provider,
      await client.redeemTicket(sunriseDelayedTicket),
      [],
    );

    // the staker does not get the marinade ticket rent
    const expectedPostUnstakeBalance = stakerPreSolBalance
      .addn(orderUnstakeLamports)
      .addn(sunriseLamports ?? 0)
      .subn(5000);
    await expectStakerSolBalance(
      client.provider,
      expectedPostUnstakeBalance,
      100,
    );
  });
});
