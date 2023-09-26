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
import {AnchorError, type AnchorProvider} from "@coral-xyz/anchor";
import { expect } from "chai";
import BN from "bn.js";
import * as fs from "fs";

// Set in anchor.toml
const SLOTS_IN_EPOCH = 32;

export const deriveATA = (owner: PublicKey, mint: PublicKey) =>
  PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];

export const tokenAccountBalance = async (
  provider: AnchorProvider,
  address: PublicKey
): Promise<BN> =>
  await provider.connection
    .getTokenAccountBalance(address)
    .then((res) => new BN(res.value.amount));

export const solBalance = async (
  provider: AnchorProvider,
  address?: PublicKey
): Promise<BN> => {
  const balance = await provider.connection.getBalance(
    address ?? provider.publicKey
  );
  // cast to string then convert to BN as BN has trouble with large values of type number in its constructor
  return new BN(`${balance}`);
};

export const expectAssociatedTokenAccountBalanceA = async (
  provider: AnchorProvider,
  owner: PublicKey,
  mint: PublicKey,
  expectedAmount: number | BN,
  tolerance = 0
) => {
  expectAmount(
    await tokenAccountBalance(provider, deriveATA(owner, mint)),
    expectedAmount,
    tolerance
  );
};

export const expectTokenBalance = async (
  provider: AnchorProvider,
  address: PublicKey,
  expectedAmount: number | BN,
  tolerance = 0
) => {
  let actualAmount = await tokenAccountBalance(provider, address);
  expectAmount(actualAmount, expectedAmount, tolerance);
};

// These functions use string equality to allow large numbers.
// BN(number) throws assertion errors if the number is large
export const expectStakerSolBalance = async (
  provider: AnchorProvider,
  expectedAmount: number | BN,
  tolerance = 0 // Allow for a tolerance as the balance depends on the fees which are unstable at the beginning of a test validator
) => {
  const actualAmount = await solBalance(provider);
  expectAmount(actualAmount, expectedAmount, tolerance);
};

export const expectAmount = (
  actualAmount: number | BN,
  expectedAmount: number | BN,
  tolerance = 0
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

export const createKeypairFromFile = (path: string): Keypair => {
  const secretKeyString = fs.readFileSync(path, { encoding: "utf8" });
  const secretKey = Uint8Array.from(JSON.parse(secretKeyString));
  return Keypair.fromSecretKey(secretKey);
};

export const sendAndConfirmTransaction = (
  provider: AnchorProvider,
  transaction: Transaction,
  signers: Signer[] = [],
  opts: ConfirmOptions = {}
): Promise<string> => {
  return provider.sendAndConfirm(transaction, signers, opts);
};

export const fund = async (
  provider: AnchorProvider,
  account: PublicKey,
  amount: number
): Promise<void> => {
  const transaction = new Transaction().add(
    SystemProgram.transfer({
      fromPubkey: provider.publicKey,
      toPubkey: account,
      lamports: amount * 1_000_000_000,
    })
  );
  await sendAndConfirmTransaction(provider, transaction);
};

export const initializeTestMint = async (
  provider: AnchorProvider
): Promise<{
  mint: PublicKey;
  authority: Keypair;
}> => {
  let mint = Keypair.generate();
  let authority = Keypair.generate();
  await fund(provider, authority.publicKey, 1);
  const mintAddress = await createMint(
    provider.connection,
    authority,
    authority.publicKey,
    authority.publicKey,
    0,
    mint
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
  newAuth: PublicKey
): Promise<void> => {
  await setAuthority(
    provider.connection,
    prevAuth,
    mint,
    prevAuth,
    AuthorityType.MintTokens,
    newAuth
  );
};

export const createTokenAccount = async (
  provider: AnchorProvider,
  owner: PublicKey,
  mint: PublicKey
): Promise<void> => {
  let account = deriveATA(owner, mint);

  let tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      provider.publicKey,
      account,
      owner,
      mint
    )
  );

  await sendAndConfirmTransaction(provider, tx);
};

export const expectAnchorError = (errorCode: number, errorName: string, programId: any) => (err: any) => {
  const anchorErr = AnchorError.parse(err.logs);
  expect(anchorErr!.error.errorCode.code).to.equal(errorName);
  expect(anchorErr!.error.errorCode.number).to.equal(errorCode);
  expect(anchorErr!.program.equals(programId)).is.true;
};

