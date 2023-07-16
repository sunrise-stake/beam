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
import { BeamInterface, BeamCapability } from "../../sunrise-stake-client/src/beamInterface";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";

/** An instance of the Sunrise program that acts as a proxy to Marinade-compatible
 * stake-pools.
 */
export class MarinadeLpClient extends BeamInterface {
  /** A list of actions supported by this beam. */
  public readonly caps: BeamCapability[];
  /** Anchor program instance. */
  readonly program: Program<MarinadeLpBeam>;
  /** State address of this beam. */
  readonly state: PublicKey;
  /* The deserialized state account for this beam state*/
  account: StateAccount | undefined;
  /** The address of the authority of this beam's token vaults*/
  vaultAuthority: [PublicKey, number];

  /** Fields that depend on the stake-pool state. */
  lp:
    | {
        /** The marinade state. */
        marinade: MarinadeState;
        /** The mint address of the liquidity-pool token. */
        liqPoolMint: PublicKey;
        /** The sunrise vault that holds the liquidity-pool tokens. */
        beamVault: PublicKey;
      }
    | undefined;

  /** Fields that depend on the sunrise "token-regulator" state. */
  sunrise:
    | {
        /** The sunrise client instance. */
        client: SunriseClient;
        /** The sunrise GSOL mint. */
        gsol: PublicKey;
        /** The derived GSOL ATA for the active provider. */
        stakerGsolATA: PublicKey;
      }
    | undefined;

  private constructor(
    readonly provider: AnchorProvider,
    state: PublicKey,
    programId: PublicKey
  ) {
    super();
    this.program = new Program<MarinadeLpBeam>(IDL, programId, provider);
    this.state = state;
    this.vaultAuthority = Utils.deriveAuthorityAddress(programId, state);
    this.caps = [{ kind: "sol-deposit" }, { kind: "liquid-unstake" }];
  }

  /** Register a new state.*/
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    treasury: PublicKey,
    msolTokenAccount: PublicKey,
    programId?: PublicKey
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

  /**
   * Fetch an instance for an existing state account.
   */
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

  /**
   * Query on-chain data for the most recent account state.
   */
  public async refresh(sunrise?: SunriseClient): Promise<void> {
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

  /** Fetch the marinade client for this beam. */
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

  /** Fetch the sunrise client. */
  private async getSunrise(): Promise<SunriseClient> {
    if (this.account === undefined) {
      throw new Error("refresh() not called");
    }
    return SunriseClient.get(this.account.sunriseState, this.provider);
  }

  /** Return a transaction to update this beam's parameters. */
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

  /** Return a transaction to deposit to a marinade liquidity pool. */
  public async deposit(amount: BN, recipient?: PublicKey): Promise<Transaction> {
    if (!this.sunrise || !this.lp) {
      await this.refresh();
    }
    const depositor = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
      this.sunrise.client.mintGsolAccounts(this.state, depositor);

    const transaction = new Transaction();
    const gsolOwner = recipient ?? depositor;
    const gsolATA = getAssociatedTokenAddressSync(gsolMint, gsolOwner);
    const account = await this.provider.connection.getAccountInfo(gsolATA);
    if (!account) {
      transaction.add(
        this.createTokenAccount(gsolATA, gsolOwner, gsolMint)
      );
    }

    const instruction = await this.program.methods
      .deposit(amount)
      .accounts({
        state: this.state,
        marinadeState: this.account.proxyState,
        sunriseState: this.account.sunriseState,
        depositor,
        mintGsolTo: gsolATA,
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

  public depositStake(stakeAccount: PublicKey, recipient?: PublicKey): Promise<Transaction> {
    throw new Error("Deposit-stake-account is unimplemented for marinade-lp beam.");
  }

  /** Return a transaction to withdraw from a marinade liquidity-pool. */
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

  /**
   * Return a transaction to order a delayed withdrawal from a marinade liquidity-pool.
   * NOTE: This is not a supported feature for Marinade Lps and will throw an error.
   */
  public orderWithdraw(lamports: BN): Promise<{ tx: Transaction; sunriseTicket: Keypair; proxyTicket: Keypair; }> {
    throw new Error("Delayed withdrawals are unimplemented for Marinade-lp beam");
  }

  /**
   * Return a transaction to redeem a ticket received from ordering a withdrawal from a marinade-lp.
   * NOTE: This is not a supported feature for Marinade Lps and will throw an error.
   */
  public redeemTicket(): Promise<Transaction> {
    throw new Error("Delayed withdrawals are unimplemented for Marinade-lp beams");
  }

  /**
   * Utility method to create a token account.
   */
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

  /**
   * Utility method to derive the Marinade-beam address from its sunrise state and program ID.
   */
  public static deriveStateAddress = (
    sunrise: PublicKey,
    programId?: PublicKey
  ): [PublicKey, number] => {
    const PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunrise);
  };

  /**
   * A convenience method for calculating the price of the stake-pool's token.
   * NOTE: This might not give the current price is refresh() isn't called first.
   */
  public poolTokenPrice = async () => {
    const lpMintInfo = await this.lp.marinade.lpMint.mintInfo();
    const lpSupply = lpMintInfo.supply;
    const lpSolLeg = await this.lp.marinade.solLeg();
    const lpSolLegBalance = await this.provider.connection.getBalance(lpSolLeg);
    const rentExemptReserveForTokenAccount = 2039280;
    const solBalance = lpSolLegBalance - rentExemptReserveForTokenAccount;

    const lpMsolLeg = this.lp.marinade.mSolLeg;
    const lpMsolLegBalance =
      await this.provider.connection.getTokenAccountBalance(lpMsolLeg);

    const msolPrice = this.lp.marinade.mSolPrice;

    const msolValue = Number(lpMsolLegBalance.value.amount) * msolPrice;

    const lpPrice = (solBalance + msolValue) / Number(lpSupply);

    return lpPrice;
  };
}
