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
import { type AnchorProvider } from "@coral-xyz/anchor";
import { SunriseClient } from "../sdks/sunrise/src";

export const sendAndConfirmTransaction = (
  provider: AnchorProvider,
  transaction: Transaction,
  signers?: Signer[],
  opts?: ConfirmOptions
): Promise<string> => {
  return provider.sendAndConfirm(transaction, signers, opts).catch((e) => {
    throw e;
  });
};

export const airdropTo = async (
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
  await airdropTo(provider, authority.publicKey, 1);
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

export const createGSolTokenAccount = async (
  client: SunriseClient,
  owner: PublicKey
): Promise<void> => {
  let account = PublicKey.findProgramAddressSync(
    [
      owner.toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      client.account.gsolMint.toBuffer(),
    ],
    ASSOCIATED_TOKEN_PROGRAM_ID
  )[0];

  let tx = new Transaction().add(
    createAssociatedTokenAccountIdempotentInstruction(
      client.provider.publicKey,
      account,
      owner,
      client.account.gsolMint
    )
  );

  await sendAndConfirmTransaction(client.provider, tx);
};
