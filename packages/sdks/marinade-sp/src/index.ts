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
import { IDL, type MarinadeBeam } from "../../types/marinade_beam";
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
  MarinadeUtils,
  Provider,
  type Wallet,
} from "@sunrisestake/marinade-ts-sdk";
import { BeamInterface, BeamCapability } from "../../sunrise/src/beamInterface";
import BN from "bn.js";
import { SunriseClient } from "../../sunrise/src";

/** The marinade beam client */
export class MarinadeClient implements BeamInterface {
  public readonly caps: BeamCapability[];
  /** Anchor program instance. */
  readonly program: Program<MarinadeBeam>;
  /** State address of this beam. */
  readonly state: PublicKey;
  /* The deserialized state account for this beam state*/
  account: StateAccount | undefined;
  /** The address of the authority of this beam's token vaults*/
  vaultAuthority: [PublicKey, number];

  marinade:
    | {
        state: MarinadeState;
        msol: PublicKey;
        beamMsolVault: PublicKey;
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
    this.program = new Program<MarinadeBeam>(IDL, programId, provider);
    this.state = state;
    this.vaultAuthority = Utils.deriveAuthorityAddress(programId, state);
    this.caps = [
      { kind: "sol-deposit" },
      { kind: "stake-deposit" },
      { kind: "order-unstake" },
      { kind: "liquid-unstake" },
    ];
  }

  /** Registers a new state.*/
  public static async initialize(
    provider: AnchorProvider,
    updateAuthority: PublicKey,
    sunriseState: PublicKey,
    treasury: PublicKey,
    programId?: PublicKey
  ): Promise<MarinadeClient> {
    let PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    const state = Utils.deriveStateAddress(PID, sunriseState)[0];
    const client = await this.get(state, provider, PID, true);
    const msolVaultAuthority = client.vaultAuthority[0];
    const vaultAuthorityBump = client.vaultAuthority[1];

    const marinadeConfig = new MarinadeConfig({
      marinadeFinanceProgramId: MARINADE_FINANCE_PROGRAM_ID,
      connection: provider.connection,
      publicKey: provider.publicKey,
      proxyProgramId: MARINADE_BEAM_PROGRAM_ID /**TODO: Modify marinade fork*/,
    });
    const marinade = new Marinade(marinadeConfig);
    const marinadeObj = await marinade.getMarinadeState();
    const marinadeState = marinadeConfig.marinadeStateAddress;
    const msolMint = marinadeObj.mSolMint.address;
    const msolVault = getAssociatedTokenAddressSync(
      msolMint,
      msolVaultAuthority,
      true
    );

    const register = await client.program.methods
      .initialize({
        updateAuthority,
        marinadeState,
        sunriseState,
        vaultAuthorityBump,
        treasury,
      })
      .accounts({
        payer: provider.publicKey,
        state,
        msolMint,
        msolVault,
        msolVaultAuthority,
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

  /** Get a new MarinadeClient instance*/
  public static async get(
    state: PublicKey,
    provider: AnchorProvider,
    programId?: PublicKey,
    refreshOverride?: boolean
  ): Promise<MarinadeClient> {
    const client = new MarinadeClient(
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
    const msolMint = marinadeState.mSolMint.address;
    this.marinade = {
      state: marinadeState,
      msol: msolMint,
      beamMsolVault: getAssociatedTokenAddressSync(
        msolMint,
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
    if (!this.sunrise || !this.marinade) {
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
        msolMint: this.marinade.msol,
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
        beamProgram: this.sunrise.client.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
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
    if (!this.sunrise || !this.marinade) {
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
        gsolMint,
        msolMint: this.marinade.msol,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        liqPoolSolLegPda: await this.marinade.state.solLeg(),
        liqPoolMsolLeg: this.marinade.state.mSolLeg,
        treasuryMsolAccount: this.marinade.state.treasuryMsolAccount,
        instructionsSysvar,
        beamProgram: this.sunrise.client.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return new Transaction().add(instruction);
  }

  public async orderWithdraw(
    amount: BN,
    gsolTokenAccount?: PublicKey
  ): Promise<{
    tx: Transaction;
    sunriseTicket: Keypair;
    marinadeTicket: Keypair;
  }> {
    if (!this.sunrise || !this.marinade) {
      await this.refresh();
    }
    const withdrawer = this.provider.publicKey;
    const { gsolMint, instructionsSysvar, burnGsolFrom } =
      this.sunrise.client.burnGsolAccounts(
        this.state,
        withdrawer,
        gsolTokenAccount
      );

    const sunriseTicket = Keypair.generate();
    const marinadeTicket = Keypair.generate();

    // https://github.com/marinade-finance/marinade-ts-sdk/blob/eb6936533c4e8ab29f4339e1393ff2db233bd266/src/marinade-state/borsh/ticket-account.ts#L3C14-L3C54
    const TICKET_ACCOUNT_SIZE = 8 + 2 * 32 + 2 * 8;
    // https://github.com/marinade-finance/marinade-ts-sdk/blob/eb6936533c4e8ab29f4339e1393ff2db233bd266/src/marinade.ts#L694
    const rent =
      await this.provider.connection.getMinimumBalanceForRentExemption(
        TICKET_ACCOUNT_SIZE
      );
    const initMarinadeTicket = SystemProgram.createAccount({
      fromPubkey: this.provider.publicKey,
      newAccountPubkey: marinadeTicket.publicKey,
      lamports: rent,
      space: TICKET_ACCOUNT_SIZE,
      programId: this.marinade.state.marinadeFinanceProgramId,
    });

    const instruction = await this.program.methods
      .orderWithdrawal(amount)
      .accounts({
        state: this.state,
        marinadeState: this.account.proxyState,
        sunriseState: this.account.sunriseState,
        withdrawer,
        gsolTokenAccount: burnGsolFrom,
        gsolMint,
        msolMint: this.marinade.msol,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        instructionsSysvar,
        newTicketAccount: marinadeTicket.publicKey,
        proxyTicketAccount: sunriseTicket.publicKey,
        beamProgram: this.sunrise.client.program.programId,
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
      marinadeTicket,
    };
  }

  public async redeemTicket(ticketAccount: PublicKey): Promise<Transaction> {
    if (!this.sunrise || !this.marinade) {
      await this.refresh();
    }
    const ticketAccountInfo =
      await this.program.account.proxyTicketAccount.fetch(ticketAccount);

    return this.program.methods
      .redeemTicket()
      .accounts({
        state: this.state,
        marinadeState: this.account.proxyState,
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

  public async depositStake(stakeAccount: PublicKey): Promise<Transaction> {
    if (!this.sunrise || !this.marinade) {
      await this.refresh();
    }

    const stakeOwner = this.provider.publicKey;
    const { gsolMint, gsolMintAuthority, instructionsSysvar } =
      this.sunrise.client.mintGsolAccounts(this.state, stakeOwner);

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

    const prov = new Provider(
      this.provider.connection,
      this.provider.wallet as Wallet,
      {}
    );
    const stakeAccountInfo = await MarinadeUtils.getParsedStakeAccountInfo(
      prov,
      stakeAccount
    );
    const voterAddress = stakeAccountInfo.voterAddress;
    if (!voterAddress) {
      throw new Error("The stake account must be delegated");
    }

    let info = this.marinade.state.state;
    const validatorIndex = await Utils.getValidatorIndex(
      this.marinade.state,
      voterAddress
    );

    const instruction = await this.program.methods
      .depositStakeAccount(validatorIndex)
      .accounts({
        state: this.state,
        marinadeState: this.account.proxyState,
        sunriseState: this.account.sunriseState,
        stakeOwner,
        stakeAccount,
        mintGsolTo: this.sunrise.stakerGsolATA,
        msolMint: this.marinade.msol,
        msolVault: this.marinade.beamMsolVault,
        vaultAuthority: this.vaultAuthority[0],
        gsolMint,
        gsolMintAuthority,
        instructionsSysvar,
        validatorList: info.validatorSystem.validatorList.account,
        stakeList: info.stakeSystem.stakeList.account,
        duplicationFlag: await this.marinade.state.validatorDuplicationFlag(
          voterAddress
        ),
        msolMintAuthority: await this.marinade.state.mSolMintAuthority(),
        stakeProgram: StakeProgram.programId,
        beamProgram: this.sunrise.client.program.programId,
        marinadeProgram: MARINADE_FINANCE_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .instruction();

    return transaction.add(instruction);
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
    sunriseState: PublicKey,
    programId?: PublicKey
  ): [PublicKey, number] => {
    const PID = programId ?? MARINADE_BEAM_PROGRAM_ID;
    return Utils.deriveStateAddress(PID, sunriseState);
  };
}
