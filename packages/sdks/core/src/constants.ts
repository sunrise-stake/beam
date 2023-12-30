import { PublicKey } from "@solana/web3.js";

/** The default programId of the beam in charge of minting GSOL. */
export const SUNRISE_PROGRAM_ID = new PublicKey(
  "suncPB4RR39bMwnRhCym6ZLKqMfnFG83vjzVVuXNhCq",
);
/** The constant seed of the GSOL mint authority PDA. */
export const GSOL_AUTHORITY_SEED = "gsol_mint_authority";

export const EPOCH_REPORT_SEED = "epoch_report";