import { type PublicKey } from "@solana/web3.js";
import { type IdlAccounts } from "@coral-xyz/anchor";
import { MarinadeLpBeam, type BeamState } from "@sunrisestake/beams-common";

/** The deserialized state for the on-chain Marinade-LP-beam account. */
export class StateAccount implements BeamState {
  public readonly address: PublicKey;
  public readonly updateAuthority: PublicKey;
  public readonly proxyState: PublicKey;
  public readonly sunriseState: PublicKey;
  public readonly vaultAuthorityBump: number;
  public readonly msolRecipientBeam: PublicKey;
  public readonly msolTokenAccount: PublicKey;

  private constructor(
    _address: PublicKey,
    account: IdlAccounts<MarinadeLpBeam.MarinadeLpBeam>["state"],
  ) {
    this.address = _address;
    this.updateAuthority = account.updateAuthority;
    this.proxyState = account.marinadeState;
    this.sunriseState = account.sunriseState;
    this.vaultAuthorityBump = account.vaultAuthorityBump;
    this.msolRecipientBeam = account.msolRecipientBeam;
    this.msolTokenAccount = account.msolTokenAccount;
  }

  /** Create a new instance from an anchor-deserialized account. */
  public static fromIdlAccount(
    account: IdlAccounts<MarinadeLpBeam.MarinadeLpBeam>["state"],
    address: PublicKey,
  ): StateAccount {
    return new StateAccount(address, account);
  }

  /** Pretty print. */
  public pretty(): {
    [Property in keyof Omit<StateAccount, "pretty">]: string;
  } {
    return {
      address: this.address.toBase58(),
      updateAuthority: this.updateAuthority.toBase58(),
      proxyState: this.proxyState.toBase58(),
      sunriseState: this.sunriseState.toBase58(),
      vaultAuthorityBump: this.vaultAuthorityBump.toString(),
      msolRecipientBeam: this.msolRecipientBeam.toBase58(),
      msolTokenAccount: this.msolTokenAccount.toBase58(),
    };
  }
}
