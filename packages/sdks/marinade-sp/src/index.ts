import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Keypair,
  Transaction,
  type TransactionInstruction,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  StakeProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  MarinadeBeam,
  BeamInterface,
  deriveAuthorityAddress,
  sendAndConfirmChecked,
} from "@sunrisestake/beams-common";
import { StateAccount } from "./state.js";
import {
  MARINADE_BEAM_PROGRAM_ID,
  MARINADE_FINANCE_PROGRAM_ID,
} from "./constants.js";
import { MarinadeClientParams, Utils } from "./utils.js";
import {
  MarinadeUtils,
  Provider,
  type Wallet,
} from "@sunrisestake/marinade-ts-sdk";
import BN from "bn.js";
import { SunriseClient } from "@sunrisestake/beams-core";
/** An instance of the Sunrise program that acts as a proxy to
 * marinade-compatible stake-pools.
 */
export class MarinadeClient extends BeamInterface<
  MarinadeBeam.MarinadeBeam,
  StateAccount
> {
  /** The address of the authority of this beam's token vaults*/
  readonly vaultAuthority: [PublicKey, number];

  private constructor(
    program: Program<MarinadeBeam.MarinadeBeam>,
    stateAddress: PublicKey,
    account: StateAccount, // The deserialized state account for this beam state
    readonly marinade: MarinadeClientParams,
    readonly sunrise: SunriseClient,
  ) {
    super(program, stateAddress, account, [
      { kind: "sol-deposit" },
      { kind: "stake-deposit" },
      { kind: "order-unstake" },
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
    programId = MARINADE_BEAM_PROGRAM_ID,
  ): Promise<MarinadeClient> {
    const program = new Program<MarinadeBeam.MarinadeBeam>(
      MarinadeBeam.IDL,
      programId,
      provider,
    );
    const stateAddress = Utils.deriveStateAddress(programId, sunriseState)[0];
    const marinadeClientParams = await Utils.getMarinadeClientParams(
      provider,
      programId,
      stateAddress,
    );
    const [msolVaultAuthority, vaultAuthorityBump] =
      Utils.deriveAuthorityAddress(programId, stateAddress);

    const marinadeState = marinadeClientParams.state.marinadeStateAddress;
    const msolMint = marinadeClientParams.state.mSolMint.address;
    const msolVault = marinadeClientParams.beamMsolVault;

    const register = await program.methods
      .initialize({
        updateAuthority,
        marinadeState,
        sunriseState,
        vaultAuthorityBump,
      })
      .accounts({
        payer: provider.publicKey,
        state: stateAddress,
        msolMint,
        msolVault,
        msolVaultAuthority,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      })
      .transaction();

    await sendAndConfirmChecked(provider, register, [], {
      commitment: "confirmed",
    });
    return MarinadeClient.get(provider, stateAddress, programId);
  }

  /** Fetch an existing state account and create a client from it. */
  public static async get(
    provider: AnchorProvider,
    stateAddress: PublicKey,
    programId = MARINADE_BEAM_PROGRAM_ID,
  ) {
    const program = new Program<MarinadeBeam.MarinadeBeam>(
      MarinadeBeam.IDL,
      programId,
      provider,
    );
    const idlState = await program.account.state.fetch(stateAddress);
    const account = StateAccount.fromIdlAccount(idlState, stateAddress);

    const sunriseClientPromise = SunriseClient.get(
      provider,
      account.sunriseState,
    );
    const marinadeClientParamsPromise = Utils.getMarinadeClientParams(
      provider,
      programId,
      stateAddress,
    );

    const marinadeClientParams = await marinadeClientParamsPromise;
    const sunriseClient = await sunriseClientPromise;

    return new MarinadeClient(
      program,
      stateAddress,
      account,
      marinadeClientParams,
      sunriseClient,
    );
  }

  /** Query on-chain data for the most recent account state. */
  public refresh(): Promise<this> {
    return MarinadeClient.get(
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

  /** Return a transaction to deposit to a marinade stake pool. */
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
        msolMint: this.marinade.state.mSolMint.address,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        liqPoolSolLegPda: await this.marinade.state.solLeg(),
        liqPoolMsolLeg: this.marinade.state.mSolLeg,
        liqPoolMsolLegAuthority: await this.marinade.state.mSolLegAuthority(),
        msolMintAuthority: await this.marinade.state.mSolMintAuthority(),
        reservePda: await this.marinade.state.reserveAddress(),
        beamProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
  }

  /** Return a transaction to withdraw from a marinade stake-pool. */
  public async withdraw(
    amount: BN,
    gsolTokenAccount?: PublicKey,
  ): Promise<Transaction> {
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
        gsolMint,
        msolMint: this.marinade.state.mSolMint.address,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        liqPoolSolLegPda: await this.marinade.state.solLeg(),
        liqPoolMsolLeg: this.marinade.state.mSolLeg,
        treasuryMsolAccount: this.marinade.state.treasuryMsolAccount,
        instructionsSysvar,
        beamProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  /**
   * Return a transaction to order a delayed withdrawal from a marinade pool.
   */
  public async orderWithdraw(
    lamports: BN,
    gsolTokenAccount?: PublicKey,
  ): Promise<{
    tx: Transaction;
    sunriseTicket: Keypair;
    proxyTicket: Keypair;
  }> {
    const withdrawer = this.provider.publicKey;
    const { gsolMint, instructionsSysvar, burnGsolFrom } =
      this.sunrise.burnGsolAccounts(
        this.stateAddress,
        withdrawer,
        gsolTokenAccount,
      );

    const sunriseTicket = Keypair.generate();
    const marinadeTicket = Keypair.generate();

    // https://github.com/marinade-finance/marinade-ts-sdk/blob/eb6936533c4e8ab29f4339e1393ff2db233bd266/src/marinade-state/borsh/ticket-account.ts#L3C14-L3C54
    const TICKET_ACCOUNT_SIZE = 8 + 2 * 32 + 2 * 8;
    // https://github.com/marinade-finance/marinade-ts-sdk/blob/eb6936533c4e8ab29f4339e1393ff2db233bd266/src/marinade.ts#L694
    const rent =
      await this.provider.connection.getMinimumBalanceForRentExemption(
        TICKET_ACCOUNT_SIZE,
      );
    const initMarinadeTicket = SystemProgram.createAccount({
      fromPubkey: this.provider.publicKey,
      newAccountPubkey: marinadeTicket.publicKey,
      lamports: rent,
      space: TICKET_ACCOUNT_SIZE,
      programId: this.marinade.state.marinadeFinanceProgramId,
    });

    const instruction = await this.program.methods
      .orderWithdrawal(lamports)
      .accounts({
        state: this.stateAddress,
        marinadeState: this.state.proxyState,
        sunriseState: this.state.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        gsolMint,
        msolMint: this.marinade.state.mSolMint.address,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        instructionsSysvar,
        newTicketAccount: marinadeTicket.publicKey,
        proxyTicketAccount: sunriseTicket.publicKey,
        beamProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
        rent: SYSVAR_RENT_PUBKEY,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .preInstructions([initMarinadeTicket])
      .instruction();

    return {
      tx: new Transaction().add(initMarinadeTicket, instruction),
      sunriseTicket,
      proxyTicket: marinadeTicket,
    };
  }

  /**
   * Return a transaction to redeem a ticket gotten from ordering a withdrawal.
   */
  public async redeemTicket(ticketAccount: PublicKey): Promise<Transaction> {
    const ticketAccountInfo =
      await this.program.account.proxyTicket.fetch(ticketAccount);

    return this.program.methods
      .redeemTicket()
      .accounts({
        state: this.stateAddress,
        marinadeState: this.state.proxyState,
        beneficiary: ticketAccountInfo.beneficiary,
        sunriseTicketAccount: ticketAccount,
        marinadeTicketAccount: ticketAccountInfo.marinadeTicketAccount,
        reservePda: await this.marinade.state.reserveAddress(),
        vaultAuthority: this.vaultAuthority[0],
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        clock: SYSVAR_CLOCK_PUBKEY,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  /** Returns a transaction to deposit a stake account to a marinade stake-pool. */
  public async depositStake(
    stakeAccount: PublicKey,
    recipient?: PublicKey,
  ): Promise<Transaction> {
    const stakeOwner = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
      this.sunrise.mintGsolAccounts(this.stateAddress, stakeOwner);

    const transaction = new Transaction();
    const gsolOwner = recipient ?? stakeOwner;
    const gsolATA = getAssociatedTokenAddressSync(gsolMint, gsolOwner);
    const account = await this.provider.connection.getAccountInfo(gsolATA);
    if (!account) {
      transaction.add(this.createTokenAccount(gsolATA, gsolOwner, gsolMint));
    }

    const prov = new Provider(
      this.provider.connection,
      this.provider.wallet as Wallet,
      {},
    );
    const stakeAccountInfo = await MarinadeUtils.getParsedStakeAccountInfo(
      prov,
      stakeAccount,
    );
    const voterAddress = stakeAccountInfo.voterAddress;
    if (!voterAddress) {
      throw new Error("The stake account must be delegated");
    }

    const info = this.marinade.state.state;
    const validatorIndex = await Utils.getValidatorIndex(
      this.marinade.state,
      voterAddress,
    );

    const instruction = await this.program.methods
      .depositStakeAccount(validatorIndex)
      .accounts({
        state: this.stateAddress,
        marinadeState: this.state.proxyState,
        sunriseState: this.state.sunriseState,
        stakeOwner,
        stakeAccount,
        mintGsolTo: gsolATA,
        msolMint: this.marinade.state.mSolMint.address,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        validatorList: info.validatorSystem.validatorList.account,
        stakeList: info.stakeSystem.stakeList.account,
        duplicationFlag:
          await this.marinade.state.validatorDuplicationFlag(voterAddress),
        msolMintAuthority: await this.marinade.state.mSolMintAuthority(),
        stakeProgram: StakeProgram.programId,
        beamProgram: this.sunrise.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
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

  /** Utility method to derive the SPL-beam address from its sunrise state and program ID. */
  public static deriveStateAddress = (
    sunriseState: PublicKey,
    programId?: PublicKey,
  ): [PublicKey, number] => {
    const PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunriseState);
  };
}
