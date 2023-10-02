import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  type TransactionInstruction,
  SystemProgram,
  Keypair,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  MarinadeLpBeam,
  BeamInterface,
  deriveAuthorityAddress,
} from "@sunrisestake/beams-common";
import { StateAccount } from "./state.js";
import {
  MARINADE_BEAM_PROGRAM_ID,
  MARINADE_FINANCE_PROGRAM_ID,
} from "./constants.js";
import { MarinadeLpClientParams, Utils } from "./utils.js";
import BN from "bn.js";
import { SunriseClient } from "@sunrisestake/beams-sunrise";

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
    treasury: PublicKey,
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
        treasury,
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

    await provider.sendAndConfirm(register, [], {
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
    amount: BN,
    recipient?: PublicKey,
  ): Promise<Transaction> {
    const depositor = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
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
        marinadeState: this.state.proxyState,
        sunriseState: this.state.sunriseState,
        depositor,
        mintGsolTo: gsolATA,
        liqPoolMint: this.marinadeLp.marinade.lpMint.address,
        liqPoolTokenVault: this.marinadeLp.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        liqPoolSolLegPda: await this.marinadeLp.marinade.solLeg(),
        liqPoolMsolLeg: this.marinadeLp.marinade.mSolLeg,
        liqPoolMsolLegAuthority:
          await this.marinadeLp.marinade.mSolLegAuthority(),
        liqPoolMintAuthority: await this.marinadeLp.marinade.lpMintAuthority(),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        beamProgram: this.sunrise.program.programId,
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
    amount: BN,
    gsolTokenAccount?: PublicKey,
  ): Promise<Transaction> {
    if (!this.sunrise || !this.marinadeLp) {
      await this.refresh();
    }
    const withdrawer = this.provider.publicKey;
    const { gsolMint, instructionsSysvar, burnGsolFrom } =
      this.sunrise.burnGsolAccounts(
        this.stateAddress,
        withdrawer,
        gsolTokenAccount,
      );

    const instruction = await this.program.methods
      .withdraw(amount)
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
        instructionsSysvar,
        beamProgram: this.sunrise.program.programId,
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

  /**
   * A convenience method for calculating the price of the stake-pool's token.
   * NOTE: This might not give the current price is refresh() isn't called first.
   */
  public poolTokenPrice = async () => {
    const lpMintInfo = await this.marinadeLp.marinade.lpMint.mintInfo();
    const lpSupply = lpMintInfo.supply;
    const lpSolLeg = await this.marinadeLp.marinade.solLeg();
    const lpSolLegBalance = await this.provider.connection.getBalance(lpSolLeg);
    const rentExemptReserveForTokenAccount = 2039280;
    const solBalance = lpSolLegBalance - rentExemptReserveForTokenAccount;

    const lpMsolLeg = this.marinadeLp.marinade.mSolLeg;
    const lpMsolLegBalance =
      await this.provider.connection.getTokenAccountBalance(lpMsolLeg);

    const msolPrice = this.marinadeLp.marinade.mSolPrice;

    const msolValue = Number(lpMsolLegBalance.value.amount) * msolPrice;

    const lpPrice = (solBalance + msolValue) / Number(lpSupply);

    return lpPrice;
  };
}
