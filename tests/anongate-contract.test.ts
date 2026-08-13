// @vitest-environment node
import { describe, expect, it } from 'vitest';
import * as AnonGate from '../contracts/managed/hello-world/contract/index.js';
import {
  createCircuitContext,
  createConstructorContext,
  dummyContractAddress,
} from '@midnight-ntwrk/compact-runtime';

const ADMIN_COIN_PUBLIC_KEY = '00'.repeat(32);
const OTHER_COIN_PUBLIC_KEY = '11'.repeat(32);
const APPROVED_CREDENTIAL = 'approved-credential-alpha';
const UNAPPROVED_CREDENTIAL = 'not-approved-beta';

function newContract() {
  const contract = new AnonGate.Contract({});
  const constructorResult = contract.initialState(
    createConstructorContext({}, ADMIN_COIN_PUBLIC_KEY),
    new Uint8Array(32),
  );
  return { contract, state: constructorResult.currentContractState.data };
}

function runCircuit(contract: any, state: any, coinPublicKey: string, name: string, ...args: any[]) {
  const context = createCircuitContext(dummyContractAddress(), coinPublicKey, state, {});
  return contract.circuits[name](context, ...args).context.currentQueryContext.state.state;
}

function approveCredential(contract: any, state: any, credential = APPROVED_CREDENTIAL) {
  const hash = AnonGate.pureCircuits.credentialHash(credential);
  return runCircuit(contract, state, ADMIN_COIN_PUBLIC_KEY, 'addMember', hash);
}

function membershipPath(state: any, credential = APPROVED_CREDENTIAL) {
  const hash = AnonGate.pureCircuits.credentialHash(credential);
  return AnonGate.ledger(state).memberRoot.findPathForLeaf(hash);
}

describe('AnonGate Merkle allowlist contract', () => {
  it('accepts an approved credential and increments memberCount', () => {
    const { contract, state: initialState } = newContract();
    const approvedState = approveCredential(contract, initialState);
    const path = membershipPath(approvedState);

    const joinedState = runCircuit(
      contract,
      approvedState,
      OTHER_COIN_PUBLIC_KEY,
      'joinAllowlist',
      APPROVED_CREDENTIAL,
      path,
    );

    expect(AnonGate.ledger(joinedState).memberCount).toBe(1n);
  });

  it('rejects a credential that is not the approved leaf', () => {
    const { contract, state: initialState } = newContract();
    const approvedState = approveCredential(contract, initialState);
    const path = membershipPath(approvedState);

    expect(() =>
      runCircuit(
        contract,
        approvedState,
        OTHER_COIN_PUBLIC_KEY,
        'joinAllowlist',
        UNAPPROVED_CREDENTIAL,
        path,
      ),
    ).toThrow('credential is not approved');
  });

  it('rejects a second join using the same credential nullifier', () => {
    const { contract, state: initialState } = newContract();
    const approvedState = approveCredential(contract, initialState);
    const path = membershipPath(approvedState);
    const joinedState = runCircuit(
      contract,
      approvedState,
      OTHER_COIN_PUBLIC_KEY,
      'joinAllowlist',
      APPROVED_CREDENTIAL,
      path,
    );

    expect(() =>
      runCircuit(
        contract,
        joinedState,
        OTHER_COIN_PUBLIC_KEY,
        'joinAllowlist',
        APPROVED_CREDENTIAL,
        path,
      ),
    ).toThrow('credential was already used');
  });

  it('keeps the private credential out of public ledger field names', () => {
    const { contract, state: initialState } = newContract();
    const approvedState = approveCredential(contract, initialState);
    const path = membershipPath(approvedState);
    const joinedState = runCircuit(
      contract,
      approvedState,
      OTHER_COIN_PUBLIC_KEY,
      'joinAllowlist',
      APPROVED_CREDENTIAL,
      path,
    );
    const publicLedger = AnonGate.ledger(joinedState);

    expect(Object.keys(publicLedger)).toEqual(
      expect.arrayContaining(['memberRoot', 'memberCount', 'usedNullifiers', 'adminPublicKey']),
    );
    expect(Object.keys(publicLedger).some((key) => /credential|secret|code/i.test(key))).toBe(false);
    expect(JSON.stringify(Object.keys(publicLedger))).not.toContain(APPROVED_CREDENTIAL);
  });

  it('allows addMember only from the constructor admin key', () => {
    const { contract, state: initialState } = newContract();
    const hash = AnonGate.pureCircuits.credentialHash(APPROVED_CREDENTIAL);

    expect(() => runCircuit(contract, initialState, OTHER_COIN_PUBLIC_KEY, 'addMember', hash)).toThrow(
      'only the admin can add members',
    );
  });
});
