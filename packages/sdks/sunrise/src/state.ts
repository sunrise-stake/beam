import { type PublicKey } from "@solana/web3.js";
import { type IdlAccounts, type BN } from "@coral-xyz/anchor";
import { SunriseCore } from "@sunrisestake/beams-common";

/** The deserialized state for the on-chain beam account.*/
export class StateAccount {
  public readonly address: PublicKey;
  public readonly updateAuthority: PublicKey;
  public readonly gsolMint: PublicKey;
  public readonly preSupply: BN;
  public readonly gsolAuthBump: number;
  public readonly yieldAccount: PublicKey;
  public readonly beams: BeamDetails[];

  private constructor(
    _address: PublicKey,
    account: IdlAccounts<SunriseCore.SunriseCore>["state"]
  ) {
    this.address = _address;
    this.updateAuthority = account.updateAuthority;
    this.gsolMint = account.gsolMint;
    this.preSupply = account.preSupply;
    this.gsolAuthBump = account.gsolMintAuthorityBump;
    this.yieldAccount = account.yieldAccount;
    this.beams = account.allocations;
  }

  /** Create a new instance from an anchor-deserialized account. */
  public static fromIdlAccount(
    account: IdlAccounts<SunriseCore.SunriseCore>["state"],
    address: PublicKey
  ): StateAccount {
    return new StateAccount(address, account);
  }

  /** Pretty print. */
  public pretty(): {
    [Property in keyof Omit<StateAccount, "pretty">]: Property extends "beams"
      ? Array<BeamDetailsPretty>
      : string;
  } {
    return {
      address: this.address.toBase58(),
      updateAuthority: this.updateAuthority.toBase58(),
      gsolMint: this.gsolMint.toBase58(),
      preSupply: this.preSupply.toString(),
      gsolAuthBump: this.gsolAuthBump.toString(),
      yieldAccount: this.yieldAccount.toBase58(),
      beams: this.beams.map((beam) => printBeamDetails(beam)),
    };
  }
}

export type BeamDetails = {
  key: PublicKey;
  allocation: number;
  partialGsolSupply: BN;
  drainingMode: boolean;
};

type BeamDetailsPretty = { [Property in keyof BeamDetails]: string };

const printBeamDetails = (raw: BeamDetails): BeamDetailsPretty => {
  return {
    key: raw.key.toBase58(),
    allocation: raw.allocation.toString(),
    partialGsolSupply: raw.partialGsolSupply.toString(),
    drainingMode: raw.drainingMode.toString(),
  };
};
