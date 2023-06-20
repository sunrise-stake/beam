import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorError, AnchorProvider, BN } from "@coral-xyz/anchor";
import { SunriseStake } from "../sdks/sunrise/src";
import { expect } from "chai";
import {
  createGSolTokenAccount,
  initializeTestMint,
  sendAndConfirmTransaction,
  transferMintAuthority,
} from "./utils";

const TEST_PROGRAM_ID: PublicKey = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);
const BEAM_DETAILS_LEN: number = 42;

describe("sunrise-stake", () => {
  let provider = AnchorProvider.env();
  let client: SunriseStake;
  let beamKps: Keypair[] = [];
  let beams: PublicKey[];
  let owner = Keypair.generate();
  let tokenAccount: PublicKey;

  it("can register a new sunrise-stake state", async () => {
    let state = Keypair.generate();
    let yieldAccount = Keypair.generate();
    let { mint, authority } = await initializeTestMint(provider);

    client = await SunriseStake.register(
      provider,
      state,
      provider.publicKey,
      yieldAccount.publicKey,
      15,
      mint,
      TEST_PROGRAM_ID
    );
    await client.refresh();

    expect(client.account).to.not.be.undefined;

    let account = client.account.pretty();
    expect(account.address).to.equal(state.publicKey.toBase58());
    expect(account.yieldAccount).to.equal(yieldAccount.publicKey.toBase58());
    expect(account.gsolAuthBump).to.equal(client.gsolMintAuthority()[1]);
    expect(account.preSupply).to.equal("0");
    expect(account.gsolMint).to.equal(mint.toBase58());
    expect(account.updateAuthority).to.equal(provider.publicKey.toBase58());
    expect(account.beams.length).to.equal(15);
    for (let beam of account.beams) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }

    await transferMintAuthority(
      provider,
      mint,
      authority,
      client.gsolMintAuthority()[0]
    );
  });

  it("can update a sunrise state", async () => {
    let newYieldAccount = Keypair.generate().publicKey;
    let tx = await client.updateState(null, newYieldAccount, null, null);
    await sendAndConfirmTransaction(provider, tx);
    await client.refresh();

    // changed
    expect(client.account.yieldAccount.toBase58()).to.equal(
      newYieldAccount.toBase58()
    );
    // unchanged
    expect(client.account.updateAuthority.toBase58()).to.equal(
      provider.publicKey.toBase58()
    );
  });

  it("can add beams to the state", async () => {
    for (let i = 0; i < 5; ++i) beamKps.push(Keypair.generate());
    beams = beamKps.map((kp) => kp.publicKey);

    for (let beam of beams) {
      let tx = await client.registerBeam(beam);
      await sendAndConfirmTransaction(provider, tx);
    }

    await client.refresh();
    let account = client.account.pretty();
    for (let i = 0; i < 5; ++i) {
      expect(account.beams[i].key).to.equal(beams[i].toBase58());
      expect(account.beams[i].allocation).to.equal(0);
      expect(account.beams[i].minted).to.equal("0");
    }
    for (let beam of account.beams.slice(5, 15)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

  it("can remove a beam from the state", async () => {
    let removed = beams[2];
    let tx = await client.removeBeam(removed);
    await sendAndConfirmTransaction(provider, tx);
    await client.refresh();

    expect(
      client.account.beams.find(
        (beam) => beam.key.toBase58() == removed.toBase58()
      )
    ).to.be.undefined;
    expect(client.account.beams[2].key.toBase58()).to.equal(
      PublicKey.default.toBase58()
    );
  });

  it("can resize the state", async () => {
    let increase = 5;
    let initialLen = await provider.connection
      .getAccountInfo(client.state)
      .then((info) => info.data.length);
    let tx = await client.resizeAllocations(increase);
    await sendAndConfirmTransaction(provider, tx);

    let finalLen = await provider.connection
      .getAccountInfo(client.state)
      .then((info) => info.data.length);
    expect(finalLen).to.equal(initialLen + 5 * BEAM_DETAILS_LEN);

    await client.refresh();
    for (let beam of client.account.pretty().beams.slice(15, 20)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

  it("can update beam allocations", async () => {
    let newAllocations = [
      {
        beam: beams[0],
        newAllocation: 50,
      },
      {
        beam: beams[3],
        newAllocation: 50,
      },
    ];

    let tx = await client.updateAllocations(newAllocations);
    await sendAndConfirmTransaction(provider, tx);
    await client.refresh();

    for (let beam of client.account.pretty().beams) {
      if (beam.key == beams[0].toBase58() || beam.key == beams[3].toBase58()) {
        expect(beam.allocation).to.equal(50);
      } else {
        expect(beam.allocation).to.equal(0);
      }
    }
  });

  it("can't mint Gsol without CPI", async () => {
    await createGSolTokenAccount(client, owner.publicKey);
    let accounts = client.mintGsolAccounts(beams[1], owner.publicKey);
    tokenAccount = accounts.mintGsolTo;
    try {
      await client.program.methods
        .mintGsol(new BN(10))
        .accounts(accounts)
        .signers([beamKps[1]])
        .rpc();
    } catch (_err) {
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("UnidentifiedCallingProgram");
      expect(err.error.errorCode.number).to.equal(6007);
      expect(err.program.equals(client.program.programId)).is.true;
    }
  });

  it("can't burn Gsol without CPI", async () => {
    let accounts = client.burnGsolAccounts(
      beams[4],
      tokenAccount,
      owner.publicKey
    );
    try {
      await client.program.methods
        .burnGsol(new BN(10))
        .accounts(accounts)
        .signers([beamKps[4], owner])
        .rpc();
    } catch (_err) {
      console.log(_err);
      const err: AnchorError = _err;
      expect(err.error.errorCode.code).to.equal("UnidentifiedCallingProgram");
      expect(err.error.errorCode.number).to.equal(6007);
      expect(err.program.equals(client.program.programId)).is.true;
    }
  });
});
