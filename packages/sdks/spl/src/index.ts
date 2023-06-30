import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
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
import { BeamInterface, BeamCapability } from "../../sunrise/src/beamInterface";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";

import {
  MarinadeUtils,
  Provider,
  type Wallet,
} from "@sunrisestake/marinade-ts-sdk";

/** The marinade beam client */
export class SplClient implements BeamInterface {
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

  spl:
    | {
        state: StakePool;
        poolMint: PublicKey;
        beamVault: PublicKey;
        withdrawAuthority: PublicKey;
        depositAuthority: PublicKey;
      }
    | undefined;

  sunrise:
    | {
        client: SunriseClient;
        gsol: PublicKey;
        stakerGsolATA: PublicKey;
      }
    | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    state: PublicKey,
    programId: PublicKey,
    stakePool?: PublicKey
  ) {
    this.program = new Program<SplBeam>(IDL, programId, provider);
    this.state = state;
    this.vaultAuthority = Utils.deriveAuthorityAddress(programId, state);
    this.caps = [
      { kind: "sol-deposit" },
      { kind: "stake-deposit" }, // unimplemented.
      { kind: "liquid-unstake" },
      { kind: "stake-withdrawal" },
    ];
    this.stakePool = stakePool ?? BLAZE_STAKE_POOL;
  }

  /** Registers a new state.*/
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    treasury: PublicKey,
    programId?: PublicKey,
    splStakePool?: PublicKey
  ): Promise<SplClient> {
    let PID = programId ?? SPL_BEAM_PROGRAM_ID;
    const state = Utils.deriveStateAddress(PID, sunriseState)[0];

    const client = await this.get(state, provider, PID, splStakePool, true);
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

  /** Get a new MarinadeBeamClient instance*/
  public static async get(
    state: PublicKey,
    provider: AnchorProvider,
    programId?: PublicKey,
    stakePool?: PublicKey,
    refreshOverride?: boolean
  ): Promise<SplClient> {
    const client = new SplClient(
      provider,
      state,
      programId ?? SPL_STAKE_POOL_PROGRAM_ID,
      stakePool
    );
    if (refreshOverride === undefined || refreshOverride === false) {
      await client.refresh();
    }
    return client;
  }

  /** Query on-chain data for the most recent account state. */
  public async refresh(): Promise<void> {
    const idlState = await this.program.account.state.fetch(this.state);
    this.account = StateAccount.fromIdlAccount(idlState, this.state);

    const state = await getStakePoolAccount(
      this.provider.connection,
      this.stakePool
    );
    this.spl = {
      state,
      poolMint: state.poolMint,
      beamVault: getAssociatedTokenAddressSync(
        state.poolMint,
        this.vaultAuthority[0],
        true
      ),
      withdrawAuthority: PublicKey.findProgramAddressSync(
        [this.stakePool.toBuffer(), Buffer.from("withdraw")],
        SPL_STAKE_POOL_PROGRAM_ID
      )[0],
      depositAuthority: PublicKey.findProgramAddressSync(
        [this.stakePool.toBuffer(), Buffer.from("deposit")],
        SPL_STAKE_POOL_PROGRAM_ID
      )[0],
    };

    const sunriseClient = await this.getSunrise();
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

  private async getSunrise(): Promise<SunriseClient> {
    if (this.account === undefined) {
      throw new Error("refresh() not called");
    }
    return SunriseClient.get(this.account.sunriseState, this.provider);
  }

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
        sunriseState: this.account.proxyState,
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

  public orderWithdraw(amount: BN) {
    throw new Error("Delayed withdrawals are unimplemented for Spl beams");
  }

  public redeemTicket() {
    throw new Error("Delayed withdrawals are unimplemented for Spl beams");
  }

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

  public static deriveStateAddress = (
    sunrise: PublicKey,
    programId?: PublicKey
  ): [PublicKey, number] => {
    const PID = programId ?? SPL_STAKE_POOL_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunrise);
  };
}
