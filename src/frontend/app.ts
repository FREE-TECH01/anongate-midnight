import { normalizeSecretCode, maskSecretCode } from './utils';

export interface JoinState {
  status: 'idle' | 'connecting' | 'submitting' | 'success' | 'error';
  message: string;
  txId?: string;
  memberCount?: number;
}

export async function joinAllowlist(secretCode: string): Promise<JoinState> {
  const normalized = normalizeSecretCode(secretCode);
  const masked = maskSecretCode(normalized);

  const response = await fetch('/api/submit-join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ secretCode: normalized }),
  });

  let payload: any = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The submission endpoint returned an invalid response.');
  }

  if (!response.ok || payload.ok === false) {
    throw new Error(payload?.error || 'The proof submission failed.');
  }

  return {
    status: 'success',
    message: payload?.message || `Your private code was accepted and kept hidden. The UI only displays ${masked}.`,
    txId: payload?.txId,
    memberCount: payload?.memberCount,
  };
}
