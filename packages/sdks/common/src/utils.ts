import { AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Connection, PublicKey } from "@solana/web3.js";
import { STAKE_PROGRAM_ID } from "./constants";

const enum Seeds {
  VAULT_AUTHORITY = "vault-authority",
}

const BNOrNull = (
  value: ConstructorParameters<typeof BN>[0] | null,
): BN | null => (value === null ? null : new BN(value));

const web3PubKeyOrNull = (
  value: ConstructorParameters<typeof PublicKey>[0] | null,
): PublicKey | null => (value === null ? null : new PublicKey(value));

const U64_MAX = new BN("ffffffffffffffff", 16);

export interface ParsedStakeAccountInfo {
  address: PublicKey;
  ownerAddress: PublicKey;
  authorizedStakerAddress: PublicKey | null;
  authorizedWithdrawerAddress: PublicKey | null;
  voterAddress: PublicKey | null;
  activationEpoch: BN | null;
  deactivationEpoch: BN | null;
  isCoolingDown: boolean;
  isLockedUp: boolean;
  balanceLamports: BN | null;
  stakedLamports: BN | null;
}

export async function getParsedStakeAccountInfo(
  providerOrConnection: AnchorProvider | Connection,
  stakeAccountAddress: PublicKey,
): Promise<ParsedStakeAccountInfo> {
  const connection =
    providerOrConnection instanceof Connection
      ? providerOrConnection
      : providerOrConnection.connection;
  const { value: stakeAccountInfo } =
    await connection.getParsedAccountInfo(stakeAccountAddress);

  if (!stakeAccountInfo) {
    throw new Error(
      `Failed to find the stake account ${stakeAccountAddress.toBase58()}`,
    );
  }

  if (!stakeAccountInfo.owner.equals(STAKE_PROGRAM_ID)) {
    throw new Error(
      `${stakeAccountAddress.toBase58()} is not a stake account because owner is ${
        stakeAccountInfo.owner
      }`,
    );
  }

  if (!stakeAccountInfo.data || stakeAccountInfo.data instanceof Buffer) {
    throw new Error("Failed to parse the stake account data");
  }

  const { parsed: parsedData } = stakeAccountInfo.data;

  const activationEpoch = BNOrNull(
    parsedData?.info?.stake?.delegation?.activationEpoch ?? null,
  );
  const deactivationEpoch = BNOrNull(
    parsedData?.info?.stake?.delegation?.deactivationEpoch ?? null,
  );
  const lockup = parsedData?.info?.meta?.lockup;
  const balanceLamports = BNOrNull(stakeAccountInfo.lamports);
  const stakedLamports = BNOrNull(
    parsedData?.info?.stake?.delegation.stake ?? null,
  );
  const { epoch: currentEpoch } = await connection.getEpochInfo();
  const currentUnixTimestamp = Date.now() / 1000;

  return {
    address: stakeAccountAddress,
    ownerAddress: stakeAccountInfo.owner,
    authorizedStakerAddress: web3PubKeyOrNull(
      parsedData?.info?.meta?.authorized?.staker ?? null,
    ),
    authorizedWithdrawerAddress: web3PubKeyOrNull(
      parsedData?.info?.meta?.authorized?.withdrawer ?? null,
    ),
    voterAddress: web3PubKeyOrNull(
      parsedData?.info?.stake?.delegation?.voter ?? null,
    ),
    activationEpoch,
    deactivationEpoch,
    isCoolingDown: deactivationEpoch ? !deactivationEpoch.eq(U64_MAX) : false,
    isLockedUp:
      lockup?.custodian &&
      lockup?.custodian !== "" &&
      (lockup?.epoch > currentEpoch ||
        lockup?.unixTimestamp > currentUnixTimestamp),
    balanceLamports,
    stakedLamports,
  };
}

export const deriveAuthorityAddress = (
  pid: PublicKey,
  state: PublicKey,
): [PublicKey, number] => {
  return PublicKey.findProgramAddressSync(
    [state.toBuffer(), Buffer.from(Seeds.VAULT_AUTHORITY)],
    pid,
  );
};
