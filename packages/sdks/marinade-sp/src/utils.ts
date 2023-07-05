import { PublicKey } from "@solana/web3.js";
import { MarinadeState } from "@sunrisestake/marinade-ts-sdk";

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

  //https://github.com/marinade-finance/marinade-ts-sdk/blob/d4d4060dab261264dbbfaba6ca6596270e46b99c/src/marinade.ts#L534
  /** Get the marinade validator index from a validator's voter address. */
  public static getValidatorIndex = async (
    marinadeState: MarinadeState,
    voterAddress: PublicKey
  ): Promise<number> => {
    const { validatorRecords } = await marinadeState.getValidatorRecords();
    const validatorLookupIndex = validatorRecords.findIndex(
      ({ validatorAccount }) => validatorAccount.equals(voterAddress)
    );
    return validatorLookupIndex === -1
      ? marinadeState.state.validatorSystem.validatorList.count
      : validatorLookupIndex;
  };
}
