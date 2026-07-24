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
      <h2 id="wallet-heading">Wallet connection</h2>
      <p className="muted">Connect Lace to continue. The connected address is shown below and state is cleared on disconnect.</p>
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
