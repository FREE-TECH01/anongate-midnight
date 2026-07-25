import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

import { createWallet, persistWalletState, type WalletContext } from './wallet';
import { getDeployment, getOrCreateSeed, resolveNetwork } from './network';

// @ts-expect-error Required for wallet sync
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'helloWorldPrivateState';

async function createProviders(walletCtx: WalletContext, networkConfig: ReturnType<typeof resolveNetwork>['config']) {
  const walletProvider = {
    getCoinPublicKey: () => walletCtx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => walletCtx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await walletCtx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: walletCtx.shieldedSecretKeys, dustSecretKey: walletCtx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return walletCtx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => walletCtx.wallet.submitTransaction(tx) as any,
  };

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'hello-world');
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);

  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'hello-world-state',
      accountId: walletCtx.unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => 'Local-Devnet-Development-Placeholder-1',
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

export async function submitJoin(secretCode: string) {
  if (!secretCode?.trim()) {
    throw new Error('Secret code is required');
  }

  const { network, config: networkConfig } = resolveNetwork();
  const seed = getOrCreateSeed(network);
  const deployment = getDeployment(network);

  if (!deployment) {
    throw new Error(`No deployment found for ${network}`);
  }

  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const zkConfigPath = path.resolve(__dirname, '..', 'contracts', 'managed', 'hello-world');
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');

  if (!fs.existsSync(contractPath)) {
    throw new Error('Compiled contract missing. Run npm run compile first.');
  }

  const AnonGate = await import(pathToFileURL(contractPath).href);
  const compiledContract = CompiledContract.make('hello-world', AnonGate.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  const walletCtx = await createWallet({ network, networkConfig, seed });
  try {
    await walletCtx.wallet.waitForSyncedState();
    const providers = await createProviders(walletCtx, networkConfig);

    const deployed: any = await findDeployedContract(providers, {
      compiledContract: compiledContract as any,
      contractAddress: deployment.address,
      privateStateId: PRIVATE_STATE_ID,
      initialPrivateState: {},
    });

    const tx = await deployed.callTx.joinAllowlist(secretCode.trim());
    const state = await providers.publicDataProvider.queryContractState(deployment.address);
    const ledgerState = AnonGate.ledger(state!.data);

    return {
      ok: true,
      txId: tx.public.txId,
      memberCount: Number(ledgerState.memberCount),
      network,
      message: 'Submission accepted. The private value stays local and is never shown on screen.',
    };
  } finally {
    await persistWalletState(network, walletCtx);
    await walletCtx.wallet.stop();
  }
}

function isMain(): boolean {
  try {
    const here = fileURLToPath(import.meta.url);
    const invoked = process.argv[1] && fs.realpathSync(process.argv[1]);
    return invoked === fs.realpathSync(here);
  } catch {
    return false;
  }
}

if (isMain()) {
  const secretCode = process.argv[2]?.trim() ?? '';
  submitJoin(secretCode)
    .then((result) => {
      console.log(JSON.stringify(result));
    })
    .catch((error) => {
      console.error(JSON.stringify({ ok: false, error: error instanceof Error ? error.message : String(error) }));
      process.exit(1);
    });
}
