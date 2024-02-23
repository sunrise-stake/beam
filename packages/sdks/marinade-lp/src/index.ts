import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
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
  deriveAuthorityAddress,
  MarinadeLpBeam,
  sendAndConfirmChecked,
} from "@sunrisestake/beams-common";
import { StateAccount } from "./state.js";
import {
  MARINADE_BEAM_PROGRAM_ID,
  MARINADE_FINANCE_PROGRAM_ID,
} from "./constants.js";
import { Balance, MarinadeLpClientParams, Utils } from "./utils.js";
import BN from "bn.js";
import { SunriseClient } from "@sunrisestake/beams-core";

/** An instance of the Sunrise program that acts as a proxy to Marinade-compatible
 * stake-pools.
 */
export class MarinadeLpClient extends BeamInterface<
  MarinadeLpBeam.MarinadeLpBeam,
  StateAccount
> {
  /** The address of the authority of this beam's token vaults*/
  readonly vaultAuthority: [PublicKey, number];

  private constructor(
    program: Program<MarinadeLpBeam.MarinadeLpBeam>,
    stateAddress: PublicKey,
    account: StateAccount, // The deserialized state account for this beam state
    readonly marinadeLp: MarinadeLpClientParams,
    readonly sunrise: SunriseClient,
  ) {
    super(program, stateAddress, account, [
      { kind: "sol-deposit" },
      { kind: "liquid-unstake" },
    ]);
    this.vaultAuthority = deriveAuthorityAddress(
      program.programId,
      stateAddress,
    );
  }

  /** Register a new state.*/
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    msolRecipientBeam: PublicKey,
    msolTokenAccount: PublicKey,
    programId = MARINADE_BEAM_PROGRAM_ID,
  ): Promise<MarinadeLpClient> {
    const program = new Program<MarinadeLpBeam.MarinadeLpBeam>(
      MarinadeLpBeam.IDL,
      programId,
      provider,
    );
    const stateAddress = Utils.deriveStateAddress(programId, sunriseState)[0];
    const marinadeLpClientParams = await Utils.getMarinadeLpClientParams(
      provider,
      programId,
      stateAddress,
    );
    const [vaultAuthority, vaultAuthorityBump] = deriveAuthorityAddress(
      programId,
      stateAddress,
    );

    const register = await program.methods
      .initialize({
        updateAuthority,
        marinadeState: marinadeLpClientParams.marinade.marinadeStateAddress,
        sunriseState,
        vaultAuthorityBump,
        msolRecipientBeam,
        msolTokenAccount,
      })
      .accounts({
        payer: provider.publicKey,
        state: stateAddress,
        liqPoolMint: marinadeLpClientParams.marinade.lpMint.address,
        liqPoolVault: marinadeLpClientParams.beamVault,
        vaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    await sendAndConfirmChecked(provider, register, [], {
      commitment: "confirmed",
    });

    return MarinadeLpClient.get(provider, stateAddress, programId);
  }

  public static async get(
    provider: AnchorProvider,
    stateAddress: PublicKey,
    programId = MARINADE_BEAM_PROGRAM_ID,
  ) {
    const program = new Program<MarinadeLpBeam.MarinadeLpBeam>(
      MarinadeLpBeam.IDL,
      programId,
      provider,
    );
    const idlState = await program.account.state.fetch(stateAddress);
    const account = StateAccount.fromIdlAccount(idlState, stateAddress);

    const sunriseClientPromise = SunriseClient.get(
      provider,
      account.sunriseState,
    );
    const marinadeLpClientParamsPromise = Utils.getMarinadeLpClientParams(
      provider,
      programId,
      stateAddress,
    );

    const marinadeLpClientParams = await marinadeLpClientParamsPromise;
    const sunriseClient = await sunriseClientPromise;

    return new MarinadeLpClient(
      program,
      stateAddress,
      account,
      marinadeLpClientParams,
      sunriseClient,
    );
  }

  /**
   * Query on-chain data for the most recent account state.
   */
  public refresh(): Promise<this> {
    return MarinadeLpClient.get(
      this.provider,
      this.stateAddress,
      this.program.programId,
    ) as Promise<this>;
  }

  /** Return a transaction to update this beam's parameters. */
  public update(
    currentUpdateAuthority: PublicKey,
    updateParams: {
      [Property in keyof Omit<
        StateAccount,
        "pretty" | "proxyState" | "address"
      >]: StateAccount[Property];
    } & { marinadeState: PublicKey },
  ): Promise<Transaction> {
    return this.program.methods
      .update(updateParams)
      .accounts({
        updateAuthority: currentUpdateAuthority,
        state: this.stateAddress,
      })
      .transaction();
  }

  /** Return a transaction to deposit to a marinade liquidity pool. */
  public async deposit(
    lamports: BN,
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
      .deposit(lamports)
      .accounts({
        state: this.stateAddress,
        marinadeState: this.state.proxyState,
        sunriseState: this.state.sunriseState,
        depositor,
        mintGsolTo: gsolATA,
        liqPoolMint: this.marinadeLp.marinade.lpMint.address,
        liqPoolTokenVault: this.marinadeLp.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        sysvarInstructions,
        liqPoolSolLegPda: await this.marinadeLp.marinade.solLeg(),
        liqPoolMsolLeg: this.marinadeLp.marinade.mSolLeg,
        liqPoolMsolLegAuthority:
          await this.marinadeLp.marinade.mSolLegAuthority(),
        liqPoolMintAuthority: await this.marinadeLp.marinade.lpMintAuthority(),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        sunriseProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
  }

  public depositStake(): Promise<Transaction> {
    throw new Error(
      "Deposit-stake-account is unimplemented for marinade-lp beam.", // TODO
    );
  }

  /** Return a transaction to withdraw from a marinade liquidity-pool. */
  public async withdraw(
    lamports: BN,
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
      .withdraw(lamports)
      .accounts({
        state: this.stateAddress,
        marinadeState: this.state.proxyState,
        sunriseState: this.state.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        liqPoolMint: this.marinadeLp.marinade.lpMint.address,
        liqPoolTokenVault: this.marinadeLp.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        transferMsolTo: this.state.msolTokenAccount,
        liqPoolSolLegPda: await this.marinadeLp.marinade.solLeg(),
        liqPoolMsolLeg: this.marinadeLp.marinade.mSolLeg,
        liqPoolMsolLegAuthority:
          await this.marinadeLp.marinade.mSolLegAuthority(),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        gsolMint,
        sysvarInstructions,
        sunriseProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to order a delayed withdrawal from a marinade liquidity-pool.
   * NOTE: This is not a supported feature for Marinade Lps and will throw an error.
   */
  public orderWithdraw(): Promise<{
    tx: Transaction;
    sunriseTicket: Keypair;
    proxyTicket: Keypair;
  }> {
    throw new Error(
      "Delayed withdrawals are unimplemented for Marinade-lp beam",
    );
  }

  /**
   * Return a transaction to burn gsol. This is essentially a "donation" to the sunrise instance
   */
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

  // Update this beam's extractable yield in the core state's epoch report
  public async updateEpochReport(): Promise<Transaction> {
    const accounts = {
      state: this.stateAddress,
      marinadeState: this.state.proxyState,
      sunriseState: this.state.sunriseState,
      liqPoolMint: this.marinadeLp.marinade.lpMint.address,
      liqPoolTokenVault: this.marinadeLp.beamVault,
      vaultAuthority: this.vaultAuthority[0],
      transferMsolTo: this.state.msolTokenAccount,
      liqPoolSolLegPda: await this.marinadeLp.marinade.solLeg(),
      liqPoolMsolLeg: this.marinadeLp.marinade.mSolLeg,
      liqPoolMsolLegAuthority:
        await this.marinadeLp.marinade.mSolLegAuthority(),
      systemProgram: SystemProgram.programId,
      tokenProgram: TOKEN_PROGRAM_ID,
      gsolMint: this.sunrise.state.gsolMint,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      sunriseProgram: this.sunrise.program.programId,
    };
    const instruction = await this.program.methods
      .updateEpochReport()
      .accounts(accounts)
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to extract any yield from this beam into the yield account
   */
  public async extractYield(): Promise<Transaction> {
    const accounts = {
      state: this.stateAddress,
      marinadeState: this.state.proxyState,
      sunriseState: this.state.sunriseState,
      msolMint: this.marinadeLp.marinade.mSolMint.address,
      msolVault: this.state.msolTokenAccount,
      vaultAuthority: this.vaultAuthority[0],
      liqPoolSolLegPda: await this.marinadeLp.marinade.solLeg(),
      liqPoolMsolLeg: this.marinadeLp.marinade.mSolLeg,
      treasuryMsolAccount: this.marinadeLp.marinade.treasuryMsolAccount,
      yieldAccount: this.sunrise.state.yieldAccount,
      sysvarInstructions: SYSVAR_INSTRUCTIONS_PUBKEY,
      sysvarClock: SYSVAR_CLOCK_PUBKEY,
      sunriseProgram: this.sunrise.program.programId,
      marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
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
   * Return a transaction to redeem a ticket received from ordering a withdrawal from a marinade-lp.
   * NOTE: This is not a supported feature for Marinade Lps and will throw an error.
   */
  public redeemTicket(): Promise<Transaction> {
    throw new Error(
      "Delayed withdrawals are unimplemented for Marinade-lp beams",
    );
  }

  /**
   * Utility method to create a token account.
   */
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

  /**
   * Utility method to derive the Marinade-beam address from its sunrise state and program ID.
   */
  public static deriveStateAddress = (
    sunrise: PublicKey,
    programId?: PublicKey,
  ): [PublicKey, number] => {
    const PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunrise);
  };

  private poolSolBalance = async (): Promise<number> => {
    const lpSolLeg = await this.marinadeLp.marinade.solLeg();
    const lpSolLegBalance = await this.provider.connection.getBalance(lpSolLeg);
    const rentExemptReserveForTokenAccount = 2039280;
    return lpSolLegBalance - rentExemptReserveForTokenAccount;
  };

  public proportionOfPool = async (lamports: BN): Promise<number> => {
    const solBalance = await this.poolSolBalance();
    return Number(lamports) / Number(solBalance);
  };

  public poolTokenSupply = async (): Promise<BN> => {
    const lpMintInfo = await this.marinadeLp.marinade.lpMint.mintInfo();
    return new BN("" + lpMintInfo.supply);
  };

  public msolLegBalance = async (): Promise<BN> => {
    const lpMsolLeg = this.marinadeLp.marinade.mSolLeg;
    const lpMsolLegBalance =
      await this.provider.connection.getTokenAccountBalance(lpMsolLeg);
    return new BN(lpMsolLegBalance.value.amount);
  };

  /**
   * A convenience method for calculating the price of the stake-pool's token in Lamports
   * NOTE: This might not give the current price is refresh() isn't called first.
   */
  public poolTokenPrice = async () => {
    const lpMintInfo = await this.marinadeLp.marinade.lpMint.mintInfo();
    const lpSupply = lpMintInfo.supply;
    const solBalance = await this.poolSolBalance();

    const lpMsolLegBalance = await this.msolLegBalance();

    const msolPrice = this.marinadeLp.marinade.mSolPrice;

    const msolValue = lpMsolLegBalance.toNumber() * msolPrice;

    return (solBalance + msolValue) / Number(lpSupply);
  };

  /**
   * Calculate the value of the stake-pool's token in SOL and mSOL
   * @param lpTokens
   */
  public async calculateBalanceFromLpTokens(lpTokens: BN): Promise<Balance> {
    const totalSupply = await this.poolTokenSupply();
    const proportionOfPool = lpTokens.toNumber() / totalSupply.toNumber();
    const solBalance = await this.poolSolBalance();
    const msolLegBalance = await this.msolLegBalance();

    const solValue = solBalance * proportionOfPool;
    const msolValue = msolLegBalance.toNumber() * proportionOfPool;

    console.log("calculateBalanceFromLpTokens", {
      lpTokens: lpTokens.toNumber(),
      totalSupply: totalSupply.toNumber(),
      proportionOfPool,
      solBalance,
      msolLegBalance: msolLegBalance.toNumber(),
      solValue,
      msolValue,
    });

    return {
      lamports: new BN(solValue),
      msolLamports: new BN(msolValue),
    };
  }
}
