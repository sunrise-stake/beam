import { PublicKey } from "@solana/web3.js";

export interface EnvironmentConfig {
  sunriseProgramId: PublicKey;
  sunriseState: PublicKey;
}

export const DEFAULT_ENVIRONMENT_CONFIG = {
  sunriseProgramId: new PublicKey(
    "suncPB4RR39bMwnRhCym6ZLKqMfnFG83vjzVVuXNhCq",
  ),
  sunriseState: PublicKey.default, // TODO: Replace.
};
