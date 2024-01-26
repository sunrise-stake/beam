/**
 * A suite of tests for the marinade-lp sunbeam. The marinade-lp sunbeam uses the marinade mSOL/SOL
 * liquidity pool to generate yield.
 */
import { SunriseClient } from "@sunrisestake/beams-core";
import { MarinadeLpClient } from "@sunrisestake/beams-marinade-lp";
import { Keypair, LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { provider, staker, stakerIdentity } from "../setup.js";
import {
  createTokenAccount,
  expectTokenBalance,
  fund,
  logAtLevel,
  registerSunriseState,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import { expect } from "chai";
import { MSOL_MINT } from "../consts.js";

describe("Marinade liquidity pool beam", () => {
  let coreClient: SunriseClient;
  let beamClient: MarinadeLpClient;
  let stakerGsolBalance: BN;

  let sunriseStateAddress: PublicKey;
  let vaultBalance: BN;

  const depositAmount = 10 * LAMPORTS_PER_SOL;
  const failedDepositAmount = 5 * LAMPORTS_PER_SOL;
  const withdrawalAmount = 5 * LAMPORTS_PER_SOL;

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

    vaultBalance = await tokenAccountBalance(
      provider,
      beamClient.marinadeLp.beamVault,
    ).catch(() => {
      logAtLevel("info")("Balance not found");
      return new BN(0);
    });
  });

  it("can initialize a state", async () => {
    // create an MSol token account for the beam.
    // NOTE - when combined with the marinade-sp beam, this should be the msol token account
    // associated with the marinade stake pool.
    const msolTokenAccount = await createTokenAccount(
      provider,
      sunriseStateAddress,
      MSOL_MINT,
    );

    await SunriseClient.get(provider, sunriseStateAddress);

    const treasury = Keypair.generate();
    beamClient = await MarinadeLpClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateAddress,
      treasury.publicKey,
      msolTokenAccount,
    );

    const info = beamClient.state.pretty();
    expect(info.proxyState).to.equal(
      beamClient.marinadeLp.marinade.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(sunriseStateAddress.toBase58());
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
    const depositAmountBN = new BN(depositAmount);

    // register the beam on sunrise
    coreClient = await coreClient.refresh();
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
      await beamClient.deposit(depositAmountBN),
      [],
    );

    const expectedGsol = stakerGsolBalance.add(depositAmountBN);
    const expectedLpTokens = vaultBalance.add(
      new BN(
        "" + Math.floor(depositAmount / (await beamClient.poolTokenPrice())),
      ),
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
    // withdraw from the pool
    await sendAndConfirmTransaction(
      stakerIdentity,
      await beamClient.withdraw(new BN(withdrawalAmount)),
      [],
    );

    const expectedGsol = stakerGsolBalance.sub(withdrawalAmountBN);

    // the expected amount of withdrawn lp tokens is the total lp supply multiplied by the proportion
    // of the sol leg that this withdrawal represents.
    // if the pool has 10 SOL, and we are withdrawing one, then we are withdrawing 10% of the pool tokens.
    const proportionOfPool =
      await beamClient.proportionOfPool(withdrawalAmountBN);
    const lpSupply = await beamClient.poolTokenSupply();
    const withdrawnLpTokens = new BN(
      "" + Math.floor(lpSupply.toNumber() * proportionOfPool),
    );
    const expectedLPTokens = vaultBalance.sub(withdrawnLpTokens);

    await expectTokenBalance(
      beamClient.provider,
      beamClient.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      beamClient.provider,
      beamClient.marinadeLp.beamVault,
      expectedLPTokens,
    );
  });

  it("can burn gsol", async () => {
    // burn some gsol to simulate the creation of yield
    const burnAmount = new BN(1 * LAMPORTS_PER_SOL);
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

  // it("can extract yield", async () => {
  //   // since we burned some sol - we now have yield to extract (the value of the LPs is higher than the value of the GSOL staked)
  //
  //   await sendAndConfirmTransaction(
  //       // anyone can extract yield to the yield account, but let's use the staker provider (rather than the admin provider) for this test
  //       // to show that it doesn't have to be an admin
  //       stakerIdentity,
  //       await beamClient.extractYield(),
  //   )
  // });
});
