// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CircuitCall } from '../src/components/CircuitCall';
import { joinAllowlist } from '../src/frontend/app';
import { maskSecretCode, normalizeSecretCode } from '../src/frontend/utils';

describe('frontend privacy helpers', () => {
  it('normalizes a secret code and keeps it private in the UI', () => {
    expect(normalizeSecretCode('  alpha-123  ')).toBe('alpha-123');
    expect(maskSecretCode('alpha-123')).toBe('•••••••••');
  });

  it('rejects blank secret codes', () => {
    expect(() => normalizeSecretCode('   ')).toThrow('Secret code is required');
  });

  it('posts the secret to the submission endpoint and returns the chain state', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, txId: 'tx-123', memberCount: 4, message: 'Submission accepted.' }),
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await joinAllowlist('secret-123');

    expect(fetchMock).toHaveBeenCalledWith('/api/submit-join', expect.objectContaining({
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }));
    expect(result.status).toBe('success');
    expect(result.memberCount).toBe(4);
    expect(result.txId).toBe('tx-123');
  });

  it('throws a clear error when the submission endpoint returns an invalid response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '',
      json: async () => { throw new Error('Unexpected end of JSON input'); },
    }));

    await expect(joinAllowlist('secret-123')).rejects.toThrow('The submission endpoint returned an invalid response.');
  });
});

describe('CircuitCall privacy UI', () => {
  it('shows the proof label after submission without rendering the secret value', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ ok: true, txId: 'tx-123', memberCount: 1, message: 'Submission accepted.' }),
    }));

    render(
      React.createElement(CircuitCall, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: true,
        onConnectRequired: vi.fn(),
      }),
    );

    const input = screen.getByLabelText(/private secret code/i);
    fireEvent.change(input, { target: { value: 'secret-123' } });
    fireEvent.click(screen.getByRole('button', { name: /join allowlist/i }));

    await waitFor(() => {
      expect(screen.getByText(/proved without revealing your input/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText(/public counter:/i)).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    }, { timeout: 3000 });

    expect(screen.queryByText('secret-123')).not.toBeInTheDocument();
  });
});
