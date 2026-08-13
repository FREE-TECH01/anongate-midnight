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

export interface AddMemberResult {
  txId: string;
}

interface BrowserProviders {
  zkConfigProvider: BrowserZkConfigProvider;
  publicDataProvider: any;
  proofProvider: any;
  walletProvider: any;
  midnightProvider: any;
  privateStateProvider: any;
}

async function createBrowserProviders(connectedAPI: ConnectedAPI): Promise<BrowserProviders> {
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
    // Lace proving is optional; the public proof server is the fallback.
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
      const result = await connectedAPI.balanceUnsealedTransaction(bytesToHex(serialized));
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
      await connectedAPI.submitTransaction(bytesToHex(serialized));
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

  return {
    zkConfigProvider,
    publicDataProvider,
    proofProvider,
    walletProvider,
    midnightProvider,
    privateStateProvider,
  };
}

async function waitForFinalization(
  publicDataProvider: any,
  txId: string,
): Promise<FinalizedTxData | null> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      publicDataProvider.watchForTxData(txId),
      new Promise<FinalizedTxData>((_, reject) => {
        timeoutId = setTimeout(
          () => reject(new Error('Timed out waiting for transaction finalization')),
          30_000,
        );
      }),
    ]);
  } catch {
    console.warn('[AnonGate] Transaction not yet finalized — polling public state instead.');
    return null;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function submitCircuit(
  contractModule: any,
  contractAddress: string,
  circuitId: string,
  args: unknown[],
  providers: BrowserProviders,
): Promise<{ txId: string; finalized: FinalizedTxData | null }> {
  const unprovenTxData = await createUnprovenCallTx(
    {
      zkConfigProvider: providers.zkConfigProvider,
      publicDataProvider: providers.publicDataProvider,
      walletProvider: providers.walletProvider,
    } as any,
    {
      compiledContract: contractModule.compiledContract,
      contractAddress,
      circuitId: circuitId as any,
      args,
      coinPublicKey: providers.walletProvider.getCoinPublicKey(),
    } as any,
  );

  const unprovenTx = (unprovenTxData as any).private?.unprovenTx;
  if (!unprovenTx) {
    throw new Error('Midnight SDK did not create a transaction for this circuit.');
  }

  const txId = await submitTxAsync(
    providers as any,
    {
      unprovenTx,
      circuitId: circuitId as any,
    },
  );
  console.log(`[AnonGate] ${circuitId} transaction submitted:`, txId);

  const finalized = await waitForFinalization(providers.publicDataProvider, txId);
  if (finalized && finalized.status !== SucceedEntirely) {
    throw new Error(
      `Transaction was not fully successful (status: ${finalized.status}). ` +
        'The on-chain state was not updated.',
    );
  }

  return { txId: finalized?.txId ?? txId, finalized };
}

function credentialHash(contractModule: any, credential: string): Uint8Array {
  const hash = contractModule.AnonGate.pureCircuits?.credentialHash?.(credential);
  if (!(hash instanceof Uint8Array) || hash.length !== 32) {
    throw new Error('The compiled contract cannot derive a credential hash. Recompile it first.');
  }
  return hash;
}

export async function callAddMember(
  contractModule: any,
  contractAddress: string,
  credential: string,
  connectedAPI: ConnectedAPI,
): Promise<AddMemberResult> {
  const providers = await createBrowserProviders(connectedAPI);
  const currentState = await providers.publicDataProvider.queryContractState(contractAddress);
  const currentLedger = currentState?.data ? contractModule.AnonGate.ledger(currentState.data) : null;
  if (!currentLedger?.memberRoot?.findPathForLeaf) {
    throw new Error(
      'The configured address is the legacy Level 2 contract. Set VITE_CONTRACT_ADDRESS to a Level 3 deployment.',
    );
  }
  const hash = credentialHash(contractModule, credential);
  const result = await submitCircuit(
    contractModule,
    contractAddress,
    'addMember',
    [hash],
    providers,
  );

  return { txId: result.txId };
}

export async function callJoinAllowlist(
  contractModule: any,
  contractAddress: string,
  credential: string,
  connectedAPI: ConnectedAPI,
): Promise<ContractCallResult> {
  const providers = await createBrowserProviders(connectedAPI);
  const beforeState = await providers.publicDataProvider.queryContractState(contractAddress);
  if (!beforeState?.data) {
    throw new Error('The allowlist contract has no readable state on this network.');
  }

  const beforeLedger = contractModule.AnonGate.ledger(beforeState.data);
  if (!beforeLedger.memberRoot?.findPathForLeaf) {
    throw new Error(
      'The configured address is the legacy Level 2 contract. Set VITE_CONTRACT_ADDRESS to a Level 3 deployment.',
    );
  }
  const beforeCount = Number(beforeLedger.memberCount);
  const hash = credentialHash(contractModule, credential);
  const membershipPath = beforeLedger.memberRoot?.findPathForLeaf?.(hash);
  if (!membershipPath) {
    throw new Error('This credential is not in the approved allowlist.');
  }

  const result = await submitCircuit(
    contractModule,
    contractAddress,
    'joinAllowlist',
    [credential, membershipPath],
    providers,
  );

  let memberCount = beforeCount;
  for (let attempt = 0; attempt < 10; attempt++) {
    const state = await providers.publicDataProvider.queryContractState(contractAddress);
    if (state?.data) {
      const ledgerState = contractModule.AnonGate.ledger(state.data);
      memberCount = Number(ledgerState.memberCount);
      if (memberCount > beforeCount) break;
    }
    await new Promise((resolve) => setTimeout(resolve, 2_000));
  }

  return {
    txId: result.txId,
    memberCount,
  };
}
