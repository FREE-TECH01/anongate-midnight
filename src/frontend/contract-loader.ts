import { CompiledContract } from '@midnight-ntwrk/midnight-js-protocol/compact-js';

export interface ContractModule {
  AnonGate: {
    Contract: any;
    ledger: (data: Uint8Array) => { memberCount: bigint | number };
    pureCircuits: Record<string, any>;
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
