import { useMemo, useState } from 'react';
import type { ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';
import type { ContractModule } from '../frontend/contract-loader';
import { joinAllowlist } from '../frontend/app';
import { maskCredential, normalizeCredential } from '../frontend/utils';

function safeStringify(value: unknown): string {
  const seen = new WeakSet();
  try {
    return (
      JSON.stringify(
        value,
        (_key, val) => {
          if (typeof val === 'bigint') return val.toString();
          if (typeof val === 'function') return `[Function ${val.name || 'anonymous'}]`;
          if (val instanceof Uint8Array) return `[Uint8Array(${val.length})]`;
          if (typeof val === 'object' && val !== null) {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);
          }
          return val;
        },
        2,
      ) ?? String(value)
    );
  } catch (stringifyErr) {
    return `[JSON.stringify failed: ${stringifyErr}]`;
  }
}

// Effect library Cause objects are a union: Fail(.error), Die(.defect),
// Interrupt, Sequential(.left/.right), Parallel(.left/.right) — walk them all.
function logEffectCause(cause: any, depth = 0): void {
  if (cause == null || depth > 6) return;
  const prefix = `[AnonGate] cause[depth=${depth}]`;
  console.error(prefix, '_tag:', cause._tag, '| keys:', Object.keys(cause));
  if (cause.error !== undefined) console.error(prefix, '.error =', cause.error);
  if (cause.defect !== undefined) console.error(prefix, '.defect =', cause.defect);
  if (cause.left !== undefined) logEffectCause(cause.left, depth + 1);
  if (cause.right !== undefined) logEffectCause(cause.right, depth + 1);
}

interface CircuitCallProps {
  contractAddress: string;
  connected: boolean;
  connectedAPI: ConnectedAPI | null;
  contractModule: ContractModule | null;
  onConnectRequired: () => Promise<void>;
}

export function CircuitCall({
  contractAddress,
  connected,
  connectedAPI,
  contractModule,
  onConnectRequired,
}: CircuitCallProps) {
  const [credential, setCredential] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberCount, setMemberCount] = useState(0);

  const maskedAddress = useMemo(() => {
    if (contractAddress.length <= 12) return contractAddress;
    return `${contractAddress.slice(0, 6)}…${contractAddress.slice(-6)}`;
  }, [contractAddress]);

  // Wallet can show "connected" (restored from localStorage) while connectedAPI
  // is still null — the button must show a visible pending state instead of
  // letting the click be swallowed by the guard below.
  const walletPending = connected && !connectedAPI;
  const modulePending = connected && !!connectedAPI && !contractModule;
  const buttonDisabled = isLoading || walletPending || modulePending;
  const buttonLabel = isLoading
    ? 'Generating proof…'
    : walletPending
      ? 'Connecting to wallet…'
      : modulePending
        ? 'Loading contract…'
        : 'Join allowlist';

  const handleCall = async () => {
    console.log('[AnonGate] handleCall triggered', { connected, hasAPI: !!connectedAPI, hasModule: !!contractModule });

    if (!connected || !connectedAPI || !contractModule) {
      const why = !connected ? 'wallet not connected' : !connectedAPI ? 'no ConnectedAPI' : 'contract module not loaded yet';
      console.warn('[AnonGate] handleCall guard blocked:', why);
      setError(why === 'contract module not loaded yet'
        ? 'Contract module is still loading. Please wait and try again.'
        : 'Connect Lace first to submit the proof.');
      await onConnectRequired();
      return;
    }

    setError(null);
    setIsLoading(true);
    setResult(null);

    try {
      const normalized = normalizeCredential(credential);
      const submission = await joinAllowlist({
        credential: normalized,
        contractAddress,
        connectedAPI,
        contractModule,
      });
      setMemberCount(submission.memberCount ?? memberCount + 1);
      setResult(
        submission.message ||
          'Submission accepted. The private value stays local and is never shown on screen.',
      );
      setCredential('');
      window.localStorage.setItem('anongate-last-proof', 'proved');
    } catch (err) {
      console.error('[AnonGate] joinAllowlist failed:', err);
      const e = err as any;
      if (e?.stack) console.error('[AnonGate] error stack:', e.stack);
      console.error('[AnonGate] cause keys:', e?.cause ? Object.keys(e.cause) : '(no cause property)');
      console.error('[AnonGate] cause object:', e?.cause);
      console.error('[AnonGate] cause stringified:', safeStringify(e?.cause));
      console.error('[AnonGate] cause.defect:', e?.cause?.defect);
      console.error('[AnonGate] cause.error:', e?.cause?.error);
      logEffectCause(e?.cause);
      const message =
        err instanceof Error && err.message
          ? err.message
          : `The proof submission failed (${e?._id ?? 'unknown error'}) — see browser console for full details.`;
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <section className="card" aria-labelledby="circuit-heading">
      <h2 id="circuit-heading">Join the allowlist</h2>
      <p className="muted">
         Your credential and Merkle path stay private while the public ledger shows only proof-based activity.
      </p>
      <p className="muted">Contract: {maskedAddress}</p>

      <div className="privacy-panels" role="group" aria-label="Private and public views">
        <div className="privacy-panel privacy-panel--private" aria-label="Private input panel">
          <div className="privacy-label">🔒 Private</div>
          <label className="sr-only" htmlFor="private-credential">
             Private credential
          </label>
          <input
             id="private-credential"
            type="password"
            autoComplete="off"
             value={credential}
             onChange={(event) => setCredential(event.target.value)}
             placeholder="Enter your private credential"
            aria-describedby="private-help"
          />
          <p id="private-help" className="panel-help">
             Typed here only. The credential and Merkle path are private circuit inputs.
          </p>
          <div className="masked-value" aria-label="masked credential preview">
             {maskCredential(credential || 'placeholder')}
          </div>
        </div>

        <div className="privacy-panel privacy-panel--public" aria-label="Public state panel">
          <div className="privacy-label">🌐 Public</div>
          <div className="counter-pill" aria-live="polite">
            Public counter: <strong>{memberCount}</strong>
          </div>
          <p className="panel-stat">Members seen on-chain: {memberCount}</p>
          <p className="panel-help">
             Observers can see the root, nullifier, activity, and counter, but not the credential.
          </p>
        </div>
      </div>

      <div className="button-row">
         <button onClick={() => void handleCall()} disabled={buttonDisabled} aria-busy={isLoading}>
           {isLoading ? <span className="spinner" aria-hidden="true" /> : null}
           {buttonLabel}
        </button>
        {walletPending ? (
          <p className="panel-help">
            Establishing wallet connection… this can take a few seconds after approving in Lace.
          </p>
        ) : null}
      </div>
      <div className="proof-strip" aria-live="polite">
        <p className="proof-label">Proved without revealing your input</p>
        {result ? <p className="success">{result}</p> : null}
        {error ? <p className="error">{error}</p> : null}
      </div>
    </section>
  );
}
