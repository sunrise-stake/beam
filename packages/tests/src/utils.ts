import {
  PublicKey,
  Keypair,
  Transaction,
  type Signer,
  type ConfirmOptions,
  SystemProgram,
} from "@solana/web3.js";
import {
  AuthorityType,
  createMint,
  createAssociatedTokenAccountIdempotentInstruction,
  setAuthority,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { type AnchorProvider, AnchorError } from "@coral-xyz/anchor";
import chai from "chai";
import BN from "bn.js";

import chaiAsPromised from "chai-as-promised";
import { sendAndConfirmChecked } from "@sunrisestake/beams-common";
import { Idl } from "@coral-xyz/anchor/dist/cjs/idl";

chai.use(chaiAsPromised);
const { expect } = chai;

// Set in anchor.toml
const SLOTS_IN_EPOCH = 32;

const LOG_LEVELS = ["error", "warn", "info", "debug", "trace"] as const;
type LOG_LEVEL = (typeof LOG_LEVELS)[number];

const logLevel: LOG_LEVEL = (process.env.LOG_LEVEL ?? "error") as LOG_LEVEL;

const logAtLevel =
  (level = logLevel) =>
  (...args: any[]) => {
    if (LOG_LEVELS.indexOf(level) <= LOG_LEVELS.indexOf(logLevel)) {
      console.log(level, ...args);
    }
  };

const log = logAtLevel();

export const deriveATA = (owner: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];

export const tokenAccountBalance = async (
  provider: AnchorProvider,
  address: PublicKey,
): Promise<BN> =>
  await provider.connection
    .getTokenAccountBalance(address)
    .then((res) => new BN(res.value.amount));

export const solBalance = async (
  provider: AnchorProvider,
  address?: PublicKey,
): Promise<BN> => {
  const balance = await provider.connection.getBalance(
    address ?? provider.publicKey,
  );
  // cast to string then convert to BN as BN has trouble with large values of type number in its constructor
  return new BN(`${balance}`);
};

export const expectAssociatedTokenAccountBalanceA = async (
  provider: AnchorProvider,
  owner: PublicKey,
  mint: PublicKey,
  expectedAmount: number | BN,
  tolerance = 0,
) => {
  expectAmount(
    await tokenAccountBalance(provider, deriveATA(owner, mint)),
    expectedAmount,
    tolerance,
  );
};

export const expectTokenBalance = async (
  provider: AnchorProvider,
  address: PublicKey,
  expectedAmount: number | BN,
  tolerance = 0,
) => {
  const actualAmount = await tokenAccountBalance(provider, address);
  expectAmount(actualAmount, expectedAmount, tolerance);
};

// These functions use string equality to allow large numbers.
// BN(number) throws assertion errors if the number is large
export const expectStakerSolBalance = async (
  provider: AnchorProvider,
  expectedAmount: number | BN,
  tolerance = 0, // Allow for a tolerance as the balance depends on the fees which are unstable at the beginning of a test validator
) => {
  const actualAmount = await solBalance(provider);
  expectAmount(actualAmount, expectedAmount, tolerance);
};

export const expectAmount = (
  actualAmount: number | BN,
  expectedAmount: number | BN,
  tolerance = 0,
) => {
  const actualAmountBN = new BN(actualAmount);
  const minExpected = new BN(expectedAmount).subn(tolerance);
  const maxExpected = new BN(expectedAmount).addn(tolerance);

  expect(actualAmountBN.gte(minExpected)).to.be.true;
  expect(actualAmountBN.lte(maxExpected)).to.be.true;
};

export const waitForNextEpoch = async (provider: AnchorProvider) => {
  const startingEpoch = await provider.connection.getEpochInfo();
  const nextEpoch = startingEpoch.epoch + 1;

  const startSlot = startingEpoch.slotIndex;
  let subscriptionId = 0;

  await new Promise((resolve) => {
    subscriptionId = provider.connection.onSlotChange((slotInfo) => {
      if (slotInfo.slot % SLOTS_IN_EPOCH === 1 && slotInfo.slot > startSlot) {
        void provider.connection.getEpochInfo().then((currentEpoch) => {
          if (currentEpoch.epoch === nextEpoch) {
            resolve(slotInfo.slot);
          }
        });
      }
    });
  });

  await provider.connection.removeSlotChangeListener(subscriptionId);
};

export const sendAndConfirmTransaction = (
  provider: AnchorProvider,
  transaction: Transaction,
  signers: Signer[] = [],
  opts: ConfirmOptions = {},
  logOnFailure = true,
): Promise<string> =>
  provider.sendAndConfirm(transaction, signers, opts).catch((err) => {
    if (logOnFailure) {
      logAtLevel("error")(err);
    }
    throw err;
  });

export const fund = async (
  provider: AnchorProvider,
  account: PublicKey,
  amount: number,
): Promise<void> => {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: account,
      lamports: amount * 1_000_000_000,
    }),
  );
  await sendAndConfirmTransaction(provider, transaction);
};

export const initializeTestMint = async (
  provider: AnchorProvider,
): Promise<{
  mint: PublicKey;
  authority: Keypair;
}> => {
  const mint = Keypair.generate();
  const authority = Keypair.generate();
  await fund(provider, authority.publicKey, 1);
  const mintAddress = await createMint(
    provider.connection,
    authority,
    authority.publicKey,
    authority.publicKey,
    0,
    mint,
  );
  return {
    mint: mintAddress,
    authority,
  };
};

export const transferMintAuthority = async (
  provider: AnchorProvider,
  mint: PublicKey,
  prevAuth: Keypair,
  newAuth: PublicKey,
): Promise<void> => {
  await setAuthority(
    provider.connection,
    prevAuth,
    mint,
    prevAuth,
    AuthorityType.MintTokens,
    newAuth,
  );
};

export const createTokenAccount = async (
  provider: AnchorProvider,
  owner: PublicKey,
  mint: PublicKey,
): Promise<PublicKey> => {
  const account = deriveATA(owner, mint);

  const tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      provider.publicKey,
      account,
      owner,
      mint,
    ),
  );

  await sendAndConfirmTransaction(provider, tx);

  return account;
};

export const expectAnchorError =
  (errorCode: number, errorName: string, programId: PublicKey) =>
  (anchorErr: any) => {
    logAtLevel("trace")(anchorErr); // only log if we are tracing, otherwise we expect an error so don't log it
    const normalisedError = AnchorError.parse(anchorErr.logs);
    expect(normalisedError).not.to.be.null;
    expect(normalisedError!.error.errorCode.code).to.equal(errorName);
    expect(normalisedError!.error.errorCode.number).to.equal(errorCode);
    expect(normalisedError!.program.equals(programId)).is.true;
  };

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Chai {
    interface Assertion {
      rejectedWithAnchorError(
        idl: Idl,
        code: number,
        programId: PublicKey,
      ): Promise<void>;
    }
  }
}
chai.Assertion.addMethod(
  "rejectedWithAnchorError",
  function (idl: Idl, code: number, programId: PublicKey) {
    const name = idl.errors?.find((e) => e.code === code)?.name;
    if (!name) throw new Error(`No error with code ${code} found in IDL`);
    return expect(this._obj)
      .to.be.rejectedWith(/* some base class or message */)
      .then(expectAnchorError(code, name, programId));
  },
);
