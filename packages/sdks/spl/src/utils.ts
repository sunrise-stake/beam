import { PublicKey } from "@solana/web3.js";

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
}
