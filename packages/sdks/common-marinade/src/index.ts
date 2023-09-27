import { AnchorProvider } from "@coral-xyz/anchor";
import {
  Marinade,
  MarinadeConfig,
  MarinadeState,
} from "@sunrisestake/marinade-ts-sdk";
import { PublicKey } from "@solana/web3.js";
export { MarinadeState } from "@sunrisestake/marinade-ts-sdk";

export const MARINADE_FINANCE_PROGRAM_ID = new PublicKey(
  "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD",
);

export const loadMarinadeState = async (
  provider: AnchorProvider,
): Promise<MarinadeState> => {
  const marinadeConfig = new MarinadeConfig({
    marinadeFinanceProgramId: MARINADE_FINANCE_PROGRAM_ID,
    connection: provider.connection,
    publicKey: provider.publicKey,
  });
  const marinade = new Marinade(marinadeConfig);
  return marinade.getMarinadeState();
};
