import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { AnchorProvider } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import sunriseKeyJSON from "../../fixtures/sunrise_state.json" assert { type: "json" };

chai.use(chaiAsPromised);

// process.env.ANCHOR_WALLET = process.env.ANCHOR_WALLET!.replace(
//   "packages/tests/",
//   "",
// );
export const provider = AnchorProvider.env();

export const sunriseStateKeypair = Keypair.fromSecretKey(
  Buffer.from(sunriseKeyJSON),
);