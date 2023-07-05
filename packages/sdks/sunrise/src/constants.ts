import { PublicKey } from "@solana/web3.js";

/** The default programId of the beam in charge of minting GSOL. */
export const SUNRISE_PROGRAM_ID = new PublicKey(
  "Ed4u8JNwKGJJcMucgG7nF4DNXsvmXhunB7ULL8mHGFrf"
);
/** The constant seed of the GSOL mint authority PDA. */
export const GSOL_AUTHORITY_SEED = "gsol_mint_authority";
