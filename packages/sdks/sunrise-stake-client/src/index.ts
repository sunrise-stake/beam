import { type AnchorProvider, Idl } from "@coral-xyz/anchor";
import { PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { SunriseClient } from "@sunrisestake/beams-core";
import { BeamInterface, BeamState } from "@sunrisestake/beams-common";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { DEFAULT_ENVIRONMENT_CONFIG, EnvironmentConfig } from "./constants.js";

interface SunriseStakeDetails {
  effectiveGsolSupply: BN;
}

/** The sunrise stake client that diverts deposit, withdrawal, and mint/burn GSOL
 *  requests to the relevant beams.
 */
export class SunriseStake {
  // TODO: Is this needed?
  readonly stakerGsolATA: PublicKey;

  details: SunriseStakeDetails | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    readonly beams: BeamInterface<Idl, BeamState>[],
    readonly sunriseClient: SunriseClient,
  ) {
    this.stakerGsolATA = PublicKey.findProgramAddressSync(
      [
        this.staker.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        this.sunriseClient.state.gsolMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID,
    )[0];
  }

  public get staker(): PublicKey {
    return this.provider.publicKey;
  }

  public async init(
    provider: AnchorProvider,
    beams: BeamInterface<Idl, BeamState>[],
    envConfig?: EnvironmentConfig,
  ): Promise<SunriseStake> {
    const config = envConfig ?? DEFAULT_ENVIRONMENT_CONFIG;
    const sunrise = await SunriseClient.get(
      provider,
      config.sunriseState,
      config.sunriseProgramId,
    );

    /** Validate that beams are compatible with the sunrise instance. */
    const sunriseBeams = sunrise.state.beams;
    const invalidBeams = beams.filter(
      (beam) =>
        sunriseBeams.find((b) => b.key === beam.stateAddress) === undefined,
    );
    if (invalidBeams.length > 0) {
      throw new Error(
        `Invalid beams. Beams not recognized by sunrise state: ${invalidBeams
          .map((b) => b.stateAddress.toBase58())
          .join(", ")}`,
      );
    }

    return new SunriseStake(provider, beams, sunrise);
  }

  public async deposit(
    lamports: BN,
    recipient?: PublicKey,
  ): Promise<Transaction[]> {
    const options = this.solDepositBeams();
    if (options.length === 0) {
      throw new Error("No available beam(s) for deposit");
    }

    const transactions = new Array<Transaction>();
    const deposits = await this.splitDeposit(lamports, options);
    for (const deposit of deposits) {
      const [beam, amount] = deposit;
      transactions.push(await beam.deposit(amount, recipient));
    }

    return transactions;
  }

  /** Route a deposit through the beams required to complete it. */
  private async splitDeposit(
    lamports: BN,
    options: BeamInterface<Idl, BeamState>[],
  ): Promise<[BeamInterface<Idl, BeamState>, BN][]> {
    const { effectiveGsolSupply } = await this.fetchDetails();
    // If effective Gsol supply equals 0, any beam can fully cover the deposit.
    if (effectiveGsolSupply.eqn(0)) {
      return [[options[0], lamports]];
    }

    let unassigned = lamports;
    const results = new Array<[BeamInterface<Idl, BeamState>, BN]>();

    for (let i = 0; i < options.length; ++i) {
      if (unassigned.eqn(0)) {
        break;
      }

      const allocation = this.sunriseClient.state.beams.find(
        (a) => a.key === options[i].stateAddress,
      )?.allocation;

      if (!allocation) throw new Error("Beam allocation not found");

      const window = effectiveGsolSupply.muln(allocation).divn(100);

      // Assumes no overflow for `toNumber()`
      const singleDeposit = new BN(
        Math.min(window.toNumber(), unassigned.toNumber()),
      );

      unassigned = unassigned.sub(singleDeposit);
      results.push([options[i], singleDeposit]);
    }

    // Reachable if the client is initialized with some beams missing.
    if (!unassigned.eqn(0)) {
      throw new Error(
        `Presently available beams are inadequate for deposit, 
        missing ${unassigned.toString()} lamports. `,
      );
    }

    return results;
  }

  private async fetchDetails(): Promise<SunriseStakeDetails> {
    const currentGsolCirculation = await this.provider.connection
      .getTokenSupply(this.sunriseClient.state.gsolMint)
      .then((response) => response.value);
    const preGsolCirculation = this.sunriseClient.state.preSupply;
    const effectiveGsolSupply = new BN(currentGsolCirculation.amount).sub(
      preGsolCirculation,
    );

    return {
      effectiveGsolSupply,
    };
  }

  public async depositStake() // stakeAccount: PublicKey,
  // recipient?: PublicKey,
  : Promise<Transaction[]> {
    const options = this.stakeDepositBeams();
    if (options.length === 0) {
      throw new Error("No available beam(s) for stake deposit.");
    }

    // TODO: Possible to split stake accounts on the client before depositing?
    return [];
  }

  public async unstake(lamports: BN) {
    // TODO
    console.log("TODO - unstake", lamports);
  }

  public async orderUnstake(lamports: BN) {
    // TODO
    console.log("TODO - orderUnstake", lamports);
  }

  public async claimUnstakeTicket(lamports: BN) {
    // TODO
    console.log("TODO - claimUnstakeTicket", lamports);
  }

  public async withdrawStake(lamports: BN, newStakeAccount: PublicKey) {
    // TODO
    console.log("TODO - withdrawStake", lamports, newStakeAccount);
  }

  public async recoverTickets() {}

  public async triggerRebalance() {}

  public async extractYield() {}

  public async calculateExtractableYield() {}

  private solDepositBeams(): BeamInterface<Idl, BeamState>[] {
    return this.beams.filter((beam) => beam.supportsSolDeposit());
  }
  private stakeDepositBeams(): BeamInterface<Idl, BeamState>[] {
    return this.beams.filter((beam) => beam.supportsStakeDeposit());
  }
  private liquidUnstakeBeams(): BeamInterface<Idl, BeamState>[] {
    return this.beams.filter((beam) => beam.supportsLiquidUnstake());
  }
  private orderUnstakeBeams(): BeamInterface<Idl, BeamState>[] {
    return this.beams.filter((beam) => beam.supportsOrderUnstake());
  }
  private withdrawStakeAccountBeams(): BeamInterface<Idl, BeamState>[] {
    return this.beams.filter((beam) => beam.supportsWithdrawStake());
  }
}
