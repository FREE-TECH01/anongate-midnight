import { useMemo } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { CircuitCall } from './components/CircuitCall';
import { useMidnight } from './hooks/useMidnight';

const CONTRACT_ADDRESS = import.meta.env.VITE_CONTRACT_ADDRESS || '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8';

export function App() {
  const midnight = useMidnight();
  const networkLabel = useMemo(() => (midnight.address ? 'Preview / Preprod-ready' : 'Disconnected'), [midnight.address]);

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div className="hero-badge-row">
          <span className="eyebrow">Private allowlist access</span>
          <span className="status-pill">{networkLabel}</span>
        </div>
        <h1>AnonGate</h1>
        <p className="intro">
          Connect your Lace wallet, prove membership locally, and submit the result without exposing your private input in the UI.
        </p>
        <div className="hero-highlights" aria-label="Key benefits">
          <span>🔒 Private input stays hidden</span>
          <span>🌐 Public counter is visible on-chain</span>
          <span>⚡ Real Midnight proof flow</span>
        </div>
        <div className="hero-model-pill">🛡️ Zero-knowledge privacy model</div>
      </section>

      <section className="panel-grid">
        <WalletConnect
          address={midnight.address}
          status={midnight.status}
          error={midnight.error}
          onConnect={midnight.connect}
          onDisconnect={midnight.disconnect}
        />
        <CircuitCall
          contractAddress={CONTRACT_ADDRESS}
          connected={midnight.status === 'connected'}
          onConnectRequired={midnight.connect}
        />
      </section>
    </main>
  );
}
