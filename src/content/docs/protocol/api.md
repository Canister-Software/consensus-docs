---
title: Consensus API
description: Every route on the Consensus server — core, proxy, tunnels, WebSockets, and nodes.
---

The Consensus server (the orchestrator) exposes these route groups. All request and response bodies are JSON unless noted otherwise.

**Base URL:** `https://consensus.canister.software`

:::note[Free mode during the public beta]
The server runs in **free mode** during the public beta: [`GET /config`](#get-config) returns `{ "free_mode": true }`, and no route asks for payment. Routes marked **x402** below require an x402 payment only when free mode is off. The payment details are listed so clients can be built against them.
:::

---

## Core

Utility routes. No payment, rate limited to 120 requests per minute.

---

### GET /

Returns the server identity, the payment address for each network, and the facilitator it uses.

```json
{
  "name": "Consensus x402 Server",
  "version": "2.0.0",
  "status": "running",
  "payment_networks": {
    "evm":    { "chain": "Base Sepolia", "address": "0x..." },
    "solana": { "chain": "Devnet",       "address": "<base58>" },
    "icp":    { "chain": "TESTICP",      "address": "<principal>" }
  },
  "facilitator": "https://facilitator.canister.software"
}
```

---

### GET /config

Reports whether the server is in free mode. Clients use it to decide whether payment credentials are needed.

```json
{ "free_mode": true }
```

---

### GET /health

Live metrics for the proxy, WebSocket sessions, tunnels, and connected nodes.

| Field | Description |
|---|---|
| `status` | Always `"healthy"` |
| `timestamp` | ISO 8601 timestamp |
| `proxy` | `cache_size`, `total_requests`, `cache_hits` |
| `websocket` | `active_sessions`, `pending_tokens`, and `router_stats` (node counts, load, sticky-routing and selection counters) |
| `tunnels` | `active_tunnels`, `pending_tokens` |
| `node_gateway` | The gateway domain and its `active_connections` |
| `node_tunnel` | Connected node sessions: counts, plus one entry per session with `node_id`, `mode`, `version`, and activity |
| `network` | `avg_http_latency_ms`, `avg_ws_latency_ms` |

---

### GET /stats

Proxy cache and routing statistics: `cache_size`, `pending_requests`, `total_requests`, `cache_hits`, `cache_misses`, `cache_hit_rate` (a percentage string), `uptime` in seconds, and `router_stats`.

---

## Proxy

### POST /proxy

> **x402** when free mode is off: `$0.001` on EVM or Solana, `100000` e8s on ICP. A cache hit is returned **before** the payment step, so it is never charged.

Routes an HTTP request through the network. Identical requests share one upstream call and one cached response. Rate limited to 30 requests per minute.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `target_url` | `string` | ✓ * | The public URL to fetch |
| `target_ref` | `object` | ✓ * | Instead of `target_url`: a private tunnel target, `{ kind: "tunnel", tunnel_id, capability, path }` |
| `method` | `string` | | HTTP method. Defaults to `GET` |
| `headers` | `object` | | Headers to forward upstream, plus the control headers below |
| `body` | `any` | | Request body for `POST`, `PUT`, `PATCH` |
| `profile` | `object` | | A proxy execution profile, compiled by the SDK from a named [profile](/quickstart/usage/) |

\* One of `target_url` or `target_ref` is required.

**Control headers**

These go **inside the `headers` object of the request body**, not on the HTTP request itself. The server reads them and strips them before calling upstream.

| Header | Description |
|---|---|
| `x-verbose` | Return the upstream headers and a `meta` block |
| `x-cache-ttl` | Cache lifetime in seconds, from 1 to 3600. Defaults to `300` |
| `x-node-region` | Prefer nodes whose region contains this value, e.g. `east-us`. Comma-separated for several |
| `x-node-domain` | Route only through these node domains. Comma-separated |
| `x-node-exclude` | Never use these **node IDs**. Comma-separated; `server` excludes the orchestrator itself |
| `x-direct` | Ask for a [direct route](#direct-routing) to a node instead of a relayed response |
| `x-idempotency-key` | Request identifier. Generated if omitted |
| `x-api-key` | **Deprecated and inert.** Stripped without effect |

**Response**

By default:

```json
{ "status": 200, "statusText": "OK", "data": { "btc": 65000, "eth": 3400 } }
```

With `x-verbose`, and always for a cache hit:

```json
{
  "status": 200,
  "statusText": "OK",
  "headers": { "content-type": "application/json" },
  "data": { "btc": 65000, "eth": 3400 },
  "meta": {
    "cached": false,
    "dedupe_key": "a1b2c3d4e5f6...",
    "served_by": "74717f995963",
    "profile_hash": null,
    "processing_ms": 214,
    "timestamp": "2026-01-01T00:00:00.000Z"
  }
}
```

`meta.served_by` is the node that executed the request: a node ID, `proxy-direct` when the orchestrator fetched it itself, or `private-tunnel`.

#### Direct routing

With `x-direct` set, the orchestrator picks a node and returns a **route** instead of executing the request. The client then sends the request to the node over the node gateway, presenting the signed ticket. This is the default path for the [SDK's `ProxyClient`](/quickstart/usage/).

```json
{
  "route": {
    "node_id": "74717f995963",
    "domain": "74717f995963.consensus.canister.software",
    "connect_url": "wss://74717f995963.consensus.canister.software/connect",
    "node_pubkey_pem": "-----BEGIN PUBLIC KEY-----...",
    "ticket": "v4.public....",
    "ticket_exp": 1791080000,
    "dedupe_key": "a1b2c3d4e5f6...",
    "profile_hash": null
  },
  "meta": { "direct": true, "served_by": "74717f995963", "dedupe_key": "a1b2c3d4e5f6..." }
}
```

If the orchestrator itself is the chosen node, it serves the request inline and returns a normal response. See [Architecture](/protocol/architecture/) for the ticket format.

**Errors:** `400` for a missing or invalid target, `429` when rate limited, `500` when the upstream request fails.

---

## Tunnels

Tunnels put a local service on a public address. No payment is required.

### POST /tunnel

Creates a tunnel and returns a single-use token for the connection that carries its traffic.

| Field | Type | Description |
|---|---|---|
| `type` | `string` | `http` (default) or `tcp` |
| `visibility` | `string` | `public` (default) or `private`. Private tunnels must be `http` and are reachable only through `/proxy` with a `target_ref` |
| `target` | `string` | Optional `host[:port]` for the network to reach on your behalf through a node. Omit it to serve traffic from your own connection |
| `port` | `number` | Optional target port, if not part of `target` |

```json
{
  "tunnelId": "amber-otter",
  "type": "http",
  "token": "<64-char hex>",
  "connect_url": "wss://consensus.canister.software/tunnel-connect?token=...",
  "expires_in": 60,
  "node_id": null,
  "public_url": "https://amber-otter.tunnel.canister.software"
}
```

A public `http` tunnel returns `public_url`; a public `tcp` tunnel returns `tcp_addr` (`tcp.tunnel.canister.software:20000`); a private tunnel returns `proxy_capability` instead, which callers pass in `target_ref.capability`.

### WSS /tunnel-connect

Opens the connection that carries the tunnel's traffic. Pass `?token=` from `POST /tunnel` within 60 seconds; the token is single-use. Returns `401` for a missing, used, or expired token.

---

## WebSocket

Opening a WebSocket session takes two steps:

1. **Get a token:** `GET /ws` returns a short-lived token.
2. **Connect:** open `WSS /ws-connect?token=<token>` within **60 seconds**.

### GET /ws

> **x402** when free mode is off. The price is computed from the session parameters and charged up front for the whole session.

**Query parameters**

| Parameter | Default | Description |
|---|---|---|
| `model` | `hybrid` | `hybrid` (time and data), `time`, or `data` |
| `minutes` | `5` | Session time limit. Used by `hybrid` and `time` |
| `megabytes` | `50` | Data limit. Used by `hybrid` and `data` |

```json
// GET /ws?model=hybrid&minutes=10&megabytes=100
{
  "token": "550e8400-e29b-41d4-a716-446655440000",
  "connect_url": "wss://consensus.canister.software/ws-connect?token=550e8400-...",
  "expires_in": 60
}
```

### WSS /ws-connect

Upgrades to the WebSocket session. The token is single-use and expires 60 seconds after it is issued; a missing, used, or expired token gets `401` before the upgrade.

To steer which node serves the session, send `x-node-region`, `x-node-domain`, or `x-node-exclude` as headers on the upgrade request. They behave as they do for [`/proxy`](#post-proxy).

**`session_start`**, sent as soon as the connection opens:

```json
{
  "type": "session_start",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "model": "hybrid",
  "served_by": "74717f995963",
  "limits": { "timeSeconds": 600, "dataMB": 100 },
  "pricing": { "totalCost": 0.042, "pricePerMinute": 0.003, "pricePerMB": 0.0001 }
}
```

`served_by` is the node ID serving the session, or `"local"` when the orchestrator serves it.

**`session_expired`**, sent just before the server closes the connection:

```json
{
  "type": "session_expired",
  "reason": "data_limit_reached",
  "finalUsage": { "durationMinutes": 4.2, "dataMB": 100.0 }
}
```

`reason` is `time_limit_reached` or `data_limit_reached`.

---

## Nodes

Routes for listing nodes and for the [node join flow](/guides/node/). The node software calls the join routes for you during `bun run setup`.

### GET /nodes

Lists every registered node, including the orchestrator itself (node ID `server`), and the join price that applies when free mode is off.

```json
{
  "total": 2,
  "current_join_price": 200,
  "nodes": [
    {
      "node_id": "74717f995963",
      "domain": "74717f995963.consensus.canister.software",
      "status": "active",
      "region": "east-us",
      "capabilities": {
        "forward_proxy": true,
        "reverse_proxy": true,
        "websockets": true,
        "tunnels": true,
        "ip_leasing": true,
        "benchmark_score": 100
      },
      "benchmark_score": 100,
      "update": null,
      "created_at": 1782949050,
      "heartbeat": { "version": "0.1.0-alpha.12", "at": 1791080962 }
    }
  ]
}
```

| Field | Description |
|---|---|
| `status` | `active` nodes receive traffic. A node may also be `trial` (proving stability before it is routed to) or `inactive` |
| `region` | Region classified from the node's IPv4 address, using Azure-style names such as `east-us`, `west-europe`, or `japan-east` |
| `update` | `null`, or `{ state, target_version, at }` while the node is applying an update |
| `heartbeat` | The node software version and the Unix time it was last seen. Heartbeats travel over the node's control tunnel |
| `created_at` | Unix time of registration |

### GET /node/status/:node\_id

Returns one node in the same shape as an entry in `GET /nodes`. `404` if the node does not exist.

### POST /node/email/start

Starts verification of the operator's contact email. Body: `{ "email": "ops@example.com" }`. Returns `{ success, verification_id, expires_at }`; the code is emailed and is valid for 10 minutes.

### POST /node/email/verify

Body: `{ "email", "verification_id", "code" }`. Returns `{ success, email, email_verification_token, expires_at }`. The token is used in `POST /node/join`.

### GET /node/region/:ipv4

Classifies an IPv4 address into a region. Returns `{ success, region, ... }`.

### POST /node/join

> **x402** when free mode is off: the join price is `min($100 + $50 × n, $1000)`, where `n` is the number of registered nodes, payable on EVM or Solana. Joining is free during the public beta.

Registers a node. Registration requires a **join authorization** from the encrypted evaluation, which the node software runs over its tunnel before joining; without one the server answers `403 Eval required`.

**Request body**

| Field | Required | Description |
|---|---|---|
| `pubkey_ed25519_pem` | ✓ * | Node identity public key (PEM). Must match the key that passed evaluation |
| `pubkey_secp256k1_pem` | ✓ * | Alternative identity key |
| `ipv4` | ✓ | Public IPv4 address |
| `ipv6` | | Public IPv6 address |
| `port` | ✓ | The node's local port (1–65535) |
| `contact` | ✓ | Verified contact email |
| `email_verification_token` | ✓ | From `POST /node/email/verify` |
| `evm_address` | ✓ | EVM payout address: `0x` plus 40 hex characters |
| `solana_address` | ✓ | Solana payout address (32–44 characters) |
| `icp_address` | ✓ | ICP payout address |
| `join_id`, `join_signature` | ✓ | The join authorization from evaluation, signed with the node identity key |
| `capabilities` | | Declared capabilities: `forward_proxy`, `reverse_proxy`, `websockets`, `tunnels`, `ip_leasing` |

\* At least one identity key is required.

**Response**

```json
{
  "success": true,
  "node_id": "74717f995963",
  "domain": "74717f995963.consensus.canister.software",
  "connect_url": "wss://74717f995963.consensus.canister.software/connect",
  "region": "east-us",
  "status": "active",
  "benchmark_score": 100,
  "orchestrator_pubkey": "...",
  "price_paid": 200,
  "next_steps": ["Keep the outbound control tunnel connected at /node/tunnel ..."]
}
```

`status` is `trial` instead of `active` when the stability trial is enabled. `orchestrator_pubkey` pins the key the node uses to verify routing tickets. `price_paid` reports the join price at the time of registration, even in free mode when nothing was charged.

**Errors:** `400` invalid or missing fields, `401` unverified email or bad join signature, `403` no join authorization, `409` identity already registered or join authorization already used, `410` join authorization expired.

### POST /node/verify-integrity/:node\_id

The node signs its release manifest with its identity key; the server checks the signature against the registered key and compares the manifest with the required release. Returns `{ verified: true, ... }`, or `{ verified: false, reason, required, observed }` on a mismatch. The node software calls this with `bun run verify`.

### GET /update/latest

The release every node is required to run: `product`, `version`, `platform`, `commit`, `download_url` (a GitHub release artifact), `tarball_sha256`, `routes_hash`, and `capabilities`. `404` if no release is set. Updates are applied over the control tunnel; see [Setting up a node](/guides/node/#6-day-to-day-operations).

### GET /orchestrator/pubkey

The orchestrator's routing-ticket verification keys, as a JWK set (`EdDSA`, `Ed25519`, with a `kid` per key).

### WSS /node/tunnel

The encrypted control tunnel each node keeps open. It carries evaluation, heartbeats, updates, and client traffic. Only the node software connects here.

### WSS `<node-id>.consensus.canister.software/connect`

The node gateway. Clients on the direct route connect here; the orchestrator bridges the connection onto that node's control tunnel. The node authenticates itself inside the stream, so the orchestrator relays bytes it cannot read.
