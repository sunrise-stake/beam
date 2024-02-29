import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { SPL_STAKE_POOL_PROGRAM_ID } from "@sunrisestake/beams-common";
import { getStakePoolAccount, StakePool } from "@solana/spl-stake-pool";

export type SplClientParams = {
  /** The stake pool address. */
  stakePoolAddress: PublicKey;
  /** The deserialized stake-pool state. */
  stakePoolState: StakePool;
  /** The sunrise vault for holding the pool tokens. */
  beamVault: PublicKey;
  /** The stake pool's withdraw authority PDA. */
  withdrawAuthority: PublicKey;
  /** The stake pool's deposit authority PDA. */
  depositAuthority: PublicKey;
};

/**
 * All the constant seeds used for the PDAs of the on-chain program.
 */
const enum Seeds {
  STATE = "sunrise_spl",
  VAULT_AUTHORITY = "vault_authority",
  EXTRACT_YIELD_STAKE_ACCOUNT = "extract_yield_stake_account",
}

/**
 * A utility class containing methods for PDA-derivation.
 */
export class Utils {
  /** Derive the address of the state account for this beam. */
  public static deriveStateAddress(
    pid: PublicKey,
    sunrise: PublicKey,
    stakePool: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(Seeds.STATE), sunrise.toBuffer(), stakePool.toBuffer()],
      pid,
    );
  }

  /** Derive the address of the PDA authority for this beam's token vaults. */
  public static deriveAuthorityAddress(
    pid: PublicKey,
    state: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [state.toBuffer(), Buffer.from(Seeds.VAULT_AUTHORITY)],
      pid,
    );
  }

  public static deriveExtractYieldStakeAccount(
    pid: PublicKey,
    state: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [state.toBuffer(), Buffer.from(Seeds.EXTRACT_YIELD_STAKE_ACCOUNT)],
      pid,
    );
  }

  public static getSplClientParams = async (
    provider: AnchorProvider,
    beamProgramId: PublicKey,
    stateAddress: PublicKey,
    stakePoolAddress: PublicKey,
  ): Promise<SplClientParams> => {
    const vaultAuthority = Utils.deriveAuthorityAddress(
      beamProgramId,
      stateAddress,
    );
    console.log("stake", stakePoolAddress.toBase58());
    const stakePoolState = await getStakePoolAccount(
      provider.connection,
      stakePoolAddress,
    );
    console.log("stakePoolState", stakePoolState.account.data.poolMint.toBase58());
    const beamVault = getAssociatedTokenAddressSync(
      stakePoolState.account.data.poolMint,
      vaultAuthority[0],
      true,
    );
    return {
      stakePoolAddress,
      stakePoolState: stakePoolState.account.data,
      beamVault,
      withdrawAuthority: PublicKey.findProgramAddressSync(
        [stakePoolAddress.toBuffer(), Buffer.from("withdraw")],
        SPL_STAKE_POOL_PROGRAM_ID,
      )[0],
      depositAuthority: PublicKey.findProgramAddressSync(
        [stateAddress.toBuffer(), Buffer.from("deposit")],
        SPL_STAKE_POOL_PROGRAM_ID,
      )[0],
    };
  };
}
