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

> The `instance/` directory inside the `consensus` monorepo is a **stale reference implementation**, not the node — the node is `consensus-node`. A separate `consensus-facilitator` repo hosts the x402 facilitator and is out of scope for this page.

## Architecture

### Today

All proxy and tunnel traffic is relayed through the orchestrator. Nodes dial **out** to the server and hold a long-lived encrypted control tunnel (`/node/tunnel`); the server pushes work down it and reads responses back up. Every byte crosses the orchestrator.

### Direction (in progress): control plane / data plane split

The data path is being migrated so the orchestrator becomes a **control plane only**:

1. Client asks the orchestrator to route a request.
2. Orchestrator authenticates, charges (x402), selects a node, and issues a short-lived **Ed25519-signed ticket**.
3. Client connects **directly to that node** for the actual request/stream.
4. Orchestrator serves a request itself **only when no other node is available** (server-as-node fallback).

Supporting decisions:

- **Per-node cache.** Each node (including the server-as-node) owns its cache. The orchestrator keeps **sticky-by-dedupe-key routing** so repeat requests reuse the same node. Free cache hits are preserved via a node-side `402` challenge (hit → free; miss → `402` → client pays orchestrator → ticket → retry).
- **SSRF enforcement moves into the node runtime** (the node now fetches client-supplied URLs directly). The `consensus` SSRF guard (`server/utils/ssrf.ts`) is being ported into `consensus-node`.

## Cross-repo contracts

### `/proxy` request & response

`consensus` ⇄ `consensus-client`. Change both sides together.

- **Request:** `POST /proxy` with `{ target_url | target_ref, method, headers, body }`.
- **Response:** `{ status, statusText, data }` by default, or the full `{ status, statusText, headers, data, meta }` (`ProxyResponse`) when the request carries `x-verbose: true`.
- **Client-controlled headers** that influence routing/caching, all stripped before the upstream call: `x-cache-ttl`, `x-verbose`, `x-api-key`, `x-idempotency-key`, `x-node-region`, `x-node-domain`, `x-node-exclude`.

### Node control tunnel

`consensus` (`server/features/node-tunnel/`) ⇄ `consensus-node` (`src/tunnel/`, `src/crypto/`). The handshake, frame format, and `MESSAGE_TYPE` union must stay byte-compatible:

- Versioned JSON handshake; init signed with the node's Ed25519 identity; X25519 exchange → ChaCha20-Poly1305 keys via HKDF over the canonical-JSON transcript.
- Public-tunnel mux uses a 5-byte frame header (`type: u8` + `streamId: u32 BE`) with opcodes `STREAM_OPEN/DATA/END/RESET/PING/PONG`.

### Routing tickets (in progress)

The new primitive for the direct data plane. Shared across `consensus` (issuer), `consensus-node` (verifier), and `consensus-client` (bearer):

- **Signing:** Ed25519. The orchestrator holds the signing key; nodes learn its public key at registration and verify against it.
- **Claims:** `{ node_id, dedupe_key | tunnel_id, paid, exp, jti }`. Node verifies signature, `exp`, that `node_id` is itself, that the request hashes to `dedupe_key`, and that `jti` is unused (replay protection).

## Keeping repos in sync

When you touch a contract above:

1. Update this page first.
2. `consensus` + `consensus-client`: `/proxy` shapes and routing/caching headers move together.
3. `consensus` + `consensus-node`: tunnel handshake/frames/messages and the ticket format move together.
4. Note the change in each affected repo's `CLAUDE.md` if it changes day-to-day guidance.
