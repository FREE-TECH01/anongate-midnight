import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';
import type { MerkleTreePath } from '@midnight-ntwrk/compact-runtime';

type CredentialPath = MerkleTreePath<Uint8Array>;

export interface ContractModule {
  AnonGate: {
    Contract: any;
    ledger: (data: Uint8Array) => {
      memberRoot: {
        findPathForLeaf: (leaf: Uint8Array) => CredentialPath | undefined;
      };
      memberCount: bigint | number;
      usedNullifiers: { size: () => bigint };
      adminPublicKey: Uint8Array;
    };
    pureCircuits: {
      credentialHash: (credential: string) => Uint8Array;
    } & Record<string, any>;
    contractReferenceLocations: Record<string, any>;
  };
  compiledContract: any;
}

export async function loadContractModule(): Promise<ContractModule> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore Vite resolves contract at build time
  const AnonGate = await import('../contract-index.js');

  const compiledContract = CompiledContract.make(
    'hello-world',
    AnonGate.Contract,
  ).pipe(CompiledContract.withVacantWitnesses);

  return { AnonGate, compiledContract };
}
