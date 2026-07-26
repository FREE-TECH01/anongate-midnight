import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { createUnprovenCallTx, submitTx } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
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
  const zkConfigProvider = new BrowserZkConfigProvider();

  const shieldedAddresses = await connectedAPI.getShieldedAddresses();
  const coinPublicKey = shieldedAddresses.shieldedCoinPublicKey;
  const walletEncryptionPublicKey = shieldedAddresses.shieldedEncryptionPublicKey;

  const keyMaterialProvider = zkConfigProvider.asKeyMaterialProvider();
  const provingProvider = await connectedAPI.getProvingProvider(keyMaterialProvider);
  const proofProvider = createProofProvider(provingProvider);

  const networkId = import.meta.env.VITE_NETWORK || 'preview';
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
      return tx.hash();
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

  const finalized = await submitTx(
    {
      zkConfigProvider,
      publicDataProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
      privateStateProvider,
    } as any,
    {
      unprovenTx: (unprovenTxData as any).unprovenTx,
      circuitId: 'joinAllowlist' as any,
    },
  );

  const state = await publicDataProvider.queryContractState(contractAddress);
  const ledgerState = contractModule.AnonGate.ledger(state!.data);

  return {
    txId: (finalized as any).public?.txId ?? 'submitted',
    memberCount: Number(ledgerState.memberCount),
  };
}
