import { PublicKey } from "@solana/web3.js";
import { MarinadeState } from "@sunrisestake/marinade-ts-sdk";

const enum Seeds {
  STATE = "sunrise-marinade",
  VAULT_AUTHORITY = "vault-authority",
}

export class Utils {
  public static deriveStateAddress(
    pid: PublicKey,
    sunrise: PublicKey
  ): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(Seeds.STATE), sunrise.toBuffer()],
      pid
    );
  }

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
