import { PublicKey } from "@solana/web3.js";
import {getStakePoolAccount, StakePool} from "./getStakePool";
import {AnchorProvider} from "@coral-xyz/anchor";
import {getAssociatedTokenAddressSync} from "@solana/spl-token";
import {SPL_STAKE_POOL_PROGRAM_ID} from "./constants";


export type SplClientParams = {
  /** The stake pool address. */
  stakePoolAddress: PublicKey;
  /** The deserialized stake-pool state. */
  stakePoolState: StakePool;
  /** The mint of the stake pool's token. */
  poolMint: PublicKey;
  /** The sunrise vault for holding the pool tokens. */
  beamVault: PublicKey;
  /** The stake pool's withdraw authority PDA. */
  withdrawAuthority: PublicKey;
  /** The stake pool's deposit authority PDA. */
  depositAuthority: PublicKey;
}

/**
 * All the constant seeds used for the PDAs of the on-chain program.
 */
const enum Seeds {
  STATE = "sunrise-spl",
  VAULT_AUTHORITY = "vault-authority",
}

/**
 * A utility class containing methods for PDA-derivation.
 */
export class Utils {
  /** Derive the address of the state account for this beam. */
  public static deriveStateAddress(
      pid: PublicKey,
      sunrise: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from(Seeds.STATE), sunrise.toBuffer()],
        pid
    );
  }

  /** Derive the address of the PDA authority for this beam's token vaults. */
  public static deriveAuthorityAddress(
      pid: PublicKey,
      state: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [state.toBuffer(), Buffer.from(Seeds.VAULT_AUTHORITY)],
        pid
    );
  }

  public static getSplClientParams = async (
      provider: AnchorProvider,
      beamProgramId: PublicKey,
      stateAddress: PublicKey,
      stakePoolAddress: PublicKey
  ): Promise<SplClientParams> => {
    // const marinadeState = await this.loadMarinadeState(provider);
    const vaultAuthority = Utils.deriveAuthorityAddress(beamProgramId, stateAddress);
    const stakePoolState = await getStakePoolAccount(
        provider.connection,
        stakePoolAddress
    );
    const beamVault = getAssociatedTokenAddressSync(
        stakePoolState.poolMint,
        vaultAuthority[0],
        true
    );
    return {
      stakePoolAddress,
      stakePoolState,
      poolMint: stakePoolState.poolMint,
      beamVault,
      withdrawAuthority: PublicKey.findProgramAddressSync(
          [stateAddress.toBuffer(), Buffer.from("withdraw")],
          SPL_STAKE_POOL_PROGRAM_ID
      )[0],
      depositAuthority: PublicKey.findProgramAddressSync(
          [stateAddress.toBuffer(), Buffer.from("deposit")],
          SPL_STAKE_POOL_PROGRAM_ID
      )[0],
    };
  }
}