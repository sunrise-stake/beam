import { PublicKey } from "@solana/web3.js";

const enum Seeds {
  STATE = "sunrise-spl",
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
}
