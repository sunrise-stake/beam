import * as anchor from "@project-serum/anchor";
import { Program } from "@project-serum/anchor";
import { SunriseBeam } from "../target/types/sunrise_beam";

describe("sunrise_beam", () => {
  // Configure the client to use the local cluster.
  anchor.setProvider(anchor.AnchorProvider.env());

  const program = anchor.workspace.SunriseBeam as Program<SunriseBeam>;

  it("Is initialized!", async () => {
    // Add your test here.
    const tx = await program.methods.initialize().rpc();
    console.log("Your transaction signature", tx);
  });
});
