import { type AnchorProvider, Program } from "@coral-xyz/anchor";
import {
  PublicKey,
  Transaction,
  type TransactionInstruction,
  SystemProgram,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { IDL, type MarinadeLpBeam } from "../../types/marinade_lp_beam";
import { StateAccount } from "./state";
import {
  MARINADE_BEAM_PROGRAM_ID,
  MARINADE_FINANCE_PROGRAM_ID,
} from "./constants";
import { Utils } from "./utils";
import {
  Marinade,
  MarinadeConfig,
  MarinadeState,
} from "@sunrisestake/marinade-ts-sdk";
import { BeamInterface, BeamCapability } from "../../sunrise/src/beamInterface";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";

/** The marinade beam client */
export class MarinadeLpClient implements BeamInterface {
  public readonly caps: BeamCapability[];
  /** Anchor program instance. */
  readonly program: Program<MarinadeLpBeam>;
  /** State address of this beam. */
  readonly state: PublicKey;
  /* The deserialized state account for this beam state*/
  account: StateAccount | undefined;
  /** The address of the authority of this beam's token vaults*/
  vaultAuthority: [PublicKey, number];

  lp:
    | {
        marinade: MarinadeState;
        liqPoolMint: PublicKey;
        beamVault: PublicKey;
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
    programId: PublicKey
  ) {
    this.program = new Program<MarinadeLpBeam>(IDL, programId, provider);
    this.state = state;
    this.vaultAuthority = Utils.deriveAuthorityAddress(programId, state);
    this.caps = [{ kind: "sol-deposit" }, { kind: "liquid-unstake" }];
  }

  /** Registers a new state.*/
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    treasury: PublicKey,
    msolTokenAccount: PublicKey,
    programId?: PublicKey,
    marinadeStateAddress?: PublicKey
  ): Promise<MarinadeLpClient> {
    let PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    const state = Utils.deriveStateAddress(PID, sunriseState)[0];
    const client = await this.get(state, provider, PID, true);
    const vaultAuthority = client.vaultAuthority[0];
    const vaultAuthorityBump = client.vaultAuthority[1];

    const marinadeConfig = new MarinadeConfig({
      marinadeFinanceProgramId: MARINADE_FINANCE_PROGRAM_ID,
      connection: provider.connection,
      publicKey: provider.publicKey,
      marinadeStateAddress,
      proxyProgramId: MARINADE_BEAM_PROGRAM_ID /**TODO: Modify marinade fork */,
    });
    const marinade = new Marinade(marinadeConfig);
    const marinadeObj = await marinade.getMarinadeState();
    const marinadeState = marinadeConfig.marinadeStateAddress;
    const liqPoolMint = marinadeObj.lpMint.address;
    const liqPoolVault = getAssociatedTokenAddressSync(
      liqPoolMint,
      vaultAuthority,
      true
    );

    const register = await client.program.methods
      .initialize({
        updateAuthority,
        marinadeState,
        sunriseState,
        vaultAuthorityBump,
        treasury,
        msolTokenAccount,
      })
      .accounts({
        payer: provider.publicKey,
        state,
        liqPoolMint,
        liqPoolVault,
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
    refreshOverride?: boolean
  ): Promise<MarinadeLpClient> {
    const client = new MarinadeLpClient(
      provider,
      state,
      programId ?? MARINADE_BEAM_PROGRAM_ID
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

    const marinadeState = await this.getMarinade();
    const liqPoolMint = marinadeState.lpMint.address;
    this.lp = {
      marinade: marinadeState,
      liqPoolMint,
      beamVault: getAssociatedTokenAddressSync(
        liqPoolMint,
        this.vaultAuthority[0],
        true
      ),
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

  private async getMarinade(): Promise<MarinadeState> {
    if (this.account === undefined) {
      throw new Error("refresh() not called");
    }
    const marinadeConfig = new MarinadeConfig({
      marinadeFinanceProgramId: MARINADE_FINANCE_PROGRAM_ID,
      connection: this.provider.connection,
      publicKey: this.provider.publicKey,
    });
    const marinade = new Marinade(marinadeConfig);
    return marinade.getMarinadeState();
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
    } & { marinadeState: PublicKey }
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
    if (!this.sunrise || !this.lp) {
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
        marinadeState: this.account.proxyState,
        sunriseState: this.account.sunriseState,
        depositor,
        mintGsolTo: this.sunrise.stakerGsolATA,
        liqPoolMint: this.lp.liqPoolMint,
        liqPoolTokenVault: this.lp.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        liqPoolSolLegPda: await this.lp.marinade.solLeg(),
        liqPoolMsolLeg: this.lp.marinade.mSolLeg,
        liqPoolMsolLegAuthority: await this.lp.marinade.mSolLegAuthority(),
        liqPoolMintAuthority: await this.lp.marinade.lpMintAuthority(),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        beamProgram: this.sunrise.client.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
  }

  public async withdraw(
    amount: BN,
    gsolTokenAccount?: PublicKey
  ): Promise<Transaction> {
    if (!this.sunrise || !this.lp) {
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
        marinadeState: this.account.proxyState,
        sunriseState: this.account.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        liqPoolMint: this.lp.liqPoolMint,
        liqPoolTokenVault: this.lp.beamVault,
        vaultAuthority: this.vaultAuthority[0],
        transferMsolTo: this.account.msolTokenAccount,
        liqPoolSolLegPda: await this.lp.marinade.solLeg(),
        liqPoolMsolLeg: this.lp.marinade.mSolLeg,
        liqPoolMsolLegAuthority: await this.lp.marinade.mSolLegAuthority(),
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        gsolMint,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
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
    const PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunrise);
  };
}
