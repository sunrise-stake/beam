import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

export const ZERO = new BN(0);

export const MARINADE_LP_WITHDRAWAL_FEE_PERCENTAGE = 0;

// see anchor.toml
export const SUNRISE_CORE_STATE = new PublicKey(
  "89wj5p56PTFiKQcHLTkx78jM3Cv4jVRCXgMKJvoFvvp",
);

/** Marinade Accounts */
export const MARINADE_LP_BEAM_STATE = new PublicKey(
  "9zTJuFyLdctoqfbunxTkSPoSinzokDENvxBNLuNKfNci",
);

export const MARINADE_LP_TOKEN_VAULT = new PublicKey(
  "LPmSozJJ8Jh69ut2WP3XmVohTjL4ipR18yiCzxrUmVj",
);

export const MSOL_MINT = new PublicKey(
  "mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So",
);

export const MARINADE_SP_BEAM_STATE = new PublicKey(
  "C6MrjZbzkj5b6Ccq8kcxsrfEBsSSizEo3vmMyoxmu1K6",
);

export const MARINADE_SP_MSOL_VAULT = new PublicKey(
  "BQ5ojRgqnzbovEmMbwZPQv9sbrNWJ1yQGx2VnLXyjyzS",
);

export const SPL_BEAM_STATE = new PublicKey(
  "EtT3RiG9zuUpSGSmGYfzCwPQ29VHgbNRxZCea4Rit9GZ",
);

export const SPL_POOL_TOKEN_VAULT = new PublicKey(
  "AW8Wteu3x1puV8YwaWnAiDfurj7F7BnvEZsBXkg9DFN7",
);

/** SPL Stake Pool Accounts */

export const SPL_STAKE_POOL = new PublicKey(
  "stk9ApL5HeVAwPLr3TLhDXdZS8ptVu7zp6ov8HFDuMi",
);

export const TX_FEE = 5000;
