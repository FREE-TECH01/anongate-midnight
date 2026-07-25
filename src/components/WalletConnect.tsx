interface WalletConnectProps {
  address: string | null;
  status: 'idle' | 'connecting' | 'connected' | 'error';
  error: string | null;
  onConnect: () => Promise<void>;
  onDisconnect: () => Promise<void>;
}

export function WalletConnect({ address, status, error, onConnect, onDisconnect }: WalletConnectProps) {
  const isConnected = status === 'connected' && Boolean(address);

  return (
    <section className="card" aria-labelledby="wallet-heading">
      <div className="card-heading-row">
        <div>
          <h2 id="wallet-heading">Wallet connection</h2>
          <p className="muted">Securely connect Lace and prepare to prove your membership.</p>
        </div>
        <span className={`status-dot ${isConnected ? 'status-dot--connected' : 'status-dot--idle'}`} />
      </div>
      <div className="button-row">
        {isConnected ? (
          <button className="secondary" onClick={() => void onDisconnect()}>
            Disconnect
          </button>
        ) : (
          <button onClick={() => void onConnect()} disabled={status === 'connecting'}>
            {status === 'connecting' ? 'Connecting…' : 'Connect Lace'}
          </button>
        )}
      </div>
      <p className="address" role="status">
        {isConnected ? `Connected: ${address}` : 'Disconnected'}
      </p>
      {error ? <p className="error" role="alert">{error}</p> : null}
    </section>
  );
}
