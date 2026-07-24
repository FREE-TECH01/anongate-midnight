// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { CircuitCall } from '../src/components/CircuitCall';
import { maskSecretCode, normalizeSecretCode } from '../src/frontend/utils';

describe('frontend privacy helpers', () => {
  it('normalizes a secret code and keeps it private in the UI', () => {
    expect(normalizeSecretCode('  alpha-123  ')).toBe('alpha-123');
    expect(maskSecretCode('alpha-123')).toBe('•••••••••');
  });

  it('rejects blank secret codes', () => {
    expect(() => normalizeSecretCode('   ')).toThrow('Secret code is required');
  });
});

describe('CircuitCall privacy UI', () => {
  it('shows the proof label after submission without rendering the secret value', async () => {
    render(
      React.createElement(CircuitCall, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: true,
        onConnectRequired: vi.fn(),
      }),
    );

    const input = screen.getByLabelText(/private secret code/i);
    fireEvent.change(input, { target: { value: 'secret-123' } });
    fireEvent.click(screen.getByRole('button', { name: /call circuit/i }));

    await waitFor(() => {
      expect(screen.getByText(/proved without revealing your input/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('secret-123')).not.toBeInTheDocument();
  });
});
