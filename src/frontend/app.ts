import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ContractModule } from './contract-loader';
import { normalizeSecretCode, maskSecretCode } from './utils';
import { callJoinAllowlist } from './contract-caller';

export interface JoinState {
  status: 'idle' | 'connecting' | 'submitting' | 'success' | 'error';
  message: string;
  txId?: string;
  memberCount?: number;
}

export interface JoinAllowlistParams {
  secretCode: string;
  contractAddress: string;
  connectedAPI: ConnectedAPI;
  contractModule: ContractModule;
}

export async function joinAllowlist(params: JoinAllowlistParams): Promise<JoinState> {
  const { secretCode, contractAddress, connectedAPI, contractModule } = params;
  const normalized = normalizeSecretCode(secretCode);
  const masked = maskSecretCode(normalized);

  console.log('[AnonGate] joinAllowlist called, calling callJoinAllowlist...');
  const result = await callJoinAllowlist(contractModule, contractAddress, normalized, connectedAPI);

  return {
    status: 'success',
    message: `Your private code was accepted and kept hidden. The UI only displays ${masked}.`,
    txId: result.txId,
    memberCount: result.memberCount,
  };
}
