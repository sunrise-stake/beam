import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";
import { MarinadeClient } from "../../marinade-sp/src";
import { MarinadeLpClient } from "../../marinade-lp/src";
import { SplClient } from "../../spl/src";
import {
  BeamInterface,
  canDepositSol,
  canDepositStake,
  canLiquidUnstake,
  canOrderUnstake,
  canWithdrawStake,
} from "../src/beamInterface";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { DEFAULT_ENVIRONMENT_CONFIG, EnvironmentConfig } from "./constants";

interface SunriseStakeDetails {
  effectiveGsolSupply: BN;
}

/** The sunrise stake client that diverts deposit, withdrawal, and mint/burn GSOL
 *  requests to the relevant beams.
 */
export class SunriseStake {
  sunriseClient: SunriseClient;

  readonly staker: PublicKey;
  // TODO: Is this needed?
  readonly stakerGsolATA: PublicKey;

  details: SunriseStakeDetails | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    readonly beams: BeamInterface[],
    sunrise: SunriseClient
  ) {
    this.sunriseClient = sunrise;
    this.staker = this.provider.publicKey;
    this.stakerGsolATA = PublicKey.findProgramAddressSync(
      [
        this.staker.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        sunrise.account.gsolMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
  }

  public async init(
    provider: AnchorProvider,
    beams: BeamInterface[],
    envConfig?: EnvironmentConfig
  ): Promise<SunriseStake> {
    let config = envConfig ?? DEFAULT_ENVIRONMENT_CONFIG;
    let sunrise = await SunriseClient.get(
      config.sunriseState,
      provider,
      config.sunriseProgramId
    );

    /** Validate that beams are compatible with sunrise instance. */
    let sunriseBeams = sunrise.account.beams;
    for (let beam of beams) {
      if (sunriseBeams.find((b) => b.key === beam.state) === undefined) {
        throw new Error("Invalid Beam. Beam not recognized by sunrise state.");
      }
    }

    return new SunriseStake(provider, beams, sunrise);
  }

  public async deposit(
    lamports: BN,
    recipient?: PublicKey
  ): Promise<Transaction[]> {
    let options = this.solDepositBeams();
    if (options.length === 0) {
      throw new Error("No available beam(s) for deposit");
    }

    let transactions = new Array<Transaction>();
    let deposits = await this.splitDeposit(lamports, options);
    for (let deposit of deposits) {
      let [beam, amount] = deposit;
      transactions.push(await beam.deposit(amount, recipient));
    }

    return transactions;
  }

  /** Route a deposit through the beams required to complete it. */
  private async splitDeposit(
    lamports: BN,
    options: BeamInterface[]
  ): Promise<[BeamInterface, BN][]> {
    const { effectiveGsolSupply } = await this.fetchDetails();
    // If effective Gsol supply equals 0, any beam can fully cover the deposit.
    if (effectiveGsolSupply.eqn(0)) {
      return [[options[0], lamports]];
    }

    let unassigned = lamports;
    let results = new Array<[BeamInterface, BN]>();

    for (let i = 0; i < options.length; ++i) {
      if (unassigned.eqn(0) === true) {
        break;
      }

      const allocation = this.sunriseClient.account.beams.find(
        (a) => a.key === options[i].state
      ).allocation;
      const window = effectiveGsolSupply.muln(allocation).divn(100);

      // Assumes no overflow for `toNumber()`
      let singleDeposit = new BN(
        Math.min(window.toNumber(), unassigned.toNumber())
      );

      unassigned = unassigned.sub(singleDeposit);
      results.push([options[i], singleDeposit]);
    }

    // Reachable if the client is initialized with some beams missing.
    if (unassigned.eqn(0) === false) {
      throw new Error(
        `Presently available beams are inadequate for deposit, 
        missing ${unassigned.toString()} lamports. `
      );
    }

    return results;
  }

  private async fetchDetails(): Promise<SunriseStakeDetails> {
    let currentGsolCirculation = await this.provider.connection
      .getTokenSupply(this.sunriseClient.account.gsolMint)
      .then((response) => response.value);
    let preGsolCirculation = this.sunriseClient.account.preSupply;
    let effectiveGsolSupply = new BN(currentGsolCirculation.amount).sub(
      preGsolCirculation
    );

    return {
      effectiveGsolSupply,
    };
  }

  public async depositStake(
    stakeAccount: PublicKey,
    recipient?: PublicKey
  ): Promise<Transaction[]> {
    let options = this.stakeDepositBeams();
    if (options.length === 0) {
      throw new Error("No available beam(s) for stake deposit.");
    }

    // TODO: Possible to split stake accounts on the client before depositing?
    return [];
  }

  public async unstake(lamports: BN) {}

  public async orderUnstake(lamports: BN) {}

  public async claimUnstakeTicket(lamports: BN) {}

  public async withdrawStake(lamports: BN, newStakeAccount: PublicKey) {}

  public async recoverTickets() {}

  public async triggerRebalance() {}

  public async extractYield() {}

  public async calculateExtractableYield() {}

  private solDepositBeams(): BeamInterface[] {
    return this.beams.filter((beam) => beam.supportsSolDeposit());
  }
  private stakeDepositBeams(): BeamInterface[] {
    return this.beams.filter((beam) => beam.supportsStakeDeposit());
  }
  private liquidUnstakeBeams(): BeamInterface[] {
    return this.beams.filter((beam) => beam.supportsLiquidUnstake());
  }
  private orderUnstakeBeams(): BeamInterface[] {
    return this.beams.filter((beam) => beam.supportsOrderUnstake());
  }
  private withdrawStakeAccountBeams(): BeamInterface[] {
    return this.beams.filter((beam) => beam.supportsWithdrawStake());
  }
}
