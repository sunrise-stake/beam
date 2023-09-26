import { Keypair, PublicKey } from "@solana/web3.js";
import { AnchorError, AnchorProvider, Wallet } from "@coral-xyz/anchor";
import { SunriseClient } from "../sdks/sunrise/src";
import chai from "chai";
import {
  fund,
  createTokenAccount,
  initializeTestMint,
  sendAndConfirmTransaction,
  transferMintAuthority,
  expectStakerSolBalance,
  expectTokenBalance,
  waitForNextEpoch,
  solBalance,
  tokenAccountBalance, expectAnchorError,
} from "./utils";
import { MarinadeClient } from "../sdks/marinade-sp/src";
import { SplClient } from "../sdks/spl/src";
import BN from "bn.js";
import { MarinadeLpClient } from "../sdks/marinade-lp/src";

import chaiAsPromised from 'chai-as-promised'

chai.use(chaiAsPromised);

const {expect} = chai;


const BEAM_DETAILS_LEN: number = 42;
const provider = AnchorProvider.env();
const sunrise = Keypair.fromSecretKey(
  Buffer.from(require("./fixtures/sunrise_state.json"))
);
let gsolMint: PublicKey;
let msolTokenAccount: PublicKey; /** For the marinade beam, also registered as the msol token account for the marinade-lp beam*/

describe("sunrise-stake", () => {
  let client: SunriseClient;
  let mState: PublicKey; // marinade-beam state address.
  let splState: PublicKey; // spl-beam state address.
  let tempBeam = Keypair.generate();
  let beams: PublicKey[];
  let tokenAccount: PublicKey;

  it("can register a new sunrise-stake state", async () => {
    const yieldAccount = Keypair.generate();
    const { mint, authority } = await initializeTestMint(provider);
    gsolMint = mint;

    client = await SunriseClient.register(
      provider,
      sunrise,
      provider.publicKey,
      yieldAccount.publicKey,
      15,
      mint
    );
    await client.refresh();

    const account = client.account.pretty();
    expect(account.address).to.equal(sunrise.publicKey.toBase58());
    expect(account.yieldAccount).to.equal(yieldAccount.publicKey.toBase58());
    expect(account.gsolAuthBump).to.equal(
      client.gsolMintAuthority[1].toString()
    );
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
      client.gsolMintAuthority[0]
    );
  });

  it("can update a sunrise state", async () => {
    const newYieldAccount = Keypair.generate().publicKey;
    const tx = await client.updateState(null, newYieldAccount, null, null);
    await sendAndConfirmTransaction(provider, tx, []);
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
    mState = MarinadeClient.deriveStateAddress(client.stateAddress)[0];
    splState = SplClient.deriveStateAddress(client.stateAddress)[0];
    beams = [mState, splState, tempBeam.publicKey];

    for (let beam of beams) {
      const tx = await client.registerBeam(beam);
      await sendAndConfirmTransaction(provider, tx, []);
    }

    await client.refresh();
    const account = client.account.pretty();
    for (let beam of account.beams) {
      expect(beam.allocation).to.equal("0");
      expect(beam.partialGsolSupply).to.equal("0");
    }
    expect(account.beams[0].key).to.equal(mState.toBase58());
    expect(account.beams[1].key).to.equal(splState.toBase58());
    expect(account.beams[2].key).to.equal(tempBeam.publicKey.toBase58());

    for (let beam of account.beams.slice(3, 15)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

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
    for (let beam of client.account.pretty().beams.slice(15, 20)) {
      expect(beam.key).to.equal(PublicKey.default.toBase58());
    }
  });

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
    await client.refresh();

    for (let beam of client.account.pretty().beams) {
      if (beam.key == mState.toBase58() || beam.key == splState.toBase58()) {
        expect(beam.allocation).to.equal("50");
      } else {
        expect(beam.allocation).to.equal("0");
      }
    }
  });

  it("can't mint Gsol without CPI", async () => {
    const testUser = Keypair.generate();
    await createTokenAccount(client.provider, testUser.publicKey, gsolMint);
    const accounts = client.mintGsolAccounts(
      tempBeam.publicKey,
      testUser.publicKey
    );
    tokenAccount = accounts.mintGsolTo;

    const shouldFail = client.program.methods
        .mintGsol(new BN(10))
        .accounts(accounts)
        .signers([tempBeam])
        .rpc();

    await expect(shouldFail).to.be.rejectedWith(expectAnchorError(6007, "UnidentifiedCallingProgram", client.program.programId));
  });

  it("can't burn Gsol without CPI", async () => {
    const testUser = Keypair.generate();
    const accounts = client.burnGsolAccounts(
      tempBeam.publicKey,
      testUser.publicKey
    );
    await createTokenAccount(client.provider, testUser.publicKey, gsolMint);
    const shouldFail = client.program.methods
        .burnGsol(new BN(10))
        .accounts(accounts)
        .signers([tempBeam, testUser])
        .rpc();

    await expect(shouldFail).to.be.rejectedWith(expectAnchorError(6007, "UnidentifiedCallingProgram", client.program.programId));
  });

  it("can remove a beam from the state", async () => {
    const tx = await client.removeBeam(tempBeam.publicKey);
    await sendAndConfirmTransaction(provider, tx);
    await client.refresh();

    expect(
      client.account.beams.find(
        (beam) => beam.key.toBase58() === tempBeam.publicKey.toBase58()
      )
    ).to.be.undefined;
    expect(client.account.beams[2].key.toBase58()).to.equal(
      PublicKey.default.toBase58()
    );
  });
});

describe("sunrise-marinade", () => {
  let client: MarinadeClient;
  const provider = AnchorProvider.env();

  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {}
  );

  let vaultMsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  let sunriseDelayedTicket: PublicKey;
  let orderUnstakeLamports: number;

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const liquidWithdrawalAmount = 5;
  const delayedWithdrawalAmount = 5;

  it("can initialize a state", async () => {
    const treasury = Keypair.generate();
    client = await MarinadeClient.initialize(
      provider,
      provider.publicKey,
      sunrise.publicKey,
      treasury.publicKey
    );

    await client.refresh();
    const info = client.account.pretty();
    expect(info.proxyState).to.equal(
      client.marinade.state.marinadeStateAddress.toBase58()
    );
    expect(info.sunriseState).to.equal(sunrise.publicKey.toBase58());
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString()
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultMsolBalance = await tokenAccountBalance(
      provider,
      client.marinade.beamMsolVault
    );
  });

  it("Can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.account.updateAuthority,
      sunriseState: client.account.sunriseState,
      vaultAuthorityBump: client.account.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      marinadeState: client.account.proxyState,
    };
    await sendAndConfirmTransaction(
      provider,
      await client.update(provider.publicKey, updateParams),
      []
    );

    client = await client.refresh();
    expect(client.account.treasury.toBase58()).to.equal(
      newTreasury.publicKey.toBase58()
    );
    msolTokenAccount = client.marinade.beamMsolVault;
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await MarinadeClient.get(stakerIdentity, client.stateAddress);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10))
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedMsol = vaultMsolBalance.addn(
      Math.floor(depositAmount / client.marinade.state.mSolPrice)
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
      expectedMsol
    );
    stakerGsolBalance = expectedGsol;
    vaultMsolBalance = expectedMsol;
  });

  it("can't deposit due to exceeding allocation", async () => {
    const shouldFail = sendAndConfirmTransaction(
        stakerIdentity,
        await client.deposit(new BN(failedDepositAmount)),
        []
    );

    await expect(shouldFail).to.be.rejectedWith(
        expectAnchorError(6001, client.sunrise.program.idl["errors"][1].name, client.sunrise.program.programId)
    );
  });

  it("can withdraw and burn gsol", async () => {
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.withdraw(new BN(liquidWithdrawalAmount)),
      []
    );

    const expectedGsol = stakerGsolBalance.subn(liquidWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(liquidWithdrawalAmount / client.marinade.state.mSolPrice)
    );
    await expectTokenBalance(
      client.provider,
        client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
      expectedMsol
    );
    stakerGsolBalance = expectedGsol;
    vaultMsolBalance = expectedMsol;
  });

  it("can order a withdrawal and burn gsol", async () => {
    const {
      tx,
      sunriseTicket,
      proxyTicket: marinadeTicket,
    } = await client.orderWithdraw(new BN(delayedWithdrawalAmount));
    await sendAndConfirmTransaction(stakerIdentity, tx, [
      sunriseTicket,
      marinadeTicket,
    ]);

    const ticketAccount = await client.program.account.proxyTicket.fetch(
      sunriseTicket.publicKey
    );
    expect(ticketAccount.beneficiary.toBase58()).to.equal(
      staker.publicKey.toBase58()
    );
    expect(ticketAccount.marinadeTicketAccount.toBase58()).to.equal(
      marinadeTicket.publicKey.toBase58()
    );
    expect(ticketAccount.state.toBase58()).to.equal(client.stateAddress.toBase58());

    const expectedGsol = stakerGsolBalance.subn(delayedWithdrawalAmount);
    const expectedMsol = vaultMsolBalance.subn(
      Math.floor(delayedWithdrawalAmount / client.marinade.state.mSolPrice)
    );
    await expectTokenBalance(
      client.provider,
        client.sunrise.gsolAssociatedTokenAccount(),
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.marinade.beamMsolVault,
      expectedMsol
    );

    sunriseDelayedTicket = sunriseTicket.publicKey;
    orderUnstakeLamports = 5;
  });

  it("can redeem an unstake ticket after one epoch has passed", async () => {
    const stakerPreSolBalance = await solBalance(client.provider);

    // unfortunately with the test validator, it is impossible to move the epoch forward without just waiting.
    // we run the validator at 32 slots per epoch, so we "only" need to wait for ~12 seconds
    // An alternative is to write rust tests using solana-program-test
    await waitForNextEpoch(client.provider);

    const sunriseLamports = await client.provider.connection
      .getAccountInfo(sunriseDelayedTicket)
      .then((account) => account?.lamports);
    await sendAndConfirmTransaction(
      client.provider,
      await client.redeemTicket(sunriseDelayedTicket),
      []
    );

    // the staker does not get the marinade ticket rent
    const expectedPostUnstakeBalance = stakerPreSolBalance
      .addn(orderUnstakeLamports)
      .addn(sunriseLamports ?? 0)
      .subn(5000);
    await expectStakerSolBalance(
      client.provider,
      expectedPostUnstakeBalance,
      100
    );
  });
});

describe("sunrise-spl", () => {
  let client: SplClient;
  const provider = AnchorProvider.env();

  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {}
  );

  let vaultBsolBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  /** The blaze stake devnet pool address.
   * Setup as a fixture in `fixtures/blaze/pool.json` */
  const stakePool: PublicKey = new PublicKey(
    "azFVdHtAJN8BX3sbGAYkXvtdjdrT5U6rj9rovvUFos9"
  );

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const withdrawalAmount = 10;

  it("can initialize a state", async () => {
    const treasury = Keypair.generate();
    client = await SplClient.initialize(
      provider,
      provider.publicKey,
      sunrise.publicKey,
      treasury.publicKey,
      stakePool
    );

    await client.refresh();
    const info = client.account.pretty();
    expect(info.proxyState).to.equal(client.stakePool.toBase58());
    expect(info.sunriseState).to.equal(sunrise.publicKey.toBase58());
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString()
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBsolBalance = await tokenAccountBalance(
      provider,
      client.spl.beamVault
    );
  });

  it("Can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.account.updateAuthority,
      sunriseState: client.account.sunriseState,
      vaultAuthorityBump: client.account.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      stakePool: client.stakePool,
    };
    await sendAndConfirmTransaction(
      provider,
      await client.update(provider.publicKey, updateParams),
      []
    );

    await client.refresh();
    expect(client.account.treasury.toBase58()).to.equal(
      newTreasury.publicKey.toBase58()
    );
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await SplClient.get(client.state, stakerIdentity, stakePool);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10)),
      []
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedBsol = vaultBsolBalance.addn(
      Math.floor(depositAmount / (await client.poolTokenPrice()))
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.stakerGsolATA,
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.spl.beamVault,
      expectedBsol
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
  });

  it("can't deposit due to exceeding allocation", async () => {
    let failed = false;
    try {
      await sendAndConfirmTransaction(
        stakerIdentity,
        await client.deposit(new BN(failedDepositAmount)),
        []
      );
    } catch (_err) {
      failed = true;
      const err = AnchorError.parse(_err.logs);
      expect(err.error.errorCode.number).to.equal(6001);
      expect(err.error.errorCode.code).to.equal(
        client.sunrise.client.program.idl["errors"][1].name
      );
      expect(err.program.equals(client.sunrise.client.program.programId)).is
        .true;
    }
    expect(failed).to.be.true;
  });

  it("can withdraw and burn gsol", async () => {
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.withdraw(new BN(withdrawalAmount)),
      []
    );

    const expectedGsol = stakerGsolBalance.subn(withdrawalAmount);
    const expectedBsol = vaultBsolBalance.subn(
      Math.floor(withdrawalAmount / (await client.poolTokenPrice()))
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.stakerGsolATA,
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.spl.beamVault,
      expectedBsol
    );
    stakerGsolBalance = expectedGsol;
    vaultBsolBalance = expectedBsol;
  });
});

describe("marinade-lp", () => {
  let sunriseClient: SunriseClient;
  let client: MarinadeLpClient;

  const mlpState = MarinadeLpClient.deriveStateAddress(sunrise.publicKey)[0];
  const staker = Keypair.generate();
  const stakerIdentity = new AnchorProvider(
    provider.connection,
    new Wallet(staker),
    {}
  );

  let vaultBalance: BN;
  let stakerGsolBalance: BN = new BN(0);

  const depositAmount = 10;
  const failedDepositAmount = 5;
  const withdrawalAmount = 5;

  it("can initialize a state", async () => {
    sunriseClient = await SunriseClient.get(sunrise.publicKey, provider);
    await sendAndConfirmTransaction(
      provider,
      await sunriseClient.registerBeam(mlpState),
      []
    );

    const treasury = Keypair.generate();
    client = await MarinadeLpClient.initialize(
      provider,
      provider.publicKey,
      sunrise.publicKey,
      treasury.publicKey,
      msolTokenAccount
    );

    await client.refresh();
    const info = client.account.pretty();
    expect(info.proxyState).to.equal(
      client.lp.marinade.marinadeStateAddress.toBase58()
    );
    expect(info.sunriseState).to.equal(sunrise.publicKey.toBase58());
    expect(info.vaultAuthorityBump).to.equal(
      client.vaultAuthority[1].toString()
    );
    expect(info.updateAuthority).to.equal(provider.publicKey.toBase58());

    vaultBalance = await tokenAccountBalance(provider, client.lp.beamVault);
  });

  it("Can update a state", async () => {
    const newTreasury = Keypair.generate();
    const updateParams = {
      updateAuthority: client.account.updateAuthority,
      sunriseState: client.account.sunriseState,
      vaultAuthorityBump: client.account.vaultAuthorityBump,
      treasury: newTreasury.publicKey,
      msolTokenAccount,
      marinadeState: client.account.proxyState,
    };
    await sendAndConfirmTransaction(
      provider,
      await client.update(provider.publicKey, updateParams),
      []
    );

    await client.refresh();
    expect(client.account.treasury.toBase58()).to.equal(
      newTreasury.publicKey.toBase58()
    );
  });

  it("can deposit and mint gsol", async () => {
    await fund(provider, staker.publicKey, 30);
    client = await MarinadeLpClient.get(client.state, stakerIdentity);
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.deposit(new BN(10)),
      []
    );

    const expectedGsol = stakerGsolBalance.addn(depositAmount);
    const expectedLpTokens = vaultBalance.addn(
      Math.floor(depositAmount / (await client.poolTokenPrice()))
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.stakerGsolATA,
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.lp.beamVault,
      expectedLpTokens
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedLpTokens;
  });

  it("can't deposit due to exceeding allocation", async () => {
    let failed = false;
    try {
      await sendAndConfirmTransaction(
        stakerIdentity,
        await client.deposit(new BN(failedDepositAmount)),
        []
      );
    } catch (_err) {
      failed = true;
      const err = AnchorError.parse(_err.logs);
      expect(err.error.errorCode.number).to.equal(6001);
      expect(err.error.errorCode.code).to.equal(
        client.sunrise.client.program.idl["errors"][1].name
      );
      expect(err.program.equals(client.sunrise.client.program.programId)).is
        .true;
    }
    expect(failed).to.be.true;
  });

  it("can withdraw and burn gsol", async () => {
    await sendAndConfirmTransaction(
      stakerIdentity,
      await client.withdraw(new BN(withdrawalAmount)),
      []
    );

    const expectedGsol = stakerGsolBalance.subn(withdrawalAmount);
    const expectedBsol = vaultBalance.subn(
      Math.floor(withdrawalAmount / (await client.poolTokenPrice()))
    );
    await expectTokenBalance(
      client.provider,
      client.sunrise.stakerGsolATA,
      expectedGsol
    );
    await expectTokenBalance(
      client.provider,
      client.lp.beamVault,
      expectedBsol
    );
    stakerGsolBalance = expectedGsol;
    vaultBalance = expectedBsol;
  });
});
