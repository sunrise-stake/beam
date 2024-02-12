import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  StakeProgram,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
  TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import {
  BeamInterface,
  getParsedStakeAccountInfo,
  sendAndConfirmChecked,
  SPL_STAKE_POOL_PROGRAM_ID,
  SplBeam,
} from "@sunrisestake/beams-common";
import { StateAccount } from "./state.js";
import { SPL_BEAM_PROGRAM_ID } from "./constants.js";
import { SplClientParams, Utils } from "./utils.js";
import BN from "bn.js";
import { SunriseClient } from "@sunrisestake/beams-core";

/** An instance of the Sunrise program that acts as a proxy to SPL-compatible
 * stake-pools.
 */
export class SplClient extends BeamInterface<SplBeam.SplBeam, StateAccount> {
  /** The address of the authority of this beam's token vaults*/
  readonly vaultAuthority: [PublicKey, number];
  /** Fields that depend on the stake-pool state. */
  private constructor(
    program: Program<SplBeam.SplBeam>,
    stateAddress: PublicKey,
    account: StateAccount, // The deserialized state account for this beam state
    readonly spl: SplClientParams,
    readonly sunrise: SunriseClient,
  ) {
    super(program, stateAddress, account, [
      { kind: "sol-deposit" },
      { kind: "stake-deposit" }, // unimplemented.
      { kind: "liquid-unstake" },
      { kind: "stake-withdrawal" },
    ]);
    this.vaultAuthority = Utils.deriveAuthorityAddress(
      program.programId,
      stateAddress,
    );
  }

  /** Fetch an instance for an existing state account.*/
  public static async get(
    provider: AnchorProvider,
    stateAddress: PublicKey,
    programId = SPL_BEAM_PROGRAM_ID,
  ): Promise<SplClient> {
    const program = new Program<SplBeam.SplBeam>(
      SplBeam.IDL,
      programId,
      provider,
    );
    const idlState = await program.account.state.fetch(stateAddress);
    const state = StateAccount.fromIdlAccount(idlState, stateAddress);
    const sunriseClientPromise = SunriseClient.get(
      provider,
      state.sunriseState,
    );
    const splClientParamsPromise = Utils.getSplClientParams(
      provider,
      programId,
      stateAddress,
      state.proxyState,
    );

    const splClientParams = await splClientParamsPromise;
    const sunriseClient = await sunriseClientPromise;

    return new SplClient(
      program,
      stateAddress,
      state,
      splClientParams,
      sunriseClient,
    );
  }

  /**
   * Register a new state.
   */
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    stakePool: PublicKey,
    programId = SPL_BEAM_PROGRAM_ID,
  ): Promise<SplClient> {
    const program = new Program<SplBeam.SplBeam>(
      SplBeam.IDL,
      programId,
      provider,
    );
    const stateAddress = Utils.deriveStateAddress(
      programId,
      sunriseState,
      stakePool,
    )[0];

    const splClientParams = await Utils.getSplClientParams(
      provider,
      programId,
      stateAddress,
      stakePool,
    );

    const [vaultAuthority, vaultAuthorityBump] = Utils.deriveAuthorityAddress(
      programId,
      stateAddress,
    );

    const register = await program.methods
      .initialize({
        updateAuthority,
        stakePool,
        sunriseState,
        vaultAuthorityBump,
      })
      .accounts({
        payer: provider.publicKey,
        state: stateAddress,
        poolMint: splClientParams.stakePoolState.poolMint,
        poolTokenVault: splClientParams.beamVault,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    await sendAndConfirmChecked(provider, register, [], {
      commitment: "confirmed",
    });
    return SplClient.get(provider, stateAddress, programId);
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
    } & { stakePool: PublicKey },
  ): Promise<Transaction> {
    return this.program.methods
      .update(updateParams)
      .accounts({
        updateAuthority: currentUpdateAuthority,
        state: this.stateAddress,
      })
      .transaction();
  }

  /**
   * Query on-chain data for the most recent account state.
   */
  public refresh(): Promise<this> {
    return SplClient.get(
      this.provider,
      this.stateAddress,
      this.program.programId,
    ) as Promise<this>;
  }

  /** Return a transaction to deposit to an SPL stake-pool.
   * @param amount
   * @param recipient
   */
  public async deposit(
    amount: BN,
    recipient?: PublicKey,
  ): Promise<Transaction> {
    const depositor = this.provider.publicKey;

    const { gsolMint, gsolMintAuthority, sysvarInstructions } =
      this.sunrise.mintGsolAccounts(this.stateAddress, depositor);

    const transaction = new Transaction();
    const gsolOwner = recipient ?? depositor;
    const gsolATA = getAssociatedTokenAddressSync(gsolMint, gsolOwner);
    const account = await this.provider.connection.getAccountInfo(gsolATA);
    if (!account) {
      transaction.add(this.createTokenAccount(gsolATA, gsolOwner, gsolMint));
    }

    const instruction = await this.program.methods
      .deposit(amount)
      .accounts({
        state: this.stateAddress,
        stakePool: this.spl.stakePoolAddress,
        sunriseState: this.state.sunriseState,
        depositor,
        mintGsolTo: gsolATA,
        poolMint: this.spl.stakePoolState.poolMint,
        poolTokenVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.stakePoolState.reserveStake,
        managerFeeAccount: this.spl.stakePoolState.managerFeeAccount,
        gsolMint,
        gsolMintAuthority,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
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
    gsolTokenAccount?: PublicKey,
  ): Promise<Transaction> {
    const withdrawer = this.provider.publicKey;
    const { gsolMint, sysvarInstructions, burnGsolFrom } =
      this.sunrise.burnGsolAccounts(
        this.stateAddress,
        withdrawer,
        gsolTokenAccount,
      );

    const instruction = await this.program.methods
      .withdraw(amount)
      .accounts({
        state: this.stateAddress,
        stakePool: this.spl.stakePoolAddress,
        sunriseState: this.state.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        poolMint: this.spl.stakePoolState.poolMint,
        poolTokenVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.stakePoolState.reserveStake,
        managerFeeAccount: this.spl.stakePoolState.managerFeeAccount,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
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
  public async depositStake(
    stakeAccount: PublicKey,
    recipient?: PublicKey,
  ): Promise<Transaction> {
    const stakeOwner = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, sysvarInstructions } =
      this.sunrise.mintGsolAccounts(this.stateAddress, stakeOwner);

    const stakeAccountInfo = await getParsedStakeAccountInfo(
      this.provider,
      stakeAccount,
    );
    const validatorStakeAccount = stakeAccountInfo.voterAddress;
    if (!validatorStakeAccount) {
      throw new Error("Invalid validator account!");
    }

    const transaction = new Transaction();
    const gsolOwner = recipient ?? stakeOwner;
    const gsolATA = getAssociatedTokenAddressSync(gsolMint, gsolOwner);
    const account = await this.provider.connection.getAccountInfo(gsolATA);
    if (!account) {
      transaction.add(this.createTokenAccount(gsolATA, gsolOwner, gsolMint));
    }

    const instruction = await this.program.methods
      .depositStake()
      .accounts({
        state: this.stateAddress,
        stakePool: this.spl.stakePoolAddress,
        sunriseState: this.state.sunriseState,
        stakeOwner,
        stakeAccount,
        mintGsolTo: gsolATA,
        poolMint: this.spl.stakePoolState.poolMint,
        poolTokenVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        validatorList: this.spl.stakePoolState.validatorList,
        stakePoolDepositAuthority: this.spl.depositAuthority,
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        reserveStakeAccount: this.spl.stakePoolState.reserveStake,
        validatorStakeAccount,
        managerFeeAccount: this.spl.stakePoolState.managerFeeAccount,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        gsolMintAuthority,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
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
    gsolTokenAccount?: PublicKey,
  ): Promise<Transaction> {
    const withdrawer = this.provider.publicKey;
    const { gsolMint, sysvarInstructions, burnGsolFrom } =
      this.sunrise.burnGsolAccounts(
        this.stateAddress,
        withdrawer,
        gsolTokenAccount,
      );

    const instruction = await this.program.methods
      .withdrawStake(amount)
      .accounts({
        state: this.stateAddress,
        stakePool: this.spl.stakePoolAddress,
        sunriseState: this.state.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        newStakeAccount,
        poolMint: this.spl.stakePoolState.poolMint,
        poolTokenVault: this.spl.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
        validatorStakeList: this.spl.stakePoolState.validatorList,
        stakeAccountToSplit: this.spl.stakePoolState.reserveStake,
        managerFeeAccount: this.spl.stakePoolState.managerFeeAccount,
        sysvarClock: SYSVAR_CLOCK_PUBKEY,
        sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
        nativeStakeProgram: StakeProgram.programId,
        gsolMint,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
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
    tx: Transaction;
    sunriseTicket: Keypair;
    proxyTicket: Keypair;
  }> {
    throw new Error(
      `Delayed withdrawals are unimplemented for SPL beam. Requested: ${lamports}`,
    ); // TODO
  }

  public async burnGSol(
    lamports: BN,
    gsolTokenAccount?: PublicKey,
  ): Promise<Transaction> {
    const burner = this.provider.publicKey;
    const { gsolMint, sysvarInstructions, burnGsolFrom } =
      this.sunrise.burnGsolAccounts(
        this.stateAddress,
        burner,
        gsolTokenAccount,
      );

    const instruction = await this.program.methods
      .burn(lamports)
      .accounts({
        state: this.stateAddress,
        sunriseState: this.state.sunriseState,
        stakePool: this.spl.stakePoolAddress,
        burner,
        gsolTokenAccount: burnGsolFrom,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        gsolMint,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to extract any yield from this beam into the yield account
   */
  public async extractYield(): Promise<Transaction> {
    const [newStakeAccount] = Utils.deriveExtractYieldStakeAccount(
      this.program.programId,
      this.stateAddress,
    );

    const accounts = {
      state: this.stateAddress,
      stakePool: this.spl.stakePoolAddress,
      sunriseState: this.state.sunriseState,
      poolMint: this.spl.stakePoolState.poolMint,
      yieldAccount: this.sunrise.state.yieldAccount,
      newStakeAccount,
      vaultAuthority: this.vaultAuthority[0],
      poolTokenVault: this.spl.beamVault,
      stakePoolWithdrawAuthority: this.spl.withdrawAuthority,
      validatorStakeList: this.spl.stakePoolState.validatorList,
      stakeAccountToSplit: this.spl.stakePoolState.reserveStake,
      managerFeeAccount: this.spl.stakePoolState.managerFeeAccount,
      sysvarClock: SYSVAR_CLOCK_PUBKEY,
      nativeStakeProgram: StakeProgram.programId,
      sysvarStakeHistory: SYSVAR_STAKE_HISTORY_PUBKEY,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      sunriseProgram: this.sunrise.program.programId,
      splStakePoolProgram: SPL_STAKE_POOL_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
    const instruction = await this.program.methods
      .extractYield()
      .accounts(accounts)
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to redeem a ticket received from ordering a withdrawal.
   * This is not a supported feature for SPL beams and will throw an error.
   */
  public redeemTicket(sunriseTicket: PublicKey): Promise<Transaction> {
    throw new Error(
      `Delayed withdrawals are unimplemented for SPL beam. Requested: ${sunriseTicket}`,
    ); // TODO
  }

  /**
   * A convenience method for calculating the price of the stake-pool's token.
   * NOTE: This might not give the current price is refresh() isn't called first.
   */
  public poolTokenPrice = async (): Promise<number> => {
    const pool = this.spl.stakePoolState;
    return Number(pool.totalLamports) / Number(pool.poolTokenSupply);
  };

  /** Utility method to create a token account. */
  private createTokenAccount(
    account: PublicKey,
    owner: PublicKey,
    mint: PublicKey,
  ): TransactionInstruction {
    return createAssociatedTokenAccountIdempotentInstruction(
      this.provider.publicKey,
      account,
      owner,
      mint,
    );
  }

  /** Utility method to derive the SPL-beam address from the sunrise state, the stake pool and program ID. */
  public static deriveStateAddress(
    sunriseState: PublicKey,
    stakePool: PublicKey,
    programId?: PublicKey,
  ): [PublicKey, number] {
    const PID = programId ?? SPL_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunriseState, stakePool);
  }

  public get yieldStakeAccount() {
    return Utils.deriveExtractYieldStakeAccount(
      this.program.programId,
      this.stateAddress,
    )[0];
  }

  public async details() {
    const balance = await this.provider.connection.getTokenAccountBalance(
      this.spl.beamVault,
    );

    return {
      stateAddress: this.stateAddress,
      stakePoolAddress: this.spl.stakePoolAddress,
      stakePoolState: this.spl.stakePoolState,
      poolMint: this.spl.stakePoolState.poolMint,
      beamVault: this.spl.beamVault,
      withdrawAuthority: this.spl.withdrawAuthority,
      depositAuthority: this.spl.depositAuthority,
      vaultAuthority: this.vaultAuthority,
      sunriseState: this.state.sunriseState,
      poolTokenSupply: this.spl.stakePoolState.poolTokenSupply,
      totalLamports: this.spl.stakePoolState.totalLamports,
      balance,
    };
  }
}
