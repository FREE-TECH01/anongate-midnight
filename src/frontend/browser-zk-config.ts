import {
  ZKConfigProvider,
  createZKIR,
  createProverKey,
  createVerifierKey,
} from '@midnight-ntwrk/midnight-js-types';

const BASE_PATH = '/contract-artifacts';

export class BrowserZkConfigProvider extends ZKConfigProvider<string> {
  async getZKIR(circuitId: string): Promise<ReturnType<typeof createZKIR>> {
    const resp = await fetch(`${BASE_PATH}/zkir/${circuitId}.bzkir`);
    if (!resp.ok) throw new Error(`Failed to fetch ZKIR for ${circuitId}: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    return createZKIR(new Uint8Array(buf));
  }

  async getProverKey(circuitId: string): Promise<ReturnType<typeof createProverKey>> {
    const resp = await fetch(`${BASE_PATH}/keys/${circuitId}.prover`);
    if (!resp.ok) throw new Error(`Failed to fetch prover key for ${circuitId}: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    return createProverKey(new Uint8Array(buf));
  }

  async getVerifierKey(circuitId: string): Promise<ReturnType<typeof createVerifierKey>> {
    const resp = await fetch(`${BASE_PATH}/keys/${circuitId}.verifier`);
    if (!resp.ok) throw new Error(`Failed to fetch verifier key for ${circuitId}: ${resp.status}`);
    const buf = await resp.arrayBuffer();
    return createVerifierKey(new Uint8Array(buf));
  }
}
