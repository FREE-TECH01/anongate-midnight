import { useMemo, useState } from 'react';
import { joinAllowlist } from '../frontend/app';
import { maskSecretCode, normalizeSecretCode } from '../frontend/utils';

interface CircuitCallProps {
  contractAddress: string;
  connected: boolean;
  onConnectRequired: () => Promise<void>;
}

export function CircuitCall({ contractAddress, connected, onConnectRequired }: CircuitCallProps) {
  const [secretCode, setSecretCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  const maskedAddress = useMemo(() => {
    if (contractAddress.length <= 12) return contractAddress;
    return `${contractAddress.slice(0, 6)}…${contractAddress.slice(-6)}`;
  }, [contractAddress]);

  const handleCall = async () => {
    if (!connected) {
      setError('Connect Lace first to submit the proof.');
      await onConnectRequired();
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const normalized = normalizeSecretCode(secretCode);
      const submission = await joinAllowlist(normalized);
      setMemberCount((current) => submission.memberCount ?? current + 1);
      setResult(submission.message || 'Submission accepted. The private value stays local and is never shown on screen.');
      setSecretCode('');
      window.localStorage.setItem('anongate-last-proof', 'proved');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'The proof submission failed.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card" aria-labelledby="circuit-heading">
      <h2 id="circuit-heading">Join the allowlist</h2>
      <p className="muted">Your secret stays private while the public ledger shows only the proof-based activity.</p>
      <p className="muted">Contract: {maskedAddress}</p>

      <div className="privacy-panels" role="group" aria-label="Private and public views">
        <div className="privacy-panel privacy-panel--private" aria-label="Private input panel">
          <div className="privacy-label">🔒 Private</div>
          <label className="sr-only" htmlFor="private-secret-code">Private secret code</label>
          <input
            id="private-secret-code"
            type="password"
            autoComplete="off"
            value={secretCode}
            onChange={(event) => setSecretCode(event.target.value)}
            placeholder="Enter your private secret"
            aria-describedby="private-help"
          />
          <p id="private-help" className="panel-help">Typed here only. Never sent to the public view.</p>
          <div className="masked-value" aria-label="masked secret preview">{maskSecretCode(secretCode || 'placeholder')}</div>
        </div>

        <div className="privacy-panel privacy-panel--public" aria-label="Public state panel">
          <div className="privacy-label">🌐 Public</div>
          <div className="counter-pill" aria-live="polite">
            Public counter: <strong>{memberCount}</strong>
          </div>
          <p className="panel-stat">Members seen on-chain: {memberCount}</p>
          <p className="panel-help">Observers can see activity and the public counter, but not the secret you used.</p>
        </div>
      </div>

      <div className="button-row">
        <button onClick={() => void handleCall()} disabled={isLoading}>
          {isLoading ? 'Generating proof…' : 'Join allowlist'}
        </button>
      </div>
      <div className="proof-strip" aria-live="polite">
        <p className="proof-label">Proved without revealing your input</p>
        {result ? <p className="success">{result}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
}
