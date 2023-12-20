import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { Keypair } from "@solana/web3.js";
import sunriseKeyJSON from "../../fixtures/sunrise_state.json" assert { type: "json" };

chai.use(chaiAsPromised);

export const provider = AnchorProvider.env();

export const sunriseStateKeypair = Keypair.fromSecretKey(
  Buffer.from(sunriseKeyJSON),
);

export const staker = Keypair.generate();
export const stakerIdentity = new AnchorProvider(
  provider.connection,
  new Wallet(staker),
  {},
);
