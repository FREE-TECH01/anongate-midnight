# AnonGate — Privacy-Preserving Allowlist Membership on Midnight

> **Midnight Builder Challenge — Level 2 — Private Allowlist Access Track**
>
> AnonGate is a zero-knowledge dApp on the Midnight Network. Users connect their Lace wallet, prove membership using a private secret code, and the proof is generated locally in the browser via Midnight's Compact ZK circuits. The public on-chain counter increments — but the private input never leaves the browser, never appears in any HTTP payload, and is never written to the ledger.

---

## Links & Status

- **Live Demo**: [https://anongate-midnight.vercel.app](https://anongate-midnight.vercel.app) *(deploy the Vite build output to Vercel/Netlify)*
- **Repo**: [https://github.com/FREE-TECH01/anongate-midnight](https://github.com/FREE-TECH01/anongate-midnight)
- **Demo Video**: [PLACEHOLDER — record using checklist below]

---

## Contract Addresses

| Network | Status | Contract Address |
|---------|--------|------------------|
| **Preview** | Live & Confirmed | `48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8` |
| **Preprod** | Pending — network sync stalled | *deployment queued; Preprod RPC instability is a known public network issue* |

---

## Use Case: Exclusive DAO Alpha Club — Anonymous Sybil‑Resistant Allowlisting

Traditional allowlists require users to register their public address, creating a permanent on-chain link between identity, wallet balance, and activity. This exposes sensitive metadata and discourages privacy-conscious participants.

**AnonGate solves this:** An exclusive community or DAO issues single-use or shared secret access codes to prospective members. A user connects their Lace wallet, types their secret code into the private input field, and executes a zero-knowledge Compact proof locally in the browser. The Midnight verifier checks proof validity and increments the public `memberCount` counter on-chain.

**Result:** The community verifies that a legitimate member joined. The user's private code, wallet identity, and on-chain balances remain completely unlinkable to any observer.

---

## Privacy Model

| Layer | What it contains | Who can see it |
|-------|-----------------|----------------|
| **PUBLIC** (ledger) | `memberCount: Counter` — total verified joins | Everyone: indexers, block explorers, observers |
| **PRIVATE** (witness) | `secretCode: Opaque<"string">` — never `disclose()`-d | The user only; generated locally in the browser |
| **ZK PROOF** | Cryptographic proof of valid `secretCode` input | Verifier circuit checks it; no observer learns the code |

- **Browser‑side proof generation**: The proof is created locally in the browser using the Midnight SDK and Lace wallet's proving provider (`getProvingProvider`) — no HTTP request carries the plaintext secret.
- **No backend proxy**: The dApp calls the contract directly via `createUnprovenCallTx` + `submitTx` using the connected Lace wallet as signer and submitter. There is no custom API endpoint, no server-side wallet, and no intermediate relay.
- **Masked UI**: The secret input is a `type="password"` field; any visible preview renders as masked dots (`•••••••••`).

---

## Privacy Claim

> **An on-chain observer or indexer listening to Midnight transactions can verify that a valid membership proof was submitted and that `memberCount` incremented by 1, but cannot determine the underlying secret code or correlate the transaction back to any identifiable user input.**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Smart Contract** | Compact (`contracts/hello-world.compact`, compiler 0.31.1) |
| **Blockchain** | Midnight Network (Preview) |
| **ZK Proving** | Compact compiler `zkir` + Lace wallet `getProvingProvider` via `@midnight-ntwrk/dapp-connector-api` |
| **SDK** | `@midnight-ntwrk/midnight-js-contracts` 4.1.1, `@midnight-ntwrk/midnight-js-types`, `@midnight-ntwrk/wallet-sdk` 1.2.0 |
| **Frontend** | React 19, Vite 8, `@midnight-ntwrk/dapp-connector-api` 4.0.1 |
| **Styling** | Vanilla CSS with glassmorphism dark theme |
| **Testing** | Vitest 4, JSDOM, React Testing Library |
| **Contracts** | Scripts: CLI (`src/cli.ts`), deploy (`src/deploy.ts`), setup (`src/setup.ts`), e2e check (`scripts/e2e-check.ts`) |

---

## Prerequisites

- **Lace Wallet** browser extension (with Midnight network support)
- **Node.js** v22+
- **Docker** (only needed for CLI-side proof server; browser dApp uses Lace's proving provider)

---

## Run Locally

```bash
# 1. Clone
git clone https://github.com/FREE-TECH01/anongate-midnight.git
cd anongate-midnight

# 2. Install
npm install

# 3. Compile contract
npm run compile

# 4. Deploy to Preview (one-time; requires Docker for proof-server)
npm run setup -- --network preview

# 5. Start dev server
npm run dev        # → http://localhost:3000

# 6. Run tests
npm run test:unit  # 8 tests: privacy UI + wallet connector
npm run test:e2e   # on-chain smoke test

# 7. CLI interaction (optional)
npm run cli        # interactive join/read-member-count
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  BROWSER (Vite + React)                                     │
│                                                             │
│  Lace Wallet Extension                                      │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  ConnectedAPI                                          │  │
│  │  ├─ getProvingProvider(keyMaterialProvider)             │  │
│  │  │  → ProvingProvider (ZK proof generated locally)     │  │
│  │  ├─ balanceUnsealedTransaction(hex) → balanced tx      │  │
│  │  ├─ submitTransaction(hex) → on-chain submission       │  │
│  │  └─ getShieldedAddresses() → keys                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  src/frontend/                                              │
│  ├─ browser-zk-config.ts   ← ZKConfigProvider (HTTP fetch) │
│  ├─ contract-caller.ts     ← MidnightProviders adapter     │
│  ├─ app.ts                 ← joinAllowlist (SDK callTx)    │
│  └─ utils.ts               ← normalizeSecretCode, mask     │
│                                                             │
│  src/components/                                            │
│  ├─ CircuitCall.tsx        ← Private/public panels UI      │
│  └─ WalletConnect.tsx      ← Lace connect/disconnect       │
└─────────────────────────────────────────────────────────────┘
                              │
                    Midnight Network
                              │
┌─────────────────────────────────────────────────────────────┐
│  ON-CHAIN                                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Contract: hello-world                                 │  │
│  │  Ledger: memberCount: Counter  (public)                │  │
│  │  Circuit: joinAllowlist(secretCode: Opaque<"string">)  │  │
│  │           (secretCode never hits the ledger)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## Demo Video Recording Checklist (< 2 Minutes)

- [ ] **0:00–0:15 — Intro**: Show the AnonGate UI. State: "AnonGate proves allowlist membership using zero-knowledge proofs on Midnight without revealing your identity or secret."
- [ ] **0:15–0:35 — Wallet connect**: Click **Connect Lace**. Approve in Lace popup. Show the connected address appearing in the UI.
- [ ] **0:35–0:55 — Private input**: Type a secret code into the password field. Point out: masked dots in the UI, "Private" panel label, the secret never leaves the browser.
- [ ] **0:55–1:30 — Circuit call**: Click **Join allowlist**. Show the loading state: "Generating proof…". Explain that the ZK proof is being generated locally in the browser via Lace.
- [ ] **1:30–1:45 — On-chain result**: Show the success message and the **Public counter** incrementing. Explain: "The proof submitted — member count went up, but nobody saw the secret."
- [ ] **1:45–2:00 — Privacy audit (DevTools)**: Open DevTools Network tab. Confirm: no outgoing request contains the plaintext secret code. "The secret was proven, not sent."
