---
title: Architecture & Cross-Repo Contracts
description: How the Consensus repositories fit together, the control-plane / data-plane direction, and the contracts that bind them
---

This page is the **canonical reference** that every Consensus repository syncs against. When a change crosses a repo boundary — a request/response shape, a header, a tunnel frame, the ticket format — update it **here first**, then in the affected repos.

## Repositories

| Repo | Role |
| --- | --- |
| [`consensus`](https://github.com/Demali-876/consensus) | Orchestrator / proxy (`server/`, port 8080). Routing, payment, node registry, tunnels, paid WebSockets. |
| [`consensus-client`](https://github.com/Demali-876/consensus-client) | `@canister-software/consensus-cli` — TypeScript SDK + TUI/CLI used to interact with the network. |
| [`consensus-node`](https://github.com/Demali-876/consensus-node) | Bun worker-node runtime that registers with the orchestrator and serves proxied requests. |
| [`consensus-docs`](https://github.com/canister-software/consensus-docs) | This site (Astro Starlight). Hosts this canonical architecture/contracts reference. |
| [`consensus-facilitator`](https://github.com/Demali-876/consensus-facilitator) | x402 payment facilitator — verifies and settles payments across ICP, EVM (mainnet + Base + testnets), and SVM (mainnet + devnet). Backs the orchestrator's `FACILITATOR_URL`. |

> The `instance/` directory inside the `consensus` monorepo is a **stale reference implementation**, not the node — the node is `consensus-node`.

## Architecture

### Today

Nodes dial **out** to the orchestrator and hold a long-lived encrypted control tunnel (`/node/tunnel`). Evaluation, heartbeats, updates, and client traffic all travel over it, so a node can join with no open inbound port.

The control plane / data plane split is live for `/proxy`:

1. Client asks the orchestrator to route a request (`POST /proxy` with `x-direct`, the SDK default).
2. Orchestrator authenticates, charges (x402, waived in free mode), selects a node, and returns a short-lived signed **routing ticket** plus the node's `connect_url`.
3. Client connects to `wss://<node-id>.consensus.canister.software/connect`, the **node gateway**. The orchestrator bridges that socket onto the node's control tunnel as a data-plane stream; the node authenticates itself inside the stream, so the orchestrator relays bytes it cannot read.
4. The node verifies the ticket, enforces SSRF itself, executes the request, and answers.
5. The orchestrator serves a request itself (node ID `server`) only when every eligible node is saturated (server-as-node fallback).

Requests without `x-direct`, tunnels, and WebSocket sessions are still relayed through the orchestrator over the node's tunnel.

### Direction (in progress): directly reachable nodes

Through the gateway, every byte still crosses the orchestrator, which caps how far the network can scale. The next step is for clients to reach nodes **directly**: the node's hostname resolves to the node itself, which serves the data plane on an open inbound port with its own TLS. Joining does not require an open port, but operators should expect to need one.

Supporting decisions:

- **Per-node cache.** Each node (including the server-as-node) owns its cache. The orchestrator keeps **sticky-by-dedupe-key routing** so repeat requests reuse the same node. Free cache hits are to be preserved via a node-side `402` challenge (hit → free; miss → `402` → client pays orchestrator → ticket → retry).
- **SSRF enforcement lives in the node runtime** (`consensus-node/src/runtime/ssrf.ts`), checked against vectors shared with the orchestrator's guard (`server/utils/ssrf.ts`).

## Cross-repo contracts

### `/proxy` request & response

`consensus` ⇄ `consensus-client`. Change both sides together.

- **Request:** `POST /proxy` with `{ target_url | target_ref, method, headers, body, profile? }`.
- **Response:** `{ status, statusText, data }` by default, or the full `{ status, statusText, headers, data, meta }` (`ProxyResponse`) when the request carries `x-verbose: true` and for every cache hit. With `x-direct`, a node selection returns `{ route, meta }` instead: `route` holds `node_id`, `domain`, `connect_url`, `node_pubkey_pem`, `ticket`, `ticket_exp`, `dedupe_key`, and `profile_hash`.
- **Client-controlled headers** that influence routing/caching, sent inside the body's `headers` object and all stripped before the upstream call: `x-cache-ttl` (1–3600 s), `x-verbose`, `x-direct`, `x-idempotency-key`, `x-node-region`, `x-node-domain`, `x-node-exclude` (node IDs; `server` excludes the orchestrator). Preference values are comma-separated lists. The deprecated `x-api-key` is also stripped, but carries no identity or deduplication behaviour.
- **Shared derivations.** The deduplication key and proxy execution profiles (`profile-v1`) are computed identically by `consensus`, `consensus-node`, and `consensus-client`, locked by shared test vectors.

### Node control tunnel

`consensus` (`server/features/node-tunnel/`) ⇄ `consensus-node` (`src/tunnel/`, `src/crypto/`). The handshake, frame format, and `MESSAGE_TYPE` union must stay byte-compatible:

- Versioned JSON handshake; init signed with the node's Ed25519 identity; X25519 exchange → ChaCha20-Poly1305 keys via HKDF over the canonical-JSON transcript.
- Public-tunnel mux uses a 5-byte frame header (`type: u8` + `streamId: u32 BE`) with opcodes `STREAM_OPEN/DATA/END/RESET/PING/PONG`.

### Routing tickets

The primitive for the direct data plane. Shared across `consensus` (issuer, `server/features/tickets/`), `consensus-node` (verifier, `src/tickets/`, a byte-identical mirror), and `consensus-client` (bearer):

- **Format:** PASETO `v4.public` (Ed25519), locked by shared test vectors. The `kid` travels in the footer for key rotation.
- **Keys:** the orchestrator holds the signing key and publishes its verification keys at `GET /orchestrator/pubkey`. The key is also pinned into the node at registration (`orchestrator_pubkey` in the `POST /node/join` response), and the node trusts the pinned key.
- **Claims:** issuer `consensus-orchestrator`; `aud` = the node ID (also bound as the PASETO implicit assertion); `sub` = the deduplication key, which the node recomputes from the request and compares; `scope` = `proxy`; `exp` (60-second default lifetime); `jti`, single-use, tracked by the node until `exp` for replay protection.

### x402 facilitator

`consensus` (and `consensus-client`, which constructs payments) ⇄ `consensus-facilitator`. The facilitator verifies and settles x402 payments; the orchestrator reaches it via `FACILITATOR_URL`. The scheme/network identifiers must match across all three — EVM (`eip155:*`), SVM (`solana:*`), and ICP (`icp:*`) — as registered on the server's `x402ResourceServer` and accepted by the facilitator.

## Keeping repos in sync

When you touch a contract above:

1. Update this page first.
2. `consensus` + `consensus-client`: `/proxy` shapes and routing/caching headers move together.
3. `consensus` + `consensus-node`: tunnel handshake/frames/messages and the ticket format move together.
4. Note the change in each affected repo's `CLAUDE.md` if it changes day-to-day guidance.
