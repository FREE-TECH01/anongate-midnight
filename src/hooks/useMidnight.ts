import { useEffect, useState } from 'react';

declare global {
  interface Window {
    lace?: {
      enable?: () => Promise<{ address?: string } | undefined>;
      disable?: () => Promise<void> | void;
      networkId?: string;
    };
  }
}

export type WalletStatus = 'idle' | 'connecting' | 'connected' | 'error';

function classifyWalletError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);
  if (/not installed|missing/i.test(message)) {
    return 'Lace wallet is not installed. Install it from https://www.lace.io/ and refresh the page.';
  }
  if (/user rejected|rejected|cancel/i.test(message)) {
    return 'Connection was cancelled by you in Lace.';
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

  useEffect(() => {
    const stored = window.localStorage.getItem('anongate-wallet-address');
    if (stored) {
      setAddress(stored);
      setStatus('connected');
    }
  }, []);

  const connect = async () => {
    if (!window.lace?.enable) {
      setError('Lace wallet is not installed. Install it from https://www.lace.io/ and refresh the page.');
      setStatus('error');
      return;
    }

    try {
      setStatus('connecting');
      setError(null);
      const result = await window.lace.enable();
      const nextAddress = result?.address ?? null;
      if (!nextAddress) {
        throw new Error('The wallet did not return an address.');
      }
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
    try {
      await window.lace?.disable?.();
    } catch {
      // Ignore cleanup errors.
    }
    setAddress(null);
    setError(null);
    window.localStorage.removeItem('anongate-wallet-address');
    window.localStorage.removeItem('anongate-last-secret');
    window.localStorage.removeItem('anongate-last-proof');
    setStatus('idle');
  };

  return { address, status, error, connect, disconnect };
}
