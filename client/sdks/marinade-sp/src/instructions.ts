import {
  type PublicKey,
  StakeProgram,
  SystemProgram,
  SYSVAR_CLOCK_PUBKEY,
  SYSVAR_RENT_PUBKEY,
  SYSVAR_STAKE_HISTORY_PUBKEY,
  type Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import {
  type Marinade,
  type MarinadeState,
  MarinadeUtils,
} from "@marinade.finance/marinade-ts-sdk";
import { type Program, utils, BN } from "@coral-xyz/anchor";
import { type MarinadeBeam } from "../../types/marinade_beam";

export const deposit = async (
  lamports: BN,
  program: Program<MarinadeBeam>,
  accounts: Parameters<
    ReturnType<typeof program.methods.deposit>["accounts"]
  >[0]
): Promise<TransactionInstruction> => {
  return program.methods.deposit(lamports).accounts(accounts).instruction();
};

export const;
