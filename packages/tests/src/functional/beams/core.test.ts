import { SunriseClient } from "@sunrisestake/beams-core";
import { Keypair, PublicKey } from "@solana/web3.js";
import {
  createTokenAccount,
  initializeTestMint,
  sendAndConfirmTransaction,
  transferMintAuthority,
} from "../../utils.js";
import { MarinadeClient } from "@sunrisestake/beams-marinade-sp";
import { SplClient } from "@sunrisestake/beams-spl";
import BN from "bn.js";
import { provider } from "../setup.js";
import { expect } from "chai";

const BEAM_DETAILS_LEN: number = 42;

describe("Sunrise core", () => {
  let gsolMint: PublicKey;
  let client: SunriseClient;
  let mState: PublicKey; // marinade-beam state address.
  let splState: PublicKey; // spl-beam state address.
  const tempBeam = Keypair.generate();
  let beams: PublicKey[];

  const newSunriseStateKeypair = Keypair.generate();

  /**
   * This test creates a new core sunrise state on-chain, and associates it with a token mint.
   * A sunrise state determines the rules that decide how tokens can be minted and burned.
   * Specifically, it controls the list of "beams", which are programs that can CPI into the core
   * sunrise program to create and destroy tokens.
   * It also controls the yield account, which is the PDA that yield earned by beams is deposited into.
   */
  it("can register a new sunrise-stake state", async () => {
    const yieldAccount = Keypair.generate();
    const { mint, authority } = await initializeTestMint(provider);
    gsolMint = mint;

    client = await SunriseClient.register(
      provider,
      newSunriseStateKeypair,
      provider.publicKey,
      yieldAccount.publicKey,
      15,
      mint,
    );

    const account = client.state.pretty();
    expect(account.address).to.equal(
      newSunriseStateKeypair.publicKey.toBase58(),
    );
    expect(account.yieldAccount).to.equal(yieldAccount.publicKey.toBase58());
    expect(account.gsolAuthBump).to.equal(
      client.gsolMintAuthority[1].toString(),
    );
    expect(account.preSupply).to.equal("0");
    expect(account.gsolMint).to.equal(mint.toBase58());
    expect(account.updateAuthority).to.equal(provider.publicKey.toBase58());
    expect(account.beams.length).to.equal(15);
    for (const beam of account.beams) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }

    await transferMintAuthority(
      provider,
      mint,
      authority,
      client.gsolMintAuthority[0],
    );

    console.log("state address", client.stateAddress.toBase58());
    console.log("gsol mint", client.state.gsolMint.toBase58());
  });

  /**
   * This test updates the sunrise state to change the yield account.
   * It shows the "happy path", where the request is made by the update authority.
   */
  it("can update a sunrise state", async () => {
    const newYieldAccount = Keypair.generate().publicKey;
    const tx = await client.updateState(null, newYieldAccount, null, null);
    await sendAndConfirmTransaction(provider, tx, []);
    client = await client.refresh();

    // changed
    expect(client.state.yieldAccount.toBase58()).to.equal(
      newYieldAccount.toBase58(),
    );
    // unchanged
    expect(client.state.updateAuthority.toBase58()).to.equal(
      provider.publicKey.toBase58(),
    );
  });

  /**
   * Once a core sunrise state is created, beams can be added to it.
   * This test registers three beams, including a dummy one that is removed later.
   */
  it("can add beams to the state", async () => {
    mState = MarinadeClient.deriveStateAddress(client.stateAddress)[0];
    splState = SplClient.deriveStateAddress(client.stateAddress)[0];
    beams = [mState, splState, tempBeam.publicKey];

    for (const beam of beams) {
      const tx = await client.registerBeam(beam);
      await sendAndConfirmTransaction(provider, tx, []);
    }

    client = await client.refresh();
    const account = client.state.pretty();
    for (const beam of account.beams) {
      expect(beam.allocation).to.equal("0");
      expect(beam.partialGsolSupply).to.equal("0");
    }
    expect(account.beams[0].key).to.equal(mState.toBase58());
    expect(account.beams[1].key).to.equal(splState.toBase58());
    expect(account.beams[2].key).to.equal(tempBeam.publicKey.toBase58());

    for (const beam of account.beams.slice(3, 15)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

  /**
   * Since a sunrise state includes details of all beams, it may need to be resized as beams are added or removed.
   * This tests ensures that the upgrade authority can do this.
   */
  it("can resize the state", async () => {
    const increase = 5;
    const initialLen = await provider.connection
      .getAccountInfo(client.stateAddress)
      .then((info) => info!.data.length);
    const tx = await client.resizeAllocations(increase);
    await sendAndConfirmTransaction(provider, tx);

    const finalLen = await provider.connection
      .getAccountInfo(client.stateAddress)
      .then((info) => info!.data.length);
    expect(finalLen).to.equal(initialLen + 5 * BEAM_DETAILS_LEN);

    await client.refresh();
    for (const beam of client.state.pretty().beams.slice(15, 20)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

  /**
   * Ensure that the authority can change the allocations to each beam.
   * Allocations are the ideal percentage of the total supply that each beam should be responsible for.
   */
  it("can update beam allocations", async () => {
    const newAllocations = [
      {
        beam: mState,
        newAllocation: 50,
      },
      {
        beam: splState,
        newAllocation: 50,
      },
    ];

    const tx = await client.updateAllocations(newAllocations);
    await sendAndConfirmTransaction(provider, tx);
    client = await client.refresh();

    for (const beam of client.state.pretty().beams) {
      if (beam.key == mState.toBase58() || beam.key == splState.toBase58()) {
        expect(beam.allocation).to.equal("50");
      } else {
        expect(beam.allocation).to.equal("0");
      }
    }
  });

  /**
   * This test ensures that it is not possible to simply mint gsol tokens without going through a beam.
   */
  it("can't mint Gsol without CPI", async () => {
    const testUser = Keypair.generate();
    await createTokenAccount(client.provider, testUser.publicKey, gsolMint);
    const accounts = client.mintGsolAccounts(
      tempBeam.publicKey,
      testUser.publicKey,
    );

    const shouldFail = client.program.methods
      .mintGsol(new BN(10))
      .accounts(accounts)
      .signers([tempBeam])
      .rpc();

    await expect(shouldFail).to.be.rejectedWithAnchorError(
      client.program.idl,
      6007,
      client.program.programId,
    );
  });

  /**
   * This test ensures that it is not possible to simply burn gsol tokens without going through a beam.
   */
  it("can't burn Gsol without CPI", async () => {
    const testUser = Keypair.generate();
    const accounts = client.burnGsolAccounts(
      tempBeam.publicKey,
      testUser.publicKey,
    );
    await createTokenAccount(client.provider, testUser.publicKey, gsolMint);
    const shouldFail = client.program.methods
      .burnGsol(new BN(10))
      .accounts(accounts)
      .signers([tempBeam, testUser])
      .rpc();

    await expect(shouldFail).to.be.rejectedWithAnchorError(
        client.program.idl,
        6007,
      client.program.programId,
    );
  });

  /**
   * Check that an authority can remove a beam from the sunrise core state.
   * TODO: What is not checked here is that the proportions adjust themselves accordingly.
   */
  it("can remove a beam from the state", async () => {
    const tx = await client.removeBeam(tempBeam.publicKey);
    await sendAndConfirmTransaction(provider, tx);
    client = await client.refresh();

    expect(
      client.state.beams.find(
        (beam) => beam.key.toBase58() === tempBeam.publicKey.toBase58(),
      ),
    ).to.be.undefined;
    expect(client.state.beams[2].key.toBase58()).to.equal(
      PublicKey.default.toBase58(),
    );
  });
});
