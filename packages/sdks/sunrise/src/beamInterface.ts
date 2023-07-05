import { type PublicKey } from "@solana/web3.js";

/** TODO: The main sunrise stake client instance that directs user actions to the
 *  required beam handler.
 */
export class SunriseStake {}

/**
 * Represents a common interface for sunrise beams that act as stake-pool proxies.
 */
export interface BeamInterface {
  caps: BeamCapability[];

  refresh(...args: any[]): any;
  update(...args: any[]): any;
  deposit(...args: any[]): any;
  withdraw(...args: any[]): any;
  orderWithdraw(...args: any[]): any;
  redeemTicket(...args: any[]): any;
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
  /** SOL treasury account for the beam. */
  treasury: PublicKey;
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
export const canDepositStakeAccount = (
  cap: BeamCapability
): cap is StakeDeposit => {
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
  cap: BeamCapability
): cap is StakeWithdrawal => {
  return "stake-withdrawal" in cap;
};
