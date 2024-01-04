import { SunriseClient } from "@sunrisestake/beams-core";
import {
  MARINADE_LP_BEAM_STATE,
  MARINADE_SP_BEAM_STATE,
  SUNRISE_CORE_STATE,
  TX_FEE,
} from "../consts.js";
import { provider, staker, stakerIdentity } from "../setup.js";
import { MarinadeLpClient } from "@sunrisestake/beams-marinade-lp";
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import {
  expectStakerSolBalance,
  expectTokenBalance,
  fund,
  sendAndConfirmTransaction,
  tokenAccountBalance,
} from "../../utils.js";
import BN from "bn.js";
import { Transaction, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

describe("Marinade beams", () => {
  let coreClient: SunriseClient;
  let marinadeLPClient: MarinadeLpClient;
  let marinadeSPClient: MarinadeClient;
  let stakerGsolBalance: BN = new BN(0);

  const sendAsAdmin = (tx: Transaction) =>
    sendAndConfirmTransaction(provider, tx);
  const sendAsStaker = (tx: Transaction) =>
    sendAndConfirmTransaction(stakerIdentity, tx);

  before("Set up the beams", async () => {
    // Get core client
    coreClient = await SunriseClient.get(provider, SUNRISE_CORE_STATE);

    // Update capacity
    await sendAsAdmin(await coreClient.resizeAllocations(15));

    // register marinade stake pool & marinade liquidity pool beams
    marinadeLPClient = await MarinadeLpClient.get(
      provider,
      MARINADE_LP_BEAM_STATE,
    );
    await sendAsAdmin(
      await coreClient.registerBeam(marinadeLPClient.stateAddress),
    );

    marinadeSPClient = await MarinadeClient.get(
      provider,
      MARINADE_SP_BEAM_STATE,
    );
    await sendAsAdmin(
      await coreClient.registerBeam(marinadeSPClient.stateAddress),
    );
  });

  before("Fund the staker", () => fund(provider, staker.publicKey, 100));

  afterEach("Update staker balance", async () => {
    stakerGsolBalance = await tokenAccountBalance(
      stakerIdentity,
      coreClient.gsolAssociatedTokenAccount(staker.publicKey),
    );
  });

  context("deposit into marinade stake pool", () => {
    it("should mint the equivalent amount of gSOL", async () => {
      const depositAmount = new BN(10 * LAMPORTS_PER_SOL);

      marinadeSPClient = await MarinadeClient.get(
        stakerIdentity,
        marinadeSPClient.stateAddress,
      );

      await sendAsStaker(await marinadeSPClient.deposit(depositAmount));

      await expectTokenBalance(
        provider,
        coreClient.gsolAssociatedTokenAccount(staker.publicKey),
        stakerGsolBalance.add(depositAmount),
      );
    });
  });

  context("deposit into marinade lp", () => {
    it("should mint the equivalent amount of gSOL", async () => {
      const depositAmount = new BN(10 * LAMPORTS_PER_SOL);

      marinadeLPClient = await MarinadeLpClient.get(
        stakerIdentity,
        marinadeLPClient.stateAddress,
      );

      await sendAsStaker(await marinadeLPClient.deposit(depositAmount));

      await expectTokenBalance(
        provider,
        coreClient.gsolAssociatedTokenAccount(staker.publicKey),
        stakerGsolBalance.add(depositAmount),
      );
    });
  });

  context("withdrawal from marinade liquidity pool", () => {
    it("should deposit msol into the vault owned by the stake pool", async () => {
      marinadeLPClient = await MarinadeLpClient.get(
        stakerIdentity,
        marinadeLPClient.stateAddress,
      );

      const withdrawalAmount = new BN(5 * LAMPORTS_PER_SOL);
      // the expected amount of withdrawn msol is complicated, but basically:
      // the total withdrawal amount is
      //     the total requested sol value (5 SOL)
      //   + the msol equivalent of the total requested sol value (5 SOL * the msol price according to the liquidity pool)
      // the msol price is equal to the total msol in the pool divided by the total sol in the pool
      // since this is a lot to calculate here, we just hardcode the expected value in the test
      const expectedWithdrawnMsol = new BN("396478344");

      const preWithdrawalMsolVaultBalance = await tokenAccountBalance(
        provider,
        marinadeSPClient.marinade.beamMsolVault,
      );

      const solBalanceBeforeWithdrawal = await provider.connection.getBalance(
        staker.publicKey,
      );

      // The withdrawal will withdraw roughly half SOL and half mSOL from the LP.
      // The mSOL will be deposited into the vault owned by the stake pool.
      await sendAsStaker(await marinadeLPClient.withdraw(withdrawalAmount));

      const postWithdrawalMsolVaultBalance = await tokenAccountBalance(
        provider,
        marinadeSPClient.marinade.beamMsolVault,
      );

      // The staker should have received the full amount they withdrew;
      const expectedBalance = new BN(solBalanceBeforeWithdrawal)
        .add(withdrawalAmount)
        .subn(TX_FEE);

      await expectStakerSolBalance(
        marinadeLPClient.provider,
        expectedBalance,
        10,
      );

      // The vault balance should increase by the amount of mSOL withdrawn.
      expect(
        postWithdrawalMsolVaultBalance
          .sub(preWithdrawalMsolVaultBalance)
          .toString(),
      ).to.equal(expectedWithdrawnMsol.toString());
    });
  });
});
