import { type PublicKey } from "@solana/web3.js";

/** TODO: The blanket client instance and beam manager.*/
export class SunriseStake {}

export interface BeamInterface {
  caps: BeamCapability[];

  refresh(...args: any[]): any;
  update(...args: any[]): any;
  deposit(...args: any[]): any;
  withdraw(...args: any[]): any;
  orderWithdraw(...args: any[]): any;
  redeemTicket(...args: any[]): any;
}

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

interface SolDeposit {
  kind: "sol-deposit";
}
interface StakeDeposit {
  kind: "stake-deposit";
}
interface LiquidUnstake {
  kind: "liquid-unstake";
}
interface OrderUnstake {
  kind: "order-unstake";
}
interface StakeWithdrawal {
  kind: "stake-withdrawal";
}

export type BeamCapability =
  | SolDeposit
  | StakeDeposit
  | LiquidUnstake
  | OrderUnstake
  | StakeWithdrawal;

export const canDepositSol = (cap: BeamCapability): cap is SolDeposit => {
  return "sol-deposit" in cap;
};
export const canDepositStakeAccount = (
  cap: BeamCapability
): cap is StakeDeposit => {
  return "stake-deposit" in cap;
};
export const canLiquidUnstake = (cap: BeamCapability): cap is LiquidUnstake => {
  return "liquid-unstake" in cap;
};
export const canOrderUnstake = (cap: BeamCapability): cap is OrderUnstake => {
  return "order-unstake" in cap;
};
export const canWithdrawStake = (
  cap: BeamCapability
): cap is StakeWithdrawal => {
  return "stake-withdrawal" in cap;
};
