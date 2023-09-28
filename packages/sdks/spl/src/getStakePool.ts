/**
 * TODO: FIX DEPENDENCY CONFLICTS TO PREVENT HAVING TO DO THIS.
 *
 * Lifted from:
 * https://github.com/solana-labs/solana-program-library/blob/1ea21ceca0114b665891adb58749e4170c576752/stake-pool/js/src/index.ts#L90
 * & https://github.com/solana-labs/solana-program-library/blob/1ea21ceca0114b665891adb58749e4170c576752/stake-pool/js/src/layouts.ts#L1C1-L1C1
 * due to dependency issues with `@solana/spl-token`. https://github.com/solana-labs/solana-program-library/issues/3057
 *
 */

import { publicKey, struct, u64, u8, option } from "@project-serum/borsh";
import { type Lockup, type PublicKey, type Connection } from "@solana/web3.js";
import type BN from "bn.js";

export interface Fee {
  denominator: BN;
  numerator: BN;
}

export enum AccountType {
  Uninitialized,
  StakePool,
  ValidatorList,
}
const feeFields = [u64("denominator"), u64("numerator")];

export interface StakePool {
  accountType: AccountType;
  manager: PublicKey;
  staker: PublicKey;
  stakeDepositAuthority: PublicKey;
  stakeWithdrawBumpSeed: number;
  validatorList: PublicKey;
  reserveStake: PublicKey;
  poolMint: PublicKey;
  managerFeeAccount: PublicKey;
  tokenProgramId: PublicKey;
  totalLamports: BN;
  poolTokenSupply: BN;
  lastUpdateEpoch: BN;
  lockup: Lockup;
  epochFee: Fee;
  nextEpochFee?: Fee | undefined;
  preferredDepositValidatorVoteAddress?: PublicKey | undefined;
  preferredWithdrawValidatorVoteAddress?: PublicKey | undefined;
  stakeDepositFee: Fee;
  stakeWithdrawalFee: Fee;
  nextStakeWithdrawalFee?: Fee | undefined;
  stakeReferralFee: number;
  solDepositAuthority?: PublicKey | undefined;
  solDepositFee: Fee;
  solReferralFee: number;
  solWithdrawAuthority?: PublicKey | undefined;
  solWithdrawalFee: Fee;
  nextSolWithdrawalFee?: Fee | undefined;
  lastEpochPoolTokenSupply: BN;
  lastEpochTotalLamports: BN;
}

export const StakePoolLayout = struct<StakePool>([
  u8("accountType"),
  publicKey("manager"),
  publicKey("staker"),
  publicKey("stakeDepositAuthority"),
  u8("stakeWithdrawBumpSeed"),
  publicKey("validatorList"),
  publicKey("reserveStake"),
  publicKey("poolMint"),
  publicKey("managerFeeAccount"),
  publicKey("tokenProgramId"),
  u64("totalLamports"),
  u64("poolTokenSupply"),
  u64("lastUpdateEpoch"),
  struct(
    [u64("unixTimestamp"), u64("epoch"), publicKey("custodian")],
    "lockup",
  ),
  struct(feeFields, "epochFee"),
  option(struct(feeFields), "nextEpochFee"),
  option(publicKey(), "preferredDepositValidatorVoteAddress"),
  option(publicKey(), "preferredWithdrawValidatorVoteAddress"),
  struct(feeFields, "stakeDepositFee"),
  struct(feeFields, "stakeWithdrawalFee"),
  option(struct(feeFields), "nextStakeWithdrawalFee"),
  u8("stakeReferralFee"),
  option(publicKey(), "solDepositAuthority"),
  struct(feeFields, "solDepositFee"),
  u8("solReferralFee"),
  option(publicKey(), "solWithdrawAuthority"),
  struct(feeFields, "solWithdrawalFee"),
  option(struct(feeFields), "nextSolWithdrawalFee"),
  u64("lastEpochPoolTokenSupply"),
  u64("lastEpochTotalLamports"),
]);

/** Fetch and decode a stake-pool account from its state address. */
export async function getStakePoolAccount(
  connection: Connection,
  stakePoolAddress: PublicKey,
): Promise<StakePool> {
  const account = await connection.getAccountInfo(stakePoolAddress);

  if (!account) {
    throw new Error("Invalid stake pool account");
  }

  return StakePoolLayout.decode(account.data);
}
