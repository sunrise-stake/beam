import { SunriseClient } from "@sunrisestake/beams-core";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  createTokenAccount,
  initializeTestMint,
  sendAndConfirmTransaction,
  transferMintAuthority,
} from "../../utils";
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import { SplClient } from "@sunrisestake/beams-spl";
import BN from "bn.js";
import { provider, sunriseStateKeypair } from "../setup.js";
import { expect } from "chai";

describe("All beams", () => {
  before(async () => {
    // set up core
    // set up marinade stake pool, spl stake pool, marinade lp beams
  });

  context("Deposit into marinade stake pool", () => {});
});
