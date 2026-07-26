import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMidnight } from '../src/hooks/useMidnight';

describe('useMidnight Hook & DApp Connector API', () => {
  beforeEach(() => {
    window.localStorage.clear();
    delete window.midnight;
  });

  it('reports wallet missing when window.midnight is undefined', async () => {
    const { result } = renderHook(() => useMidnight());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toContain('Lace wallet is not installed');
  });

  it('successfully connects when window.midnight.mnLace is present', async () => {
    const mockUnshielded = 'mn_addr_test1234567890';
    window.midnight = {
      mnLace: {
        rdns: 'com.lace.midnight',
        name: 'Lace',
        icon: 'data:image/svg+xml;base64,mock',
        apiVersion: '4.0.1',
        connect: vi.fn().mockResolvedValue({
          getUnshieldedAddress: vi.fn().mockResolvedValue({ unshieldedAddress: mockUnshielded }),
          getShieldedAddresses: vi.fn(),
          getConnectionStatus: vi.fn().mockResolvedValue({ status: 'connected', networkId: 'preview' }),
        }),
      },
    };

    const { result } = renderHook(() => useMidnight());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('connected');
    expect(result.current.address).toBe(mockUnshielded);
    expect(result.current.error).toBeNull();
  });

  it('handles user cancellation explicitly with distinct error message', async () => {
    window.midnight = {
      mnLace: {
        rdns: 'com.lace.midnight',
        name: 'Lace',
        icon: 'data:image/svg+xml;base64,mock',
        apiVersion: '4.0.1',
        connect: vi.fn().mockRejectedValue(new Error('User rejected the connection request')),
      },
    };

    const { result } = renderHook(() => useMidnight());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe('error');
    expect(result.current.error).toBe('Connection request was cancelled or declined in Lace.');
  });
});
