import { PublicKey } from "@solana/web3.js";
import {MarinadeState, loadMarinadeState} from '@sunrisestake/beams-common-marinade'
import {getAssociatedTokenAddressSync} from "@solana/spl-token";
import {AnchorProvider} from "@coral-xyz/anchor";
import {deriveAuthorityAddress} from "@sunrisestake/beams-common";

export type MarinadeLpClientParams = {
  /** The marinade state. */
  marinade: MarinadeState;
  /** The sunrise vault that holds the liquidity-pool tokens. */
  beamVault: PublicKey;
};

/** All the constant seeds used for the PDAs of the on-chain program. */
const enum Seeds {
  STATE = "sunrise-marinade-lp",
}

/** A utility class containing methods for PDA-derivation. */
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

  public static async getMarinadeLpClientParams(
      provider: AnchorProvider,
      beamProgramId: PublicKey,
      stateAddress: PublicKey
  ): Promise<MarinadeLpClientParams> {
    const vaultAuthority = deriveAuthorityAddress(beamProgramId, stateAddress);
    const marinadeState = await loadMarinadeState(provider);
    const beamVault = getAssociatedTokenAddressSync(
            marinadeState.lpMint.address,
            vaultAuthority[0],
            true
        );

    return {
      marinade: marinadeState,
      beamVault
    }
  }
}
