# AnonGate - Privacy-Preserving Allowlist Membership on Midnight
![CI](https://github.com/FREE-TECH01/anongate-midnight/actions/workflows/ci.yml/badge.svg)

> AnonGate proves allowlist membership with a private credential and Merkle inclusion proof without publishing the credential.

## Live Demo
[https://anongate-midnight.vercel.app](https://anongate-midnight.vercel.app)

Demo video: [https://screenrec.com/share/w8Y0x5R9q4](https://screenrec.com/share/w8Y0x5R9q4)

The hosted URL currently points at the Level 2 Preview deployment. The Level 3 contract is compiled and tested, but a fresh network deployment is pending because both Preprod and Preview wallet sync stalled during the August 13, 2026 retry.

## Contract Address
| Network | Address | Status |
|---------|---------|--------|
| Preprod | No address - RPC/indexer wallet sync stalled | Unavailable after one genuine retry |
| Preview fallback (Level 2) | `48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8` | Live legacy contract |
| Preview Level 3 | No address yet | Deploy when Preview RPC recovers |

The address above is the required working Preview fallback from Levels 1-2. It contains the old one-argument circuit, so it must not be mistaken for the new Merkle contract. Set `VITE_CONTRACT_ADDRESS` to a fresh Level 3 deployment before using the new browser circuits on a public network.

## What This Does
An administrator enters a credential in the browser. The generated pure Compact circuit derives its 32-byte credential hash, and the `addMember` circuit writes that hash as a value in the public Merkle allowlist. Only the deployment wallet can approve members, enforced by `ownPublicKey()` inside the contract.

A member enters the credential privately. The browser reads the public tree, finds the inclusion path for the derived hash, and submits the credential plus path as private circuit inputs. The contract verifies the path, records a domain-separated one-way nullifier, and increments `memberCount`.

## Privacy Model
- PUBLIC: Merkle root, member count, hashed nullifiers, and the administrator public key.
- PRIVATE: The credential and the Merkle path supplied to `joinAllowlist`.
- PROVED without revealing: The credential hashes to an approved tree value, the path matches the current root, and its nullifier has not been used.

## Privacy Claim
An on-chain observer can see that the public allowlist state changed, which root is current, that a nullifier was recorded, and that `memberCount` increased. The observer cannot read the credential or the private Merkle path from the proof. The nullifier is intentionally one-way and is used to reject replay of the same credential.

Compact 0.31.1 rejects `persistentHash` directly over an `Opaque<"string">`. AnonGate therefore normalizes the private string through the standard transient hash and persistently hashes the resulting `Bytes<32>` value inside the compiled pure circuit. The original string is never disclosed.

## Tech Stack
| Layer | Technology |
|-------|------------|
| Smart contract | Compact language 0.23.0, compiler 0.31.1, runtime 0.16.0 |
| Ledger state | `MerkleTree<32, Bytes<32>>`, `Counter`, `Set<Bytes<32>>` |
| Blockchain | Midnight Network Preview / Preprod |
| SDK | Midnight.js 4.1.1, dapp connector API 4.0.1, wallet SDK 1.2.0 |
| Frontend | React 19, Vite 8, TypeScript 6 |
| Tests | Vitest 4, React Testing Library, Compact runtime execution |
| Wallet | Lace Midnight connector |

The exact Merkle API was verified against the official Compact 0.31.1 reference: [ledger ADTs](https://docs.midnight.network/compact/reference/ledger-adt), [standard-library source](https://github.com/LFDT-Minokawa/compact/blob/compactc-v0.31.1/doc/api/CompactStandardLibrary/exports.md), and [compiler release](https://github.com/midnightntwrk/compact/releases/tag/compactc-v0.31.1).

## Prerequisites
- GitHub Codespace or another Linux x86_64 environment with a modern CPU. Use the Codespace for this project; the local WSL2 CPU previously crashed the Compact compiler with an ADX instruction fault.
- Node.js 22 or newer.
- Lace Wallet with Midnight support.
- Docker, when running the CLI-side proof server or deployment setup.

## Setup & Run Locally
Run these commands in the GitHub Codespace terminal, not the WSL2 environment:

```bash
git clone https://github.com/FREE-TECH01/anongate-midnight.git
cd anongate-midnight
npm install
compact update 0.31.1
npm run compile
npm run dev
```

Set `VITE_NETWORK` and `VITE_CONTRACT_ADDRESS` in the Vite environment before a browser transaction. The current fallback values are in `.env.example`; a new Level 3 address is required once public RPC service recovers. `npm run setup -- --network preview` compiles and attempts a full deployment, but public network sync can take several minutes or fail during an outage.

For a local devnet, start the scaffold services with Docker, then run `npm run setup` and `npm run dev`. The browser uses Lace and the configured public proof server; the CLI can use `npm run proof-server:start`.

## Run Tests
```bash
npm test
npm run build
npm run compile
```

The default suite executes 13 tests, including approved membership, rejected membership, nullifier replay protection, admin authorization, private-ledger checks, wallet connection behavior, and privacy UI behavior. `npm run test:e2e` is a separate network smoke check and requires a current deployment record.

## CI/CD
The workflow in `.github/workflows/ci.yml` runs on pushes to `main` and pull requests. It checks out the repository, installs Node.js 22 and dependencies, installs Compact 0.31.1, compiles the contract, builds the frontend, and runs `npm test`. The Compact installation receives GitHub Actions' automatic `GITHUB_TOKEN` to avoid unauthenticated GitHub API rate limits.

## Product Proposal
See [PROPOSAL.md](./PROPOSAL.md). The required product, Midnight rationale, data-model, and Mainnet-feasibility placeholders are intentionally left for the author to complete.
