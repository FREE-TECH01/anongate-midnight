# AnonGate — Privacy-Preserving Allowlist Membership on Midnight

> AnonGate is a zero-knowledge privacy-preserving allowlist dApp on the Midnight Network. It enables users to connect their Lace wallet, prove membership using a private secret code locally, and update the public on-chain counter without ever exposing their private input in the UI, network payload, or ledger.

---

## 🔗 Links & Status

- **Live Demo**: [https://anongate-midnight.vercel.app](https://anongate-midnight.vercel.app) *(or your Vercel deployment URL)*
- **Demo Video**: [PLACEHOLDER — Record <2-min demo using checklist below]

---

## 📜 Contract Addresses

| Network | Status | Contract Address |
|---------|--------|------------------|
| **Preview** | Live & Confirmed | `48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8` |
| **Preprod** | Deployment in progress / Syncing | `48df3d01d2a381c2e967deaff0d64d8a8df9bda927290036b163326aecd210d8` *(updated upon sync completion)* |

---

## 💡 Real-World Use Case Narrative

### **Use Case: Exclusive DAO Alpha Club & Anonymous Sybil-Resistant Allowlisting**
Traditional allowlists require users to register their public address, creating a permanent link between their identity, wallet balance, and private activity.

**AnonGate solves this:**
An exclusive community or DAO issues single-use or shared secret access codes to prospective members. A user connects their Lace wallet to AnonGate, types their secret code into the client UI, and executes a zero-knowledge Compact proof locally. The contract verifies proof validity and increments the public member counter on-chain.

**Result:** The community verifies that a legitimate member joined, while the user's private code, wallet identity, and mainnet balances remain completely untraceable.

---

## 🛡️ Privacy Model

- **PUBLIC State**:
  - `memberCount: Counter` (the total count of verified joins recorded on the Midnight ledger).
  - Transaction hash & execution status on the public data provider.
- **PRIVATE Witness**:
  - `secretCode: Opaque<"string">` (the private input passed to `joinAllowlist()`).
  - Never disclosed via Compact `disclose()`.
  - Never sent in HTTP payloads or visible in DOM state.
- **ZK Guarantee**: The user proves to the Midnight verifier circuit that they hold valid secret witness input without revealing the secret itself to observers, indexers, or node operators.

---

## 🔒 Privacy Claim

> An on-chain observer or indexer listening to Midnight transactions can verify that a valid membership proof was submitted and that the public `memberCount` incremented by 1, but cannot determine the underlying secret code or correlate the transaction back to the user's private input.

---

## 🛠️ Tech Stack

- **Smart Contract Language**: Compact (`contracts/hello-world.compact`, compiler `0.31.1`)
- **Blockchain Platform**: Midnight Network (Preview & Preprod)
- **SDKs**: `@midnight-ntwrk/midnight-js-contracts` (4.1.1), `@midnight-ntwrk/dapp-connector-api` (4.0.1), `@midnight-ntwrk/wallet-sdk` (1.2.0)
- **Frontend Framework**: React 19 + Vite 8
- **Styling**: Modern Vanilla CSS with dark mode aesthetics & glassmorphism
- **Testing**: Vitest + JSDOM for unit tests, TSX for on-chain e2e integration checks

---

## 🚀 Prerequisites

- **Lace Wallet Extension** for Midnight Network installed in browser
- **Node.js** v22+
- **Docker Desktop** / Docker Engine with Compose v2 (runs local proof server container)

---

## 💻 Run Locally

1. **Clone the repository**:
   ```bash
   git clone https://github.com/FREE-TECH01/anongate-midnight.git
   cd anongate-midnight
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start local proof server & dev environment**:
   ```bash
   npm run setup -- --network preview
   ```

4. **Launch Vite frontend**:
   ```bash
   npm run dev
   ```

5. **Run unit tests**:
   ```bash
   npm run test:unit
   ```

---

## 📽️ Demo Video Recording Checklist (< 2 Minutes)

Use this checklist when recording your Level 2 video submission:

- [ ] **1. Introduction (0:00 - 0:15)**: Show AnonGate interface running, state that AnonGate allows proving membership in an allowlist without disclosing identity or secret input.
- [ ] **2. Wallet Connection (0:15 - 0:35)**: Click **Connect Lace**. Show the Lace extension popup asking for connection approval. Click Approve and show the UI displaying the connected address.
- [ ] **3. Secret Input & Privacy Visualizer (0:35 - 0:55)**: Type a private secret into the password input field. Point out that the secret is masked with dots (`•••••••••`) and stays strictly local to the browser.
- [ ] **4. Circuit Call & Loading State (0:55 - 1:25)**: Click **Join allowlist**. Point out the button state ("Generating proof…") as Midnight's ZK prover executes local witness computation.
- [ ] **5. On-Chain Result Verification (1:25 - 1:45)**: Show the success message and watch the **Public counter** increment on-chain.
- [ ] **6. Privacy Audit / DevTools (1:45 - 2:00)**: Briefly open browser DevTools Network tab to demonstrate that the plaintext secret code was **never** sent in any outgoing HTTP request payload.
