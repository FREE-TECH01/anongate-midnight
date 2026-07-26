import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import {
  createProofProvider,
  SucceedEntirely,
  type FinalizedTxData,
} from '@midnight-ntwrk/midnight-js-types';
import { createUnprovenCallTx, submitTxAsync } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { setNetworkId } from '@midnight-ntwrk/midnight-js-network-id';
import { BrowserZkConfigProvider } from './browser-zk-config';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(
    (hex.match(/.{1,2}/g) ?? []).map((byte) => parseInt(byte, 16)),
  );
}

export interface ContractCallResult {
  txId: string;
  memberCount: number;
}

export async function callJoinAllowlist(
  contractModule: any,
  contractAddress: string,
  secretCode: string,
  connectedAPI: ConnectedAPI,
): Promise<ContractCallResult> {
  console.log('[AnonGate] callJoinAllowlist invoked');

  const networkId = import.meta.env.VITE_NETWORK || 'preview';
  setNetworkId(networkId);

  const zkConfigProvider = new BrowserZkConfigProvider();

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  const coinPublicKey = shieldedAddresses.shieldedCoinPublicKey;
  const walletEncryptionPublicKey = shieldedAddresses.shieldedEncryptionPublicKey;

  const keyMaterialProvider = zkConfigProvider.asKeyMaterialProvider();

  let provingProvider: any = null;
  let proofProvider: any = null;

  try {
    provingProvider = await connectedAPI.getProvingProvider(keyMaterialProvider);
    if (provingProvider && typeof provingProvider.prove === 'function') {
      proofProvider = createProofProvider(provingProvider);
    }
  } catch {
    // Lace proving provider not available — fall back to proof server
  }

  if (!proofProvider) {
    const proofServerUrl =
      networkId === 'preprod'
        ? 'https://proof-server.preprod.midnight.network'
        : 'https://proof-server.preview.midnight.network';
    proofProvider = httpClientProofProvider(proofServerUrl, zkConfigProvider);
  }

  const indexerUrl =
    networkId === 'preprod'
      ? 'https://indexer.preprod.midnight.network/api/v4/graphql'
      : 'https://indexer.preview.midnight.network/api/v4/graphql';
  const indexerWsUrl =
    networkId === 'preprod'
      ? 'wss://indexer.preprod.midnight.network/api/v4/graphql/ws'
      : 'wss://indexer.preview.midnight.network/api/v4/graphql/ws';

  const publicDataProvider = indexerPublicDataProvider(indexerUrl, indexerWsUrl);

  const walletProvider = {
    getCoinPublicKey: () => coinPublicKey,
    getEncryptionPublicKey: () => walletEncryptionPublicKey,
    balanceTx: async (tx: any) => {
      const serialized = tx.serialize() as Uint8Array;
      const hex = bytesToHex(serialized);
      const result = await connectedAPI.balanceUnsealedTransaction(hex);
      const balancedBytes = hexToBytes(result.tx);
      return (tx.constructor as any).deserialize(
        'signature',
        'proof',
        'binding',
        balancedBytes,
      );
    },
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      const serialized = tx.serialize() as Uint8Array;
      const hex = bytesToHex(serialized);
      await connectedAPI.submitTransaction(hex);
      const ids = tx.identifiers() as string[];
      return ids[0] ?? tx.hash();
    },
  };

  const privateStateProvider = {
    setContractAddress: () => {},
    set: async () => {},
    get: async () => null as any,
    remove: async () => {},
    clear: async () => {},
    setSigningKey: async () => {},
    getSigningKey: async () => null as any,
    removeSigningKey: async () => {},
    clearSigningKeys: async () => {},
    exportPrivateStates: async () => ({
      format: 'midnight-private-state-export' as const,
      encryptedPayload: '',
      salt: '',
    }),
    importPrivateStates: async () => ({ imported: 0, skipped: 0, overwritten: 0 }),
    exportSigningKeys: async () => ({
      format: 'midnight-signing-key-export' as const,
      encryptedPayload: '',
      salt: '',
    }),
    importSigningKeys: async () => ({ imported: 0, skipped: 0, overwritten: 0 }),
  };

  const unprovenTxData = await createUnprovenCallTx(
    { zkConfigProvider, publicDataProvider, walletProvider } as any,
    {
      compiledContract: contractModule.compiledContract,
      contractAddress,
      circuitId: 'joinAllowlist' as any,
      args: [secretCode],
      coinPublicKey,
    } as any,
  );

  let memberCountBefore = 0;
  try {
    const beforeState = await publicDataProvider.queryContractState(contractAddress);
    if (beforeState?.data) {
      const beforeLedger = contractModule.AnonGate.ledger(beforeState.data);
      memberCountBefore = Number(beforeLedger.memberCount);
    }
  } catch {
    // best effort — use 0 as fallback
  }

  const providers = {
    zkConfigProvider,
    publicDataProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
    privateStateProvider,
  } as any;

  const txId = await submitTxAsync(providers, {
    unprovenTx: (unprovenTxData as any).private?.unprovenTx,
    circuitId: 'joinAllowlist' as any,
  });

  console.log('[AnonGate] Transaction submitted via Lace:', txId);

  let finalized: FinalizedTxData | null = null;
  try {
    finalized = await Promise.race([
      publicDataProvider.watchForTxData(txId),
      new Promise<FinalizedTxData>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for transaction finalization')), 30_000),
      ),
    ]);
    console.log('[AnonGate] Transaction finalized:', finalized.status);
  } catch {
    console.warn('[AnonGate] Transaction not yet finalized on chain — will poll for state changes...');
  }

  if (finalized && finalized.status !== SucceedEntirely) {
    throw new Error(
      `Transaction was not fully successful (status: ${finalized.status}). ` +
        'The on-chain state was not updated.',
    );
  }

  let memberCount = memberCountBefore;
  for (let attempt = 0; attempt < 10; attempt++) {
    const state = await publicDataProvider.queryContractState(contractAddress);
    if (state?.data) {
      const ledgerState = contractModule.AnonGate.ledger(state.data);
      memberCount = Number(ledgerState.memberCount);
      if (memberCount > memberCountBefore) {
        console.log('[AnonGate] Member count increased from', memberCountBefore, 'to', memberCount);
        break;
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return {
    txId: finalized?.txId ?? txId,
    memberCount,
  };
}
