import { useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ContractModule } from '../frontend/contract-loader';
import { addMember } from '../frontend/app';
import { normalizeCredential } from '../frontend/utils';

interface AdminMemberProps {
  contractAddress: string;
  connected: boolean;
  connectedAPI: ConnectedAPI | null;
  contractModule: ContractModule | null;
  onConnectRequired: () => Promise<void>;
}

export function AdminMember({
  contractAddress,
  connected,
  connectedAPI,
  contractModule,
  onConnectRequired,
}: AdminMemberProps) {
  const [credential, setCredential] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAddMember = async () => {
    if (!connected || !connectedAPI || !contractModule) {
      setError(
        !connected
          ? 'Connect the admin Lace wallet first.'
          : !contractModule
            ? 'Contract module is still loading. Please wait and try again.'
            : 'Wallet connection is still initializing. Please wait and try again.',
      );
      await onConnectRequired();
      return;
    }

    setError(null);
    setResult(null);
    setIsLoading(true);
    try {
      const normalized = normalizeCredential(credential);
      const submission = await addMember({
        credential: normalized,
        contractAddress,
        connectedAPI,
        contractModule,
      });
      setResult(`${submission.message} Transaction: ${submission.txId}`);
      setCredential('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The admin approval failed.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card" aria-labelledby="admin-heading">
      <div className="card-heading-row">
        <div>
          <h2 id="admin-heading">Admin: approve a credential</h2>
          <p className="muted">
            The deployment wallet only. The browser derives the hash locally before submitting it.
          </p>
        </div>
        <span className="admin-badge">ADMIN</span>
      </div>
      <label htmlFor="admin-credential">Credential to approve</label>
      <input
        id="admin-credential"
        type="password"
        autoComplete="off"
        value={credential}
        onChange={(event) => setCredential(event.target.value)}
        placeholder="Enter a credential for the allowlist"
        aria-describedby="admin-help"
      />
      <p id="admin-help" className="panel-help">
        Only its 32-byte hash becomes a public Merkle-tree value. The original text is never stored.
      </p>
      <div className="button-row">
        <button onClick={() => void handleAddMember()} disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
          {isLoading ? 'Approving…' : 'Approve credential'}
        </button>
      </div>
      <div className="proof-strip" aria-live="polite">
        <p className="proof-label">Admin authorization is checked on-chain</p>
        {result ? <p className="success">{result}</p> : null}
        {error ? <p className="error" role="alert">{error}</p> : null}
      </div>
    </section>
  );
}
