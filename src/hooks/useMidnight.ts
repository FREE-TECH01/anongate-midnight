import { useEffect, useState } from 'react';
import type { InitialAPI, ConnectedAPI } from '@midnight-ntwrk/dapp-connector-api';

declare global {
  interface Window {
    midnight?: {
      [key: string]: InitialAPI;
    };
  }
}

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error';

function getLaceProvider(): InitialAPI | null {
  if (typeof window === 'undefined' || !window.midnight) {
    return null;
  }
  if (window.midnight.mnLace) {
    return window.midnight.mnLace;
  }
  const providers = Object.values(window.midnight);
  return providers.length > 0 ? providers[0] : null;
}

function classifyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not installed|missing/i.test(message)) {
    return 'Lace wallet is not installed. Install it from https://www.lace.io/ and refresh the page.';
  }
  if (/user rejected|rejected|cancel|refused/i.test(message)) {
    return 'Connection request was cancelled or declined in Lace.';
  }
  if (/network|preprod|preview/i.test(message)) {
    return 'Lace is on the wrong network for this dApp. Switch it to Preview or Preprod as required before reconnecting.';
  }
  return message || 'Wallet connection failed.';
}

export function useMidnight() {
  const [address, setAddress] = useState<string | null>(null);
  const [status, setStatus] = useState<WalletStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [connectedAPI, setConnectedAPI] = useState<ConnectedAPI | null>(null);

  useEffect(() => {
    const stored = window.localStorage.getItem('anongate-wallet-address');
    if (stored) {
      setAddress(stored);
      setStatus('connected');
    }
  }, []);

  const connect = async () => {
    const provider = getLaceProvider();
    if (!provider || typeof provider.connect !== 'function') {
      setError('Lace wallet is not installed. Install it from https://www.lace.io/ and refresh the page.');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);
      const networkId = import.meta.env.VITE_NETWORK || 'preview';
      const api = await provider.connect(networkId);
      
      let nextAddress: string | null = null;
      try {
        const unshielded = await api.getUnshieldedAddress();
        nextAddress = unshielded.unshieldedAddress;
      } catch {
        const shielded = await api.getShieldedAddresses();
        nextAddress = shielded.shieldedAddress;
      }

      if (!nextAddress) {
        throw new Error('The wallet did not return an address.');
      }

      setConnectedAPI(api);
      setAddress(nextAddress);
      window.localStorage.setItem('anongate-wallet-address', nextAddress);
      setStatus('connected');
    } catch (err) {
      const message = classifyWalletError(err);
      setError(message);
      setStatus('error');
    }
  };

  const disconnect = async () => {
    setConnectedAPI(null);
    setAddress(null);
    setError(null);
    window.localStorage.removeItem('anongate-wallet-address');
    window.localStorage.removeItem('anongate-last-secret');
    window.localStorage.removeItem('anongate-last-proof');
    setStatus('idle');
  };

  return { address, status, error, connectedAPI, connect, disconnect };
}

