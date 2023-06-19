import { type AnchorProvider, Program, IdlTypes } from "@coral-xyz/anchor";
import {
  PublicKey,
  type Keypair,
  type Transaction,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_INSTRUCTIONS_PUBKEY,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { IDL, type SunriseBeam } from "../../types/sunrise_beam";
import { BeamDetails, StateAccount } from "./state";
import { GSOL_AUTHORITY_SEED, SUNRISE_PROGRAM_ID } from "./constants";

/** An instance of a Sunrise state. */
export class SunriseStake {
  // The sunrise program.
  readonly program: Program<SunriseBeam>;
  // The state address.
  readonly state: PublicKey;
  // The deserialized on-chain account for this sunrise state.
  account: StateAccount | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    state: PublicKey,
    programId: PublicKey
  ) {
    this.program = new Program<SunriseBeam>(IDL, programId, provider);
    this.state = state;
  }

  /** Fetch a SunriseStake instance for a particular state.*/
  public static fetch(
    state: PublicKey,
    provider: AnchorProvider,
    programId?: PublicKey
  ): SunriseStake {
    const client = new SunriseStake(
      provider,
      state,
      programId ?? SUNRISE_PROGRAM_ID
    );
    return client;
  }

  public async refresh(): Promise<void> {
    let idlState = await this.program.account.state.fetch(this.state);
    this.account = StateAccount.fromIdlAccount(idlState, this.state);
  }

  /** Registers a new state.*/
  public static async register(
    provider: AnchorProvider,
    state: Keypair,
    updateAuthority: PublicKey,
    yieldAccount: PublicKey,
    initialCapacity: number,
    gsolMint: PublicKey,
    programId?: PublicKey
  ): Promise<SunriseStake> {
    let client = this.fetch(state.publicKey, provider, programId);
    let register = await client.program.methods
      .registerState({ updateAuthority, yieldAccount, initialCapacity })
      .accounts({
        payer: client.provider.publicKey,
        state: client.state,
        gsolMint,
        gsolMintAuthority: client.gsolMintAuthority(),
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    await client.provider.sendAndConfirm(register, [state]);
    return client;
  }

  /** Returns a transaction to register a new beam to the state. */
  public registerBeam(newBeam: PublicKey): Promise<Transaction> {
    return this.program.methods
      .registerBeam()
      .accounts({
        state: this.state,
        payer: this.provider.publicKey,
        updateAuthority: this.account.updateAuthority,
        beamAccount: newBeam,
      })
      .transaction();
  }

  /** Returns a transaction to update beam allocations for a state.*/
  public updateAllocations(
    newAllocations: Array<{
      beam: PublicKey;
      newAllocation: number;
    }>
  ): Promise<Transaction> {
    return this.program.methods
      .updateAllocations(newAllocations)
      .accounts({
        state: this.state,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  /** Returns a transaction to remove a beam from the state. */
  public removeBeam(beam: PublicKey): Promise<Transaction> {
    return this.program.methods
      .removeBeam(beam)
      .accounts({
        state: this.state,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  public updateState(newParams: {
    newUpdateAuthority: PublicKey | null;
    newYieldAccount: PublicKey | null;
    newGsolMint: PublicKey | null;
    newGsolMintAuthorityBump: number | null;
  }): Promise<Transaction> {
    return this.program.methods
      .updateState(newParams)
      .accounts({
        state: this.state,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  /** Resize the state so it can accept `additional` more beam-details. */
  public resizeAllocations(additional: number): Promise<Transaction> {
    return this.program.methods
      .resizeAllocations(additional)
      .accounts({
        updateAuthority: this.account.updateAuthority,
        payer: this.provider.publicKey,
        state: this.state,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  /** Required accounts for mint-gsol CPI. */
  public mintGsolAccounts(
    beam: PublicKey,
    tokenAccountOwner: PublicKey
  ): {
    state: PublicKey;
    beam: PublicKey;
    gsolMint: PublicKey;
    gsolMintAuthority: PublicKey;
    mintGsolTo: PublicKey;
    instructionsSysvar: PublicKey;
    tokenProgram: PublicKey;
  } {
    return {
      state: this.state,
      beam,
      gsolMint: this.account.gsolMint,
      gsolMintAuthority: this.gsolMintAuthority(),
      mintGsolTo: this.gsolAssociatedTokenAccount(tokenAccountOwner),
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
  }

  /** Required accounts for burn-gsol CPI. */
  public burnGsolAccounts(
    beam: PublicKey,
    gsolTokenAccount: PublicKey,
    tokenAccountOwner: PublicKey
  ): {
    state: PublicKey;
    beam: PublicKey;
    gsolMint: PublicKey;
    burnGsolFromOwner: PublicKey;
    burnGsolFrom: PublicKey;
    instructionsSysvar: PublicKey;
    tokenProgram: PublicKey;
  } {
    return {
      state: this.state,
      beam,
      gsolMint: this.account.gsolMint,
      burnGsolFromOwner: tokenAccountOwner,
      burnGsolFrom: gsolTokenAccount,
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
  }

  gsolMintAuthority = (): PublicKey =>
    PublicKey.findProgramAddressSync(
      [this.state.toBuffer(), Buffer.from(GSOL_AUTHORITY_SEED)],
      this.program.programId
    )[0];

  gsolAssociatedTokenAccount = (owner: PublicKey): PublicKey =>
    PublicKey.findProgramAddressSync(
      [
        owner.toBuffer(),
        TOKEN_PROGRAM_ID.toBuffer(),
        this.account.gsolMint.toBuffer(),
      ],
      ASSOCIATED_TOKEN_PROGRAM_ID
    )[0];
}
