import { PublicKey } from "@solana/web3.js";

export const enum Seeds {
  STATE = "sunrise-marinade",
  VAULT_AUTHORITY = "vault-authority",
}

export class Utils {
  constructor(readonly programId: PublicKey) {}

  public deriveStateAddress(): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(Seeds.STATE)],
      this.programId
    );
  }

  public deriveAuthorityAddress(state?: PublicKey): [PublicKey, number] {
    let st = state ?? this.deriveStateAddress()[0];
    return PublicKey.findProgramAddressSync(
      [Buffer.from(Seeds.VAULT_AUTHORITY), st.toBuffer()],
      this.programId
    );
  }
}
