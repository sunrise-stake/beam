import { Keypair, type PublicKey, Transaction } from "@solana/web3.js";
import BN from "bn.js";
import { AnchorProvider, Program, type Idl } from "@coral-xyz/anchor";
/**
 * Represents a common interface for sunrise beams that act as stake-pool proxies.
 */
export abstract class BeamInterface<
  TProgram extends Idl,
  TStateAccount extends BeamState,
> {
  abstract vaultAuthority: [PublicKey, number];

  protected constructor(
    readonly program: Program<TProgram>,
    readonly stateAddress: PublicKey,
    readonly state: TStateAccount,
    readonly caps: BeamCapability[],
  ) {}

  public get provider(): AnchorProvider {
    return this.program.provider as AnchorProvider;
  }

  abstract refresh(): Promise<this>;
  abstract update(...args: unknown[]): Promise<Transaction>;
  abstract deposit(
    lamports: BN,
    recipient: PublicKey | undefined,
  ): Promise<Transaction>;
  abstract depositStake(
    stakeAccount: PublicKey,
    recipient: PublicKey | undefined,
  ): Promise<Transaction>;
  abstract withdraw(lamports: BN): Promise<Transaction>;
  abstract orderWithdraw(lamports: BN): Promise<{
    tx: Transaction;
    sunriseTicket: Keypair;
    proxyTicket: Keypair;
  }>;
  abstract redeemTicket(sunriseTicket: PublicKey): Promise<Transaction>;

  public supportsSolDeposit(): boolean {
    return this.caps.find((cap) => canDepositSol(cap)) !== undefined;
  }
  public supportsStakeDeposit(): boolean {
    return this.caps.find((cap) => canDepositStake(cap)) !== undefined;
  }
  public supportsLiquidUnstake(): boolean {
    return this.caps.find((cap) => canLiquidUnstake(cap)) !== undefined;
  }
  public supportsOrderUnstake(): boolean {
    return this.caps.find((cap) => canOrderUnstake(cap)) !== undefined;
  }
  public supportsWithdrawStake(): boolean {
    return this.caps.find((cap) => canWithdrawStake(cap)) !== undefined;
  }
}

/**
 * Represents common fields in the stored on-chain state of beam state accounts.
 */
export interface BeamState {
  /** The address of the beam */
  address: PublicKey;
  /** Public key of the account that can make state changes to the beam. */
  updateAuthority: PublicKey;
  /** The stake pool this beam acts as a proxy for. */
  proxyState: PublicKey;
  /** The sunrise state program instance in charge of gsol */
  sunriseState: PublicKey;
  /** Bump of the PDA account that owns the vault where tokens are stored.*/
  vaultAuthorityBump: number;
}

/** @type {BeamCapability}: supports sol deposits.*/
interface SolDeposit {
  kind: "sol-deposit";
}
/** @type {BeamCapability}: supports stake deposits.*/
interface StakeDeposit {
  kind: "stake-deposit";
}
/** @type {BeamCapability}: supports liquid unstakes.*/
interface LiquidUnstake {
  kind: "liquid-unstake";
}
/** @type {BeamCapability}: supports delayed unstakes.*/
interface OrderUnstake {
  kind: "order-unstake";
}
/** @type {BeamCapability}: supports stake withdrawal.*/
interface StakeWithdrawal {
  kind: "stake-withdrawal";
}

/** A discriminated union of possible actions that can be performed on sunrise beams. */
export type BeamCapability =
  | SolDeposit
  | StakeDeposit
  | LiquidUnstake
  | OrderUnstake
  | StakeWithdrawal;

/** @type {BeamCapability} variant is sol deposit.*/
export const canDepositSol = (cap: BeamCapability): cap is SolDeposit => {
  return "sol-deposit" in cap;
};
/** @type {BeamCapability} variant is stake account deposit.*/
export const canDepositStake = (cap: BeamCapability): cap is StakeDeposit => {
  return "stake-deposit" in cap;
};
/** @type {BeamCapability} variant is liquid/immediate unstake/withdrawal.*/
export const canLiquidUnstake = (cap: BeamCapability): cap is LiquidUnstake => {
  return "liquid-unstake" in cap;
};
/** @type {BeamCapability} variant is delayed/ordered unstake/withdrawal.*/
export const canOrderUnstake = (cap: BeamCapability): cap is OrderUnstake => {
  return "order-unstake" in cap;
};
/** @type {BeamCapability} variant is withdrawal to a stake account.*/
export const canWithdrawStake = (
  cap: BeamCapability,
): cap is StakeWithdrawal => {
  return "stake-withdrawal" in cap;
};
