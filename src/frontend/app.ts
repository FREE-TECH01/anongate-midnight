import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ContractModule } from './contract-loader';
import { normalizeCredential, maskCredential } from './utils';
import { callAddMember, callJoinAllowlist } from './contract-caller';

export interface JoinState {
  status: 'idle' | 'connecting' | 'submitting' | 'success' | 'error';
  message: string;
  txId?: string;
  memberCount?: number;
}

export interface JoinAllowlistParams {
  credential: string;
  contractAddress: string;
  connectedAPI: ConnectedAPI;
  contractModule: ContractModule;
}

export async function joinAllowlist(params: JoinAllowlistParams): Promise<JoinState> {
  const { credential, contractAddress, connectedAPI, contractModule } = params;
  const normalized = normalizeCredential(credential);
  const masked = maskCredential(normalized);

  console.log('[AnonGate] joinAllowlist called, calling callJoinAllowlist...');
  const result = await callJoinAllowlist(contractModule, contractAddress, normalized, connectedAPI);

  return {
    status: 'success',
    message: `Your private credential was accepted and kept hidden. The UI only displays ${masked}.`,
    txId: result.txId,
    memberCount: result.memberCount,
  };
}

export interface AddMemberParams {
  credential: string;
  contractAddress: string;
  connectedAPI: ConnectedAPI;
  contractModule: ContractModule;
}

export async function addMember(params: AddMemberParams): Promise<{ status: 'success'; message: string; txId: string }> {
  const { credential, contractAddress, connectedAPI, contractModule } = params;
  const normalized = normalizeCredential(credential);
  const result = await callAddMember(contractModule, contractAddress, normalized, connectedAPI);

  return {
    status: 'success',
    message: 'Credential hash approved. The original credential was not put on-chain.',
    txId: result.txId,
  };
}
