import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { WebSocket } from 'ws';

import { findDeployedContract } from '@midnight-ntwrk/midnight-js-contracts';
import { httpClientProofProvider } from '@midnight-ntwrk/midnight-js-http-client-proof-provider';
import { indexerPublicDataProvider } from '@midnight-ntwrk/midnight-js-indexer-public-data-provider';
import { levelPrivateStateProvider } from '@midnight-ntwrk/midnight-js-level-private-state-provider';
import { NodeZkConfigProvider } from '@midnight-ntwrk/midnight-js-node-zk-config-provider';
import { resolveNetwork, getOrCreateSeed, getDeployment } from '../src/network';
import { createWallet, type WalletContext } from '../src/wallet';
import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

// @ts-expect-error wallet sync requires WebSocket
globalThis.WebSocket = WebSocket;

const PRIVATE_STATE_ID = 'helloWorldPrivateState';
const { network, config: networkConfig } = resolveNetwork();
const SEED = getOrCreateSeed(network);

let walletCtx: WalletContext;
let providers: any;
let deployed: any;
let AnonGate: any;

async function createProviders(ctx: WalletContext) {
  const walletProvider = {
    getCoinPublicKey: () => ctx.shieldedSecretKeys.coinPublicKey,
    getEncryptionPublicKey: () => ctx.shieldedSecretKeys.encryptionPublicKey,
    async balanceTx(tx: any, ttl?: Date) {
      const recipe = await ctx.wallet.balanceUnboundTransaction(
        tx,
        { shieldedSecretKeys: ctx.shieldedSecretKeys, dustSecretKey: ctx.dustSecretKey },
        { ttl: ttl ?? new Date(Date.now() + 30 * 60 * 1000) },
      );
      return ctx.wallet.finalizeRecipe(recipe);
    },
    submitTx: (tx: any) => ctx.wallet.submitTransaction(tx) as any,
  };
  const zkConfigPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '..', 'contracts', 'managed', 'hello-world',
  );
  const zkConfigProvider = new NodeZkConfigProvider(zkConfigPath);
  return {
    privateStateProvider: levelPrivateStateProvider({
      privateStateStoreName: 'hello-world-state',
      accountId: ctx.unshieldedKeystore.getBech32Address().toString(),
      privateStoragePasswordProvider: () => 'Local-Devnet-Development-Placeholder-1',
    }),
    publicDataProvider: indexerPublicDataProvider(networkConfig.indexer, networkConfig.indexerWS),
    zkConfigProvider,
    proofProvider: httpClientProofProvider(networkConfig.proofServer, zkConfigProvider),
    walletProvider,
    midnightProvider: walletProvider,
  };
}

async function readMemberCount(deployment: { address: string }) {
  const state = await providers.publicDataProvider.queryContractState(deployment.address);
  const ledgerState = AnonGate.ledger(state!.data);
  return ledgerState.memberCount as bigint;
}

beforeAll(async () => {
  const zkConfigPath = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)), '..', 'contracts', 'managed', 'hello-world',
  );
  const contractPath = path.join(zkConfigPath, 'contract', 'index.js');
  if (!fs.existsSync(contractPath)) throw new Error('Compiled contract missing — run `npm run compile`.');
  AnonGate = await import(pathToFileURL(contractPath).href);

  const compiledContract = CompiledContract.make('hello-world', AnonGate.Contract).pipe(
    CompiledContract.withVacantWitnesses,
    CompiledContract.withCompiledFileAssets(zkConfigPath),
  );

  walletCtx = await createWallet({ network, networkConfig, seed: SEED });
  await walletCtx.wallet.waitForSyncedState();
  providers = await createProviders(walletCtx);

  const deployment = getDeployment(network);
  if (!deployment) throw new Error(`No deployment on file for ${network}. Run npm run setup first.`);

  deployed = await findDeployedContract(providers, {
    contractAddress: deployment.address,
    compiledContract: compiledContract as any,
    privateStateId: PRIVATE_STATE_ID,
    initialPrivateState: {},
  });
}, 120_000);

afterAll(async () => {
  await walletCtx?.wallet.stop();
});

describe('AnonGate — joinAllowlist circuit', () => {
  it('increments memberCount by 1 on a single join', async () => {
    const deployment = getDeployment(network)!;
    const before = await readMemberCount(deployment);
    await deployed.callTx.joinAllowlist('test-secret-alpha');
    const after = await readMemberCount(deployment);
    expect(after).toBe(before + 1n);
  }, 90_000);

  it('never exposes the private secretCode in public ledger state', async () => {
    const deployment = getDeployment(network)!;
    const state = await providers.publicDataProvider.queryContractState(deployment.address);
    const ledgerState = AnonGate.ledger(state!.data);
    const keys = Object.keys(ledgerState);
    expect(keys).toContain('memberCount');
    expect(keys.some((k) => /secret|code/i.test(k))).toBe(false);
  }, 30_000);
});