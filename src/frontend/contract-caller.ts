import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import { createProofProvider } from '@midnight-ntwrk/midnight-js-types';
import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { BrowserZkConfigProvider } from './browser-zk-config';

const PRIVATE_STATE_ID = 'helloWorldPrivateState';

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

  const walletProvider = {
    getCoinPublicKey: () => shieldedAddresses.shieldedCoinPublicKey,
    getEncryptionPublicKey: () => shieldedAddresses.shieldedEncryptionPublicKey,
    balanceTx: async (tx: any, _ttl?: Date) => {
      const serialized = typeof tx === 'string' ? tx : JSON.stringify(tx);
      const result = await connectedAPI.balanceUnsealedTransaction(serialized);
      return JSON.parse(result.tx);
    },
  };

  const midnightProvider = {
    submitTx: async (tx: any) => {
      const serialized = typeof tx === 'string' ? tx : JSON.stringify(tx);
      await connectedAPI.submitTransaction(serialized);
      return 'submitted' as any;
    },
  };

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

  const privateStateProvider = {
    setContractAddress: () => {},
    set: async () => {},
    get: async () => null,
    remove: async () => {},
    clear: async () => {},
    setSigningKey: async () => {},
    getSigningKey: async () => null,
    removeSigningKey: async () => {},
    clearSigningKeys: async () => {},
    exportPrivateStates: async () => ({ format: 'midnight-private-state-export' as const, encryptedPayload: '', salt: '' }),
    importPrivateStates: async () => ({ imported: 0, skipped: 0, overwritten: 0 }),
    exportSigningKeys: async () => ({ format: 'midnight-signing-key-export' as const, encryptedPayload: '', salt: '' }),
    importSigningKeys: async () => ({ imported: 0, skipped: 0, overwritten: 0 }),
  };

  const deployed: any = await findDeployedContract(
    {
      privateStateProvider,
      publicDataProvider,
      zkConfigProvider,
      proofProvider,
      walletProvider,
      midnightProvider,
    } as any,
    {
      compiledContract: contractModule.compiledContract,
      contractAddress,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    },
  );

  const tx = await deployed.callTx.joinAllowlist(secretCode);

  const state = await publicDataProvider.queryContractState(contractAddress);
  const ledgerState = contractModule.AnonGate.ledger(state!.data);

  return {
    txId: tx.public.txId,
    memberCount: Number(ledgerState.memberCount),
  };
}
