import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";
import { AnchorProvider } from "@coral-xyz/anchor";
import {
  MarinadeState,
  loadMarinadeState,
} from "@sunrisestake/beams-common-marinade";

export type MarinadeClientParams = {
  /** The marinade state. */
  state: MarinadeState;
  /** The sunrise vault that holds the marinade pool's tokens. */
  beamMsolVault: PublicKey;
};
/** All the constant seeds used for the PDAs of the on-chain program. */
const enum Seeds {
  STATE = "sunrise-marinade",
  VAULT_AUTHORITY = "vault-authority",
}

/**  A utility class containing methods for PDA-derivation. */
export class Utils {
  /** Derive the address of the state account for this beam. */
  public static deriveStateAddress(
    pid: PublicKey,
    sunrise: PublicKey,
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(Seeds.STATE), sunrise.toBuffer()],
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

  //https://github.com/marinade-finance/marinade-ts-sdk/blob/d4d4060dab261264dbbfaba6ca6596270e46b99c/src/marinade.ts#L534
  /** Get the marinade validator index from a validator's voter address. */
  public static getValidatorIndex = async (
    marinadeState: MarinadeState,
    voterAddress: PublicKey,
  ): Promise<number> => {
    const { validatorRecords } = await marinadeState.getValidatorRecords();
    const validatorLookupIndex = validatorRecords.findIndex(
      ({ validatorAccount }) => validatorAccount.equals(voterAddress),
    );
    return validatorLookupIndex === -1
      ? marinadeState.state.validatorSystem.validatorList.count
      : validatorLookupIndex;
  };

  public static async getMarinadeClientParams(
    provider: AnchorProvider,
    beamProgramId: PublicKey,
    stateAddress: PublicKey,
  ): Promise<MarinadeClientParams> {
    const marinadeState = await loadMarinadeState(provider);
    const vaultAuthority = Utils.deriveAuthorityAddress(
      beamProgramId,
      stateAddress,
    );
    return {
      state: marinadeState,
      beamMsolVault: getAssociatedTokenAddressSync(
        marinadeState.mSolMint.address,
        vaultAuthority[0],
        true,
      ),
    };
  }
}
