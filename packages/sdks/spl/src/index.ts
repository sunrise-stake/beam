import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
  StakeProgram,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { IDL, type SplBeam } from "../../types/spl_beam";
import { StateAccount } from "./state";
import {
  BLAZE_STAKE_POOL,
  SPL_BEAM_PROGRAM_ID,
  SPL_STAKE_POOL_PROGRAM_ID,
} from "./constants";
import { Utils } from "./utils";
import { getStakePoolAccount, StakePool } from "./getStakePool";
import { BeamInterface, BeamCapability, canDepositSol } from "../../sunrise-stake-client/src/beamInterface";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";

import {
  MarinadeUtils,
  Provider,
  type Wallet,
} from "@sunrisestake/marinade-ts-sdk";

/** An instance of the Sunrise program that acts as a proxy to SPL-compatible
 * stake-pools.
 */
export class SplClient extends BeamInterface {
  /** A list of actions supported by this beam. */
  public readonly caps: BeamCapability[];
  /** Anchor program instance. */
  readonly program: Program<SplBeam>;
  /** State address of this beam. */
  readonly state: PublicKey;
  /* The deserialized state account for this beam state*/
  account: StateAccount | undefined;
  /** The address of the authority of this beam's token vaults*/
  vaultAuthority: [PublicKey, number];
  stakePool: PublicKey;

  /** Fields that depend on the stake-pool state. */
  spl:
    | {
        /** The deserialized stake-pool state. */
        state: StakePool;
        /** The mint of the stake pool's token. */
        poolMint: PublicKey;
        /** The sunrise vault for holding the pool tokens. */
        beamVault: PublicKey;
        /** The stake pool's withdraw authority PDA. */
        withdrawAuthority: PublicKey;
        /** The stake pool's deposit authority PDA. */
        depositAuthority: PublicKey;
      }
    | undefined;

  /** Fields that depend on the sunrise "token-regulator" state. */
  sunrise:
    | {
        /** The client of the sunrise program. */
        client: SunriseClient;
        /** The GSOL mint. */
        gsol: PublicKey;
        /** The derived GSOL ATA for the active provider. */
        stakerGsolATA: PublicKey;
      }
    | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    state: PublicKey,
    programId: PublicKey,
    stakePool: PublicKey
  ) {
    super();
    this.program = new Program<SplBeam>(IDL, programId, provider);
    this.state = state;
    this.vaultAuthority = Utils.deriveAuthorityAddress(programId, state);
    this.caps = [
      { kind: "sol-deposit" },
      { kind: "stake-deposit" }, // unimplemented.
      { kind: "liquid-unstake" },
      { kind: "stake-withdrawal" },
    ];
    this.stakePool = stakePool;
  }

  /** Fetch an instance for an existing state account.*/
  public static async get(
    state: PublicKey,
    provider: AnchorProvider,
    stakePool?: PublicKey,
    programId?: PublicKey,
    refreshOverride?: boolean
  ): Promise<SplClient> {
    const client = new SplClient(
      provider,
      state,
      programId ?? SPL_BEAM_PROGRAM_ID,
      stakePool ?? BLAZE_STAKE_POOL
    );
    if (refreshOverride === undefined || refreshOverride === false) {
      await client.refresh();
    }
    return client;
  }

  /**
   * Register a new state.
   */
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    treasury: PublicKey,
    splStakePool?: PublicKey,
    programId?: PublicKey
  ): Promise<SplClient> {
    let PID = programId ?? SPL_BEAM_PROGRAM_ID;
    const state = Utils.deriveStateAddress(PID, sunriseState)[0];

    const client = await this.get(state, provider, splStakePool, PID, true);
    const vaultAuthority = client.vaultAuthority[0];
    const vaultAuthorityBump = client.vaultAuthority[1];

    let stakePool = client.stakePool;
    let decoded = await getStakePoolAccount(provider.connection, stakePool);
    let poolMint = decoded.poolMint;
    let poolTokensVault = getAssociatedTokenAddressSync(
      poolMint,
      vaultAuthority,
      true
    );

    const register = await client.program.methods
      .initialize({
        updateAuthority,
        stakePool,
        sunriseState,
        vaultAuthorityBump,
        treasury,
      })
      .accounts({
        payer: provider.publicKey,
        state,
        poolMint,
        poolTokensVault,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    await client.provider.sendAndConfirm(register, [], {
      commitment: "confirmed",
    });
    return client;
  }

  /**
   * Return a transaction to update the parameters for this state.
   */
  public update(
    currentUpdateAuthority: PublicKey,
    updateParams: {
      [Property in keyof Omit<
        StateAccount,
        "pretty" | "proxyState" | "address"
      >]: StateAccount[Property];
    } & { stakePool: PublicKey }
  ): Promise<Transaction> {
    return this.program.methods
      .update(updateParams)
      .accounts({
        updateAuthority: currentUpdateAuthority,
        state: this.state,
      })
      .transaction();
  }

  /**
   * Query on-chain data for the most recent account state.
   */
  public async refresh(sunrise?: SunriseClient): Promise<void> {
    const idlState = await this.program.account.state.fetch(this.state);
    this.account = StateAccount.fromIdlAccount(idlState, this.state);

    const state = await getStakePoolAccount(
      this.provider.connection,
      this.stakePool
    );
    const beamVault = getAssociatedTokenAddressSync(
      state.poolMint,
      this.vaultAuthority[0],
      true
    );
    this.spl = {
      state,
      poolMint: state.poolMint,
      beamVault,
      withdrawAuthority: PublicKey.findProgramAddressSync(
        [this.stakePool.toBuffer(), Buffer.from("withdraw")],
        SPL_STAKE_POOL_PROGRAM_ID
      )[0],
      depositAuthority: PublicKey.findProgramAddressSync(
        [this.stakePool.toBuffer(), Buffer.from("deposit")],
        SPL_STAKE_POOL_PROGRAM_ID
      )[0],
    };

    // Fetch the sunrise client only if it's not provided.
    const sunriseClient = sunrise ?? await this.getSunrise();
    if (sunriseClient.state !== this.account.sunriseState) {
      throw new Error("Invalid sunrise client instance");
    }
    const gsolMint = sunriseClient.account.gsolMint;
    this.sunrise = {
      client: sunriseClient,
      gsol: gsolMint,
      stakerGsolATA: getAssociatedTokenAddressSync(
        gsolMint,
        this.provider.publicKey,
        false
      ),
    };
  }

  /**
   * Fetch the sunrise state for this beam.
   */
  private async getSunrise(): Promise<SunriseClient> {
    if (this.account === undefined) {
      throw new Error("refresh() not called");
    }
    return SunriseClient.get(this.account.sunriseState, this.provider);
  }

  /** Return a transaction to deposit to an SPL stake-pool.
   * @param amount: Deposit amount in lamports.
   */
  public async deposit(amount: BN): Promise<Transaction> {
    if (!this.sunrise || !this.spl) {
      await this.refresh();
    }
    const depositor = this.provider.publicKey;

    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
      this.sunrise.client.mintGsolAccounts(this.state, depositor);

    const transaction = new Transaction();
    const stakerATA = await this.provider.connection.getAccountInfo(
      this.sunrise.stakerGsolATA
    );
    if (!stakerATA) {
      transaction.add(
        this.createTokenAccount(this.sunrise.stakerGsolATA, depositor, gsolMint)
      );
    }

    const instruction = await this.program.methods
      .deposit(amount)
      .accounts({
        state: this.state,
        stakePool: this.stakePool,
        sunriseState: this.account.sunriseState,
        depositor,
        mintGsolTo: this.sunrise.stakerGsolATA,
        poolMint: this.spl.poolMint,
        poolTokensVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.state.reserveStake,
        managerFeeAccount: this.spl.state.managerFeeAccount,
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        splStakePoolProgram: SPL_STAKE_POOL_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
  }

  /**
   * Return a transaction to withdraw from an SPL stake-pool.
   */
  public async withdraw(
    amount: BN,
    gsolTokenAccount?: PublicKey
  ): Promise<Transaction> {
    if (!this.sunrise || !this.spl) {
      await this.refresh();
    }
    const withdrawer = this.provider.publicKey;
    const { gsolMint, instructionsSysvar, burnGsolFrom } =
      this.sunrise.client.burnGsolAccounts(
        this.state,
        withdrawer,
        gsolTokenAccount
      );

    const instruction = await this.program.methods
      .withdraw(amount)
      .accounts({
        state: this.state,
        stakePool: this.stakePool,
        sunriseState: this.account.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        poolMint: this.spl.poolMint,
        poolTokensVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.state.reserveStake,
        managerFeeAccount: this.spl.state.managerFeeAccount,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        splStakePoolProgram: SPL_STAKE_POOL_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Returns a transaction to deposit a stake account to an SPL stake-pool.
   */
  public async depositStake(stakeAccount: PublicKey): Promise<Transaction> {
    if (!this.sunrise || !this.spl) {
      await this.refresh();
    }

    const stakeOwner = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
      this.sunrise.client.mintGsolAccounts(this.state, stakeOwner);

    const prov = new Provider(
      this.provider.connection,
      this.provider.wallet as Wallet,
      {}
    );
    const stakeAccountInfo = await MarinadeUtils.getParsedStakeAccountInfo(
      prov,
      stakeAccount
    );
    const validatorStakeAccount = stakeAccountInfo.voterAddress;
    if (!validatorStakeAccount) {
      throw new Error("Invalid validator account!");
    }

    const transaction = new Transaction();
    const stakerATA = await this.provider.connection.getAccountInfo(
      this.sunrise.stakerGsolATA
    );
    if (!stakerATA) {
      transaction.add(
        this.createTokenAccount(
          this.sunrise.stakerGsolATA,
          stakeOwner,
          gsolMint
        )
      );
    }

    const instruction = await this.program.methods
      .depositStake()
      .accounts({
        state: this.state,
        stakePool: this.stakePool,
        sunriseState: this.account.sunriseState,
        stakeOwner,
        stakeAccount,
        mintGsolTo: this.sunrise.stakerGsolATA,
        poolMint: this.spl.poolMint,
        poolTokensVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        validatorList: this.spl.state.validatorList,
        stakePoolDepositAuthority: this.spl.depositAuthority,
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.state.reserveStake,
        validatorStakeAccount,
        managerFeeAccount: this.spl.state.managerFeeAccount,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        splStakePoolProgram: SPL_STAKE_POOL_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
  }

  /**
   * Returns a transaction to withdraw from an SPL stake-pool into a new stake account
   */
  public async withdrawStake(
    amount: BN,
    newStakeAccount: PublicKey,
    gsolTokenAccount?: PublicKey
  ): Promise<Transaction> {
    if (!this.sunrise || !this.spl) {
      await this.refresh();
    }
    const withdrawer = this.provider.publicKey;
    const { gsolMint, instructionsSysvar, burnGsolFrom } =
      this.sunrise.client.burnGsolAccounts(
        this.state,
        withdrawer,
        gsolTokenAccount
      );

    const instruction = await this.program.methods
      .withdrawStake(amount)
      .accounts({
        state: this.state,
        stakePool: this.stakePool,
        sunriseState: this.account.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        newStakeAccount,
        poolMint: this.spl.poolMint,
        poolTokensVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        validatorStakeList: this.spl.state.validatorList,
        stakeAccountToSplit: this.spl.state.reserveStake,
        managerFeeAccount: this.spl.state.managerFeeAccount,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        splStakePoolProgram: SPL_STAKE_POOL_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to order a withdrawal from a spl stake-pool..
   * This is not a supported feature for SPL beams and will throw an error.
   */
  public orderWithdraw(lamports: BN): Promise<{
    tx: Transaction, sunriseTicket: Keypair, proxyTicket: Keypair
  }>{
    throw new Error("Delayed withdrawals are unimplemented for SPL beam");
  }

  /**
   * Return a transaction to redeem a ticket received from ordering a withdrawal.
   * This is not a supported feature for SPL beams and will throw an error.
   */
  public redeemTicket(sunriseTicket: PublicKey): Promise<Transaction> {
    throw new Error("Delayed withdrawals are unimplemented for SPL beam");
  }

  /**
   * A convenience method for calculating the price of the stake-pool's token.
   * NOTE: This might not give the current price is refresh() isn't called first.
   */
  public poolTokenPrice = async (): Promise<number> => {
    if (!this.spl) {
      await this.refresh();
    }

    const pool = this.spl.state;
    const price = Number(pool.totalLamports) / Number(pool.poolTokenSupply);
    return price;
  };

  /** Utility method to create a token account. */
  private createTokenAccount(
    account: PublicKey,
    owner: PublicKey,
    mint: PublicKey
  ): TransactionInstruction {
    return createAssociatedTokenAccountIdempotentInstruction(
      this.provider.publicKey,
      account,
      owner,
      mint
    );
  }

  /** Utility method to derive the SPL-beam address from its sunrise state and program ID. */
  public static deriveStateAddress = (
    sunriseState: PublicKey,
    programId?: PublicKey
  ): [PublicKey, number] => {
    const PID = programId ?? SPL_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunriseState);
  };
}
