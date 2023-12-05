/**
 * A suite of tests for the marinade-lp sunbeam. The marinade-lp sunbeam uses the marinade mSOL/SOL
 * liquidity pool to generate yield.
 */
import { SunriseClient } from "@sunrisestake/beams-sunrise";
import { MarinadeLpClient } from "@sunrisestake/beams-marinade-lp";
import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import BN from "bn.js";
import { provider, sunriseStateKeypair } from "../setup.js";
import {
  expectTokenBalance,
  fund,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import { expect } from "chai";

describe("marinade-lp", () => {
  let msolTokenAccount: PublicKey; /** For the marinade beam, also registered as the msol token account for the marinade-lp beam*/
  let sunriseClient: SunriseClient;
  let client: MarinadeLpClient;

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

  it("can initialize a state", async () => {
    sunriseClient = await SunriseClient.get(
      provider,
      sunriseStateKeypair.publicKey,
    );
    await sendAndConfirmTransaction(
      provider,
      await sunriseClient.registerBeam(mlpState),
      [],
    );

    const treasury = Keypair.generate();
    client = await MarinadeLpClient.initialize(
      provider,
      provider.publicKey,
      sunriseStateKeypair.publicKey,
      treasury.publicKey,
      msolTokenAccount,
    );

    client = await client.refresh();
    const info = client.state.pretty();
    expect(info.proxyState).to.equal(
      client.marinadeLp.marinade.marinadeStateAddress.toBase58(),
    );
    expect(info.sunriseState).to.equal(
      sunriseStateKeypair.publicKey.toBase58(),
    );
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString(),
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBalance = await tokenAccountBalance(
      provider,
      client.marinadeLp.beamVault,
    );
  });

  it("Can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.state.updateAuthority,
      sunriseState: client.state.sunriseState,
      vaultAuthorityBump: client.state.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      msolTokenAccount,
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
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await MarinadeLpClient.get(stakerIdentity, client.stateAddress);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10)),
      [],
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedLpTokens = vaultBalance.addn(
      Math.floor(depositAmount / (await client.poolTokenPrice())),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.marinadeLp.beamVault,
      expectedLpTokens,
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedLpTokens;
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
    const expectedBsol = vaultBalance.subn(
      Math.floor(withdrawalAmount / (await client.poolTokenPrice())),
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol,
    );
    await expectTokenBalance(
      client.provider,
      client.marinadeLp.beamVault,
      expectedBsol,
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedBsol;
  });
});
