import { PublicKey } from "@solana/web3.js";

export interface EnvironmentConfig {
  sunriseProgramId: PublicKey;
  sunriseState: PublicKey;
}

export const DEFAULT_ENVIRONMENT_CONFIG = {
  sunriseProgramId: new PublicKey('Ed4u8JNwKGJJcMucgG7nF4DNXsvmXhunB7ULL8mHGFrf'),
  sunriseState: PublicKey.default // TODO: Replace.
}