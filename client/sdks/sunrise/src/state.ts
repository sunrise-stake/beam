import { type PublicKey } from "@solana/web3.js";
import { type IdlAccounts, type BN } from "@coral-xyz/anchor";
import { type SunriseBeam } from "../../types/sunrise_beam";

export class StateAccount {
  public readonly address: PublicKey;
  public readonly updateAuthority: PublicKey;
  public readonly gsolMint: PublicKey;
  public readonly preSupply: BN;
  public readonly gsolAuthBump: number;
  public readonly yieldAccount: PublicKey;
  public readonly beams: BeamDetails[];

  protected constructor(
    _address: PublicKey,
    account: IdlAccounts<SunriseBeam>["state"]
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
    account: IdlAccounts<SunriseBeam>["state"],
    address: PublicKey
  ): StateAccount {
    return new StateAccount(address, account);
  }

  /** Pretty print. */
  public pretty(): {
    address: string;
    updateAuthority: string;
    gsolMint: string;
    preSupply: string;
    gsolAuthBump: number;
    yieldAccount: string;
    beams: Array<ReturnType<typeof printBeamDetails>>;
  } {
    return {
      address: this.address.toBase58(),
      updateAuthority: this.updateAuthority.toBase58(),
      gsolMint: this.gsolMint.toBase58(),
      preSupply: this.preSupply.toString(),
      gsolAuthBump: this.gsolAuthBump,
      yieldAccount: this.yieldAccount.toBase58(),
      beams: this.beams.map((beam) => printBeamDetails(beam)),
    };
  }
}

export type BeamDetails = {
  key: PublicKey;
  allocation: number;
  minted: BN;
  drainingMode: boolean;
};

const printBeamDetails = (
  raw: BeamDetails
): {
  key: string;
  allocation: number;
  minted: string;
  drainingMode: boolean;
} => {
  return {
    key: raw.key.toBase58(),
    allocation: raw.allocation,
    minted: raw.minted.toString(),
    drainingMode: raw.drainingMode,
  };
};
