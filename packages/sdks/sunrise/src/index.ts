import { type Provider, type AnchorProvider, Program } from "@coral-xyz/anchor";
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
import { IDL, type SunriseCore } from "../../types/sunrise_core";
import { StateAccount } from "./state";
import { GSOL_AUTHORITY_SEED, SUNRISE_PROGRAM_ID } from "./constants";

/** An instance of the Sunrise program that checks the validity of other
 * beams and regulates the minting and burning of GSOL.
 */
export class SunriseClient {
  private constructor(
      // The sunrise program.
    readonly program: Program<SunriseCore>,
      // The state address.
    readonly stateAddress: PublicKey,
      // The deserialized on-chain account for this sunrise state.
    readonly account: StateAccount
  ) {
  }

  public get provider():AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  /** Fetch an instance for an existing state account.*/
  public static async get(
      provider: AnchorProvider,
      state: PublicKey,
      programId = SUNRISE_PROGRAM_ID
  ) {
    const program = new Program<SunriseCore>(IDL, programId, provider);
    const idlState = await program.account.state.fetch(state);
    const account = StateAccount.fromIdlAccount(idlState, state);

    return new SunriseClient(program, state, account)
  }

  /** Query on-chain data for the most recent account state. */
  public async refresh(): Promise<SunriseClient> {
    return SunriseClient.get(this.provider, this.stateAddress, this.program.programId);
  }

  /** Register a new state.*/
  public static async register(
    provider: AnchorProvider,
    state: Keypair,
    updateAuthority: PublicKey,
    yieldAccount: PublicKey,
    initialCapacity: number,
    gsolMint: PublicKey,
    programId = SUNRISE_PROGRAM_ID
  ): Promise<SunriseClient> {
    const program = new Program<SunriseCore>(IDL, programId, provider);
    const register = await program.methods
      .registerState({ updateAuthority, yieldAccount, initialCapacity })
      .accounts({
        payer: provider.publicKey,
        state: state.publicKey,
        gsolMint,
        gsolMintAuthority: SunriseClient.deriveGsolMintAuthority(state.publicKey)[0],
        systemProgram: SystemProgram.programId,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .transaction();

    await provider.sendAndConfirm(register, [state]);
    return SunriseClient.get(provider, state.publicKey, programId);
  }

  /** Return a transaction to register a new beam to the state. */
  public registerBeam(newBeam: PublicKey): Promise<Transaction> {
    return this.program.methods
      .registerBeam()
      .accounts({
        state: this.stateAddress,
        updateAuthority: this.account.updateAuthority,
        beamAccount: newBeam,
      })
      .transaction();
  }

  /** Return a transaction to update beam allocations for a state.*/
  public updateAllocations(
    newAllocations: Array<{
      beam: PublicKey;
      newAllocation: number;
    }>
  ): Promise<Transaction> {
    return this.program.methods
      .updateAllocations(newAllocations)
      .accounts({
        state: this.stateAddress,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  /** Return a transaction to remove a beam from the state. */
  public removeBeam(beam: PublicKey): Promise<Transaction> {
    return this.program.methods
      .removeBeam(beam)
      .accounts({
        state: this.stateAddress,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  /** Return a transaction to update parameters for the state. */
  public updateState(
    newUpdateAuthority: PublicKey | null,
    newYieldAccount: PublicKey | null,
    newGsolMint: PublicKey | null,
    newGsolMintAuthorityBump: number | null
  ): Promise<Transaction> {
    return this.program.methods
      .updateState({
        newUpdateAuthority,
        newYieldAccount,
        newGsolMint,
        newGsolMintAuthorityBump,
      })
      .accounts({
        state: this.stateAddress,
        updateAuthority: this.account.updateAuthority,
      })
      .transaction();
  }

  /** Return a transaction to resize the state so it can accept `additional`
   * more beam-details.
   */
  public resizeAllocations(additional: number): Promise<Transaction> {
    return this.program.methods
      .resizeAllocations(additional)
      .accounts({
        updateAuthority: this.account.updateAuthority,
        payer: this.program.provider.publicKey,
        state: this.stateAddress,
        systemProgram: SystemProgram.programId,
      })
      .transaction();
  }

  /** Return the required accounts for mint-gsol CPI. */
  public mintGsolAccounts(
    beam: PublicKey,
    tokenAccountOwner: PublicKey,
    gsolTokenAccount?: PublicKey
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
      state: this.stateAddress,
      beam,
      gsolMint: this.account.gsolMint,
      gsolMintAuthority: this.gsolMintAuthority[0],
      mintGsolTo:
        gsolTokenAccount ?? this.gsolAssociatedTokenAccount(tokenAccountOwner),
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
  }

  /** Return the required accounts for burn-gsol CPI. */
  public burnGsolAccounts(
    beam: PublicKey,
    tokenAccountOwner: PublicKey,
    gsolTokenAccount?: PublicKey
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
      state: this.stateAddress,
      beam,
      gsolMint: this.account.gsolMint,
      burnGsolFromOwner: tokenAccountOwner,
      burnGsolFrom:
        gsolTokenAccount ?? this.gsolAssociatedTokenAccount(tokenAccountOwner),
      instructionsSysvar: SYSVAR_INSTRUCTIONS_PUBKEY,
      tokenProgram: TOKEN_PROGRAM_ID,
    };
  }

  private static deriveGsolMintAuthority(stateAddress: PublicKey, programId = SUNRISE_PROGRAM_ID): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [stateAddress.toBuffer(), Buffer.from(GSOL_AUTHORITY_SEED)],
      programId
    );
  }

  /** Get the address of the gsol mint authority. */
  public get gsolMintAuthority(): [PublicKey, number] {
    return SunriseClient.deriveGsolMintAuthority(this.stateAddress, this.program.programId);
  }

  /** Derive the gsol ATA for a particular owner. */
  public gsolAssociatedTokenAccount(owner: PublicKey): PublicKey {
      return PublicKey.findProgramAddressSync(
          [
            owner.toBuffer(),
            TOKEN_PROGRAM_ID.toBuffer(),
            this.account.gsolMint.toBuffer(),
          ],
          ASSOCIATED_TOKEN_PROGRAM_ID
      )[0];
    }
}
