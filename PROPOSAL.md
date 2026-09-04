# Product Proposal

## What is the product, and who uses it?

AnonGate is a privacy-preserving credential verification system. In its current form, it lets an authority (a university registrar, an examination board, a professional licensing body) commit to a set of genuine, issued credentials as a single public Merkle root — without ever publishing the credentials themselves or the identities of who holds them. A credential holder can then prove, to anyone who needs to verify them — an employer, an immigration office, another institution — that they hold a genuine credential from that authority, without revealing the credential's private details or exposing themselves to a public list others can scrape, sell, or misuse.

The people who use it fall into three roles: an **issuing authority** (e.g. a university registrar) who approves and commits credentials to the on-chain allowlist; a **credential holder** (a graduate, a licensed professional) who proves their credential is genuine when asked; and a **verifier** (an employer, another institution, an embassy) who gets a cryptographic yes/no answer without ever seeing or storing the underlying sensitive data.

This is a real, expensive problem in contexts like Nigeria, where credential fraud — forged degree certificates, falsified WAEC/NECO results, fabricated professional licenses — costs employers and institutions real time and money to investigate manually, and where legitimate graduates are sometimes doubted or delayed because verification processes are slow, manual, and easy to fake around. AnonGate's current implementation (a Merkle-tree allowlist with private-witness membership proofs and one-way nullifiers to prevent replay) is a direct technical foundation for this: today it proves "this credential is on the approved list" for allowlist-style access; the same mechanism, pointed at institution-issued credentials instead of generic secrets, becomes real credential fraud prevention.

## Why Midnight specifically?

A transparent chain cannot do this well because every transaction input is public by default. Even if a credential were hashed before submission, the *transaction itself* — which wallet submitted which hash, when — would still be visible and correlatable, meaning a verifier's public chain activity could leak who they've been checking up on, and a credential holder's activity could be tracked across every verification they've ever undergone. For something as sensitive as academic and professional credentials, that's an unacceptable privacy leak layered on top of the very fraud problem the system is meant to solve.

Midnight's Compact language makes private inputs the default rather than an afterthought: circuit parameters are private unless explicitly disclosed via `disclose()`. In AnonGate's current implementation, the credential and its Merkle inclusion path are private witnesses that never touch the public ledger, hashed or otherwise. The zero-knowledge proof submitted on-chain proves "a valid credential exists in this authority's approved set" without the proof itself containing enough information to identify which credential, or link separate verification events to the same holder. This is the difference between "we promise not to look" and "the system architecturally cannot look" — and only the latter is trustworthy enough for something as consequential as verifying whether someone's degree is real.

## Data Model

| Data Point | Type | Disclosed To |
|---|---|---|
| `memberRoot` (Merkle root of approved credential hashes — the "verified credentials registry") | Public ledger | Everyone |
| `memberCount` (running total of approved/verified credentials) | Public ledger | Everyone |
| `usedNullifiers` (one-way hashes preventing a credential from being "verified twice" fraudulently reused) | Public ledger | Everyone — but unlinkable to any specific credential |
| `adminPublicKey` (the issuing authority's wallet, e.g. the registrar) | Public ledger | Everyone — transparency on who has authority to issue |
| The credential itself (e.g. a degree/certificate identifier, or a hash tied to an off-chain document) | Private witness | No one — never leaves the holder's local proof generation |
| Merkle inclusion path (proof the credential is genuinely on the issuer's approved list) | Private witness | No one — verified inside the ZK circuit, never transmitted |
| Which specific credential belongs to which named individual | Never computed or stored on-chain anywhere | No one — this pairing exists only in the issuing authority's own off-chain records, same as today |

## Mainnet Feasibility

Realistic, and the path is mostly hardening rather than reinvention. The core cryptographic pattern — Merkle-tree membership, nullifier-based replay prevention, admin-gated issuance — is already implemented, tested (13 passing tests), and demonstrated end-to-end on Preview: an admin wallet approving a credential via CLI, and a separate holder wallet proving and joining via a live browser interface with Lace.

What's genuinely still needed before this could serve real institutions: a proper multi-authority model (right now there's a single hardcoded admin key; real deployment needs per-institution admin roles, likely via role-based access rather than one key), an off-chain document-to-hash pipeline so registrars can issue credentials without manually computing hashes, and — the biggest open risk demonstrated repeatedly throughout this project — Preprod/Mainnet network reliability. Every Preprod deployment attempt during this hackathon stalled at wallet sync, a documented, recurring issue affecting other developers too, not something specific to this project's code. That infrastructure dependency, not the contract design, is the real gating factor for a genuine Mainnet launch timeline.