// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminMember } from '../src/components/AdminMember';
import { CircuitCall } from '../src/components/CircuitCall';
import { maskCredential, normalizeCredential } from '../src/frontend/utils';

afterEach(() => {
  cleanup();
});

describe('frontend privacy helpers', () => {
  it('normalizes a credential and keeps it private in the UI', () => {
    expect(normalizeCredential('  alpha-123  ')).toBe('alpha-123');
    expect(maskCredential('alpha-123')).toBe('•••••••••');
  });

  it('rejects blank credentials', () => {
    expect(() => normalizeCredential('   ')).toThrow('Credential is required');
  });
});

describe('CircuitCall privacy UI', () => {
  it('shows the proof label and renders the privacy panel without secret value', () => {
    render(
      React.createElement(CircuitCall, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: false,
        connectedAPI: null,
        contractModule: null,
        onConnectRequired: vi.fn(),
      }),
    );

    expect(screen.getByText(/proved without revealing your input/i)).toBeInTheDocument();
    expect(screen.getByText(/public counter:/i)).toBeInTheDocument();
  });

  it('shows connect error when trying to join without Lace', async () => {
    render(
      React.createElement(CircuitCall, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: false,
        connectedAPI: null,
        contractModule: null,
        onConnectRequired: vi.fn(),
      }),
    );

    const input = screen.getByLabelText(/private credential/i);
    fireEvent.change(input, { target: { value: 'secret-123' } });
    fireEvent.click(screen.getByRole('button', { name: /join allowlist/i }));

    await waitFor(() => {
      expect(screen.getByText(/connect lace first/i)).toBeInTheDocument();
    });
  });

  it('does not render the secret value at any point', () => {
    render(
      React.createElement(CircuitCall, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: true,
        connectedAPI: {} as any,
        contractModule: {} as any,
        onConnectRequired: vi.fn(),
      }),
    );

    const input = screen.getByLabelText(/private credential/i);
    fireEvent.change(input, { target: { value: 'secret-123' } });

    expect(screen.queryByText('secret-123')).not.toBeInTheDocument();
  });
});

describe('AdminMember privacy UI', () => {
  it('keeps the credential out of the visible approval result', () => {
    render(
      React.createElement(AdminMember, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: false,
        connectedAPI: null,
        contractModule: null,
        onConnectRequired: vi.fn(),
      }),
    );

    const input = screen.getByLabelText(/credential to approve/i);
    fireEvent.change(input, { target: { value: 'admin-secret-123' } });

    expect(screen.queryByText('admin-secret-123')).not.toBeInTheDocument();
    expect(screen.getByText(/only its 32-byte hash/i)).toBeInTheDocument();
  });

  it('reports that the admin wallet is required before approval', async () => {
    render(
      React.createElement(AdminMember, {
        contractAddress: '48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8',
        connected: false,
        connectedAPI: null,
        contractModule: null,
        onConnectRequired: vi.fn(),
      }),
    );

    fireEvent.click(screen.getByRole('button', { name: /approve credential/i }));

    await waitFor(() => {
      expect(screen.getByText(/connect the admin lace wallet first/i)).toBeInTheDocument();
    });
  });
});
