---
title: Consensus API
description: All routes available on the Consensus x402 Server — Core, Proxy, Nodes, and WebSocket
---

The Consensus server exposes four route groups. Routes marked **x402** require a micropayment before the request is processed. All request and response bodies are JSON unless otherwise noted.

**Base URL:** `https://consensus.canister.software`

---

## Core

Unauthenticated utility routes. No payment required.

---

### GET /

Returns server identity and the active payment address for each supported network.

**Response**

| Field | Type | Description |
|---|---|---|
| `name` | `string` | Server name |
| `version` | `string` | Server version |
| `status` | `string` | Always `"running"` |
| `payment_networks.evm` | `object` | `{ chain, address }` for the EVM network |
| `payment_networks.solana` | `object` | `{ chain, address }` for Solana |
| `payment_networks.icp` | `object` | `{ chain, address }` for ICP |
| `facilitator` | `string` | Facilitator URL used for payment verification |

```json
// Response
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

### GET /health

Returns live operational metrics for the proxy, WebSocket sessions, and nodes.

**Response**

| Field | Type | Description |
|---|---|---|
| `status` | `string` | Always `"healthy"` |
| `timestamp` | `string` | ISO 8601 timestamp |
| `proxy.cache_size` | `number` | Entries currently in the response cache |
| `proxy.total_requests` | `number` | Total requests handled since startup |
| `proxy.cache_hits` | `number` | Total cache hits since startup |
| `websocket.active_sessions` | `number` | Currently open WebSocket sessions |
| `websocket.pending_tokens` | `number` | Issued tokens not yet consumed |
| `nodes.total_nodes` | `number` | Registered active nodes |
| `nodes.current_join_price` | `number` | Current node join price in USD |

```json
// Response
{
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "proxy": {
    "cache_size": 142,
    "total_requests": 8301,
    "cache_hits": 6204
  },
  "websocket": {
    "active_sessions": 3,
    "pending_tokens": 1
  },
  "nodes": {
    "total_nodes": 5,
    "current_join_price": 350
  }
}
```

---

### GET /stats

Returns detailed proxy cache and routing statistics.

**Response**

| Field | Type | Description |
|---|---|---|
| `cache_size` | `number` | Current cache entry count |
| `pending_requests` | `number` | In-flight deduplicated requests |
| `paid_keys` | `number` | Keys marked paid but not yet cached |
| `total_requests` | `number` | Lifetime request count |
| `cache_hits` | `number` | Lifetime cache hits |
| `cache_misses` | `number` | Lifetime cache misses |
| `cache_hit_rate` | `string` | Hit rate as a percentage string |
| `uptime` | `number` | Process uptime in seconds |
| `router_stats` | `object` | Per-node routing counters |

```json
// Response
{
  "cache_size": 142,
  "pending_requests": 2,
  "paid_keys": 0,
  "total_requests": 8301,
  "cache_hits": 6204,
  "cache_misses": 2097,
  "cache_hit_rate": "74.74%",
  "uptime": 43201.5,
  "router_stats": {}
}
```

---

## Proxy

> **x402 — Payment Required**
> `POST /proxy` requires a valid x402 payment header. Cache hits are served **before** the payment check — if the response is already cached, it is returned immediately at no cost.

---

### POST /proxy

Routes an outbound HTTP request through the Consensus network. Identical requests return a cached response without re-executing the upstream call.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `target_url` | `string` | ✓ | The upstream URL to fetch |
| `method` | `string` | | HTTP method. Defaults to `GET` |
| `headers` | `object` | | Headers to forward to the upstream |
| `body` | `any` | | Request body for `POST` / `PUT` / `PATCH` |

**Request headers**

| Header | Type | Description |
|---|---|---|
| `x-verbose` | `any` | Return full metadata alongside the response body |
| `x-cache-ttl` | `number` | Override cache TTL in seconds. Defaults to `300` |
| `x-node-region` | `string` | Prefer a proxy node in this geographic region |
| `x-node-domain` | `string` | Route through a specific node domain |
| `x-node-exclude` | `string` | Exclude a specific node domain from selection |
| `x-idempotency-key` | `string` | Manual deduplication key. Auto-generated if omitted |
| `x-api-key` | `string` | **Deprecated and inert.** Stripped before the upstream call; it no longer scopes the deduplication key or carries any identity. |

**Payment**

| Network | Chain | Price |
|---|---|---|
| EVM | Base Sepolia (`eip155:84532`) | `$0.001` |
| Solana | Devnet (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`) | `$0.001` |
| ICP | TESTICP (`icp:1:xafvr-biaaa-aaaai-aql5q-cai`) | `100000` e8s |

> **Cache hits are free.** The deduplication key is computed before the payment check. If an identical request (same URL, method, semantic headers, and body) is already cached, the response is returned at no cost.

**Response** — default

| Field | Type | Description |
|---|---|---|
| `status` | `number` | HTTP status code from the upstream |
| `statusText` | `string` | HTTP status text |
| `data` | `any` | Parsed upstream response body |

**Response** — verbose (`x-verbose: true`)

Includes all default fields, plus:

| Field | Type | Description |
|---|---|---|
| `headers` | `object` | Response headers from the upstream |
| `meta.cached` | `boolean` | Whether the response was served from cache |
| `meta.dedupe_key` | `string` | SHA-256 deduplication key computed for this request |
| `meta.processing_ms` | `number` | Time taken to process the request |
| `meta.timestamp` | `string` | ISO 8601 timestamp |

```json
// Request
POST /proxy
{
  "target_url": "https://api.example.com/prices",
  "method": "GET",
  "headers": { "accept": "application/json" }
}

// Response (default)
{
  "status": 200,
  "statusText": "OK",
  "data": { "btc": 65000, "eth": 3400 }
}

// Response (x-verbose: true)
{
  "status": 200,
  "statusText": "OK",
  "headers": { "content-type": "application/json" },
  "data": { "btc": 65000, "eth": 3400 },
  "meta": {
    "cached": false,
    "dedupe_key": "a1b2c3d4e5f6...",
    "processing_ms": 214,
    "timestamp": "2025-01-01T00:00:00.000Z"
  }
}
```

---

## Nodes

Routes for registering and monitoring proxy nodes.

---

### GET /nodes

Returns all registered nodes and the current join price. No parameters.

**Response**

| Field | Type | Description |
|---|---|---|
| `total` | `number` | Total registered nodes |
| `current_join_price` | `number` | Current join price in USD |
| `nodes` | `array` | Array of node summaries |
| `nodes[].node_id` | `string` | 12-character hex node identifier |
| `nodes[].domain` | `string` | Assigned subdomain |
| `nodes[].status` | `string` | `"active"` or `"inactive"` |
| `nodes[].region` | `string \| null` | Geographic region |
| `nodes[].benchmark_score` | `number` | Performance score (0–100) |
| `nodes[].ipv6` | `string` | Node IPv6 address |
| `nodes[].ipv4` | `string \| null` | Node IPv4 address |
| `nodes[].port` | `number` | Node port |
| `nodes[].created_at` | `string` | ISO 8601 registration timestamp |
| `nodes[].heartbeat` | `object` | Last heartbeat metadata |

```json
// Response
{
  "total": 3,
  "current_join_price": 250,
  "nodes": [
    {
      "node_id": "a1b2c3d4e5f6",
      "domain": "a1b2c3d4e5f6.consensus.canister.software",
      "status": "active",
      "region": "eu-west",
      "benchmark_score": 87,
      "ipv6": "2001:db8::1",
      "ipv4": null,
      "port": 8080,
      "created_at": "2025-01-01T00:00:00.000Z",
      "heartbeat": { "last_seen": "2025-01-01T01:00:00.000Z", "rps": 120, "p95_ms": 42 }
    }
  ]
}
```

---

### POST /node/join

> **x402 — Payment Required**
> Join price is dynamic. It starts at **$100** and increases by **$50** per registered node, capped at **$1,000**:
>
> ```
> price = min($100 + n × $50, $1000)
> ```
>
> `n` is the number of nodes already registered at request time. The price is computed fresh for each payment challenge.

Registers a new node with the Consensus network. The server runs a benchmark test against `test_endpoint`, provisions a DNS subdomain, and stores the node record.

The node must send a heartbeat to `POST /node/heartbeat/:node_id` every **5 minutes** to remain active.

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `pubkey_pem` | `string` | ✓ | Node public key in PEM format |
| `alg` | `string` | ✓ | Key algorithm — `"secp256k1"` or `"ed25519"` |
| `ipv6` | `string` | ✓ | Node's public IPv6 address (must contain `:`) |
| `port` | `number` | ✓ | Port the node listens on |
| `test_endpoint` | `string` | ✓ | URL used for the benchmark test |
| `contact` | `string` | ✓ | Operator contact — email or handle |
| `evm_address` | `string` | ✓ | EVM reward address — `0x...`, exactly 42 chars |
| `solana_address` | `string` | ✓ | Solana reward address — 32–44 chars |
| `ipv4` | `string` | | Optional IPv4 address |
| `region` | `string` | | Geographic region hint (e.g. `"eu-west"`, `"us-east"`) |

**Payment**

| Network | Chain | Price |
|---|---|---|
| EVM | Base Sepolia (`eip155:84532`) | Dynamic — see formula |
| Solana | Devnet (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`) | Dynamic — see formula |

**Response**

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` on successful registration |
| `node_id` | `string` | Assigned 12-character hex node ID |
| `domain` | `string` | Assigned subdomain — `<node_id>.consensus.canister.software` |
| `ipv6` | `string` | Registered IPv6 |
| `ipv4` | `string \| null` | Registered IPv4 if provided |
| `port` | `number` | Registered port |
| `status` | `string` | Always `"active"` on success |
| `benchmark_score` | `number` | Score from benchmark. Minimum to pass: **60** |
| `price_paid` | `number` | USD price at time of registration |
| `processing_time_ms` | `number` | Total registration duration |
| `next_steps` | `string[]` | Guidance on DNS propagation and heartbeat schedule |

**Error responses**

| Status | Condition |
|---|---|
| `400` | Missing required field |
| `400` | `alg` is not `"secp256k1"` or `"ed25519"` |
| `400` | `ipv6` does not contain `:` |
| `400` | `evm_address` is not 42 chars or missing `0x` prefix |
| `400` | `solana_address` length outside 32–44 chars |
| `400` | Benchmark score below 60 — response includes `score` and `details` |
| `409` | IPv6 already registered — response includes `existing_node_id` |
| `500` | DNS provisioning failure |

```json
// Request
POST /node/join
{
  "pubkey_pem": "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----",
  "alg": "ed25519",
  "ipv6": "2001:db8::1",
  "port": 8080,
  "test_endpoint": "https://[2001:db8::1]:8080/health",
  "contact": "operator@example.com",
  "evm_address": "0xAbCd...1234",
  "solana_address": "So1ana...pubkey",
  "region": "eu-west"
}

// Response (success)
{
  "success": true,
  "node_id": "a1b2c3d4e5f6",
  "domain": "a1b2c3d4e5f6.consensus.canister.software",
  "ipv6": "2001:db8::1",
  "ipv4": null,
  "port": 8080,
  "status": "active",
  "benchmark_score": 87,
  "price_paid": 250,
  "processing_time_ms": 1842,
  "next_steps": [
    "DNS propagation may take up to 5 minutes",
    "Send heartbeat every 5 minutes to /node/heartbeat/a1b2c3d4e5f6",
    "Monitor status at /node/status/a1b2c3d4e5f6"
  ]
}

// Response (benchmark failed)
{
  "error": "Node performance below minimum requirements",
  "score": 45,
  "required_score": 60,
  "details": {
    "fetch": { "avg_latency_ms": 980 },
    "cpu": { "hashes_per_second": 12000 }
  }
}

// Response (duplicate IPv6)
{
  "error": "IPv6 already registered",
  "existing_node_id": "f6e5d4c3b2a1"
}
```

---

### POST /node/heartbeat/:node\_id

Signals the node is alive. Must be called every **5 minutes**.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `node_id` | `string` | ✓ | The node ID returned from `POST /node/join` |

**Request body**

| Field | Type | Required | Description |
|---|---|---|---|
| `rps` | `number` | | Current requests per second |
| `p95_ms` | `number` | | 95th-percentile response latency in milliseconds |
| `version` | `string` | | Node software version |

**Response**

| Field | Type | Description |
|---|---|---|
| `success` | `boolean` | `true` if recorded |
| `node_id` | `string` | Echo of the path parameter |
| `message` | `string` | Confirmation message |
| `next_heartbeat_in` | `number` | Seconds until next heartbeat is expected — always `300` |

```json
// Request
POST /node/heartbeat/a1b2c3d4e5f6
{ "rps": 120, "p95_ms": 38, "version": "1.2.0" }

// Response
{
  "success": true,
  "node_id": "a1b2c3d4e5f6",
  "message": "Heartbeat recorded",
  "next_heartbeat_in": 300
}
```

---

### GET /node/status/:node\_id

Returns the full record for a single node.

**Path parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `node_id` | `string` | ✓ | The node ID returned from `POST /node/join` |

**Response**

| Field | Type | Description |
|---|---|---|
| `node_id` | `string` | Node identifier |
| `domain` | `string` | Assigned subdomain |
| `status` | `string` | `"active"` or `"inactive"` |
| `region` | `string \| null` | Geographic region |
| `capabilities.benchmark_score` | `number` | Performance score |
| `capabilities.fetch_latency` | `number` | Average fetch latency from benchmark (ms) |
| `capabilities.cpu_performance` | `number` | CPU hashes per second from benchmark |
| `capabilities.ipv6` | `string` | Node IPv6 address |
| `capabilities.ipv4` | `string \| null` | Node IPv4 address |
| `capabilities.port` | `number` | Node port |
| `created_at` | `string` | ISO 8601 registration timestamp |
| `updated_at` | `string` | ISO 8601 last-update timestamp |
| `heartbeat.last_seen` | `string` | ISO 8601 timestamp of last heartbeat |
| `heartbeat.rps` | `number` | RPS from last heartbeat |
| `heartbeat.p95_ms` | `number` | p95 latency from last heartbeat |

```json
// Response
{
  "node_id": "a1b2c3d4e5f6",
  "domain": "a1b2c3d4e5f6.consensus.canister.software",
  "status": "active",
  "region": "eu-west",
  "capabilities": {
    "benchmark_score": 87,
    "fetch_latency": 42,
    "cpu_performance": 980000,
    "ipv6": "2001:db8::1",
    "ipv4": null,
    "port": 8080
  },
  "created_at": "2025-01-01T00:00:00.000Z",
  "updated_at": "2025-01-01T01:00:00.000Z",
  "heartbeat": {
    "last_seen": "2025-01-01T01:00:00.000Z",
    "rps": 120,
    "p95_ms": 42
  }
}
```

---

## WebSocket

Opening a paid WebSocket session is a two-step process:

1. **Acquire a token** — `GET /ws` with x402 payment. Returns a short-lived token.
2. **Connect** — upgrade to `WSS /ws-connect?token=<token>` within **60 seconds**.

---

### GET /ws

> **x402 — Payment Required**
> Price is computed from the billing model and session parameters passed as query strings. Payment is charged upfront for the full session before the token is issued.

Pays for and acquires a WebSocket session token.

**Query parameters**

| Parameter | Type | Default | Required | Description |
|---|---|---|---|---|
| `model` | `string` | `hybrid` | | Billing model — `hybrid`, `time`, or `data` |
| `minutes` | `number` | `5` | | Session duration limit in minutes. Consumed by `hybrid` and `time` |
| `megabytes` | `number` | `50` | | Data transfer limit in MB. Consumed by `hybrid` and `data` |

**Billing models**

| Model | Billed by | Params that affect price |
|---|---|---|
| `hybrid` | Time **and** data | `minutes` + `megabytes` |
| `time` | Duration only | `minutes` |
| `data` | Data transfer only | `megabytes` |

**Payment**

Price is computed server-side from `model`, `minutes`, and `megabytes` before the payment challenge is issued. All three networks are accepted.

| Network | Chain |
|---|---|
| EVM | Base Sepolia (`eip155:84532`) |
| Solana | Devnet (`solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1`) |
| ICP | TESTICP (`icp:1:xafvr-biaaa-aaaai-aql5q-cai`) |

**Response**

| Field | Type | Description |
|---|---|---|
| `token` | `string` | 64-character hex session token |
| `connect_url` | `string` | Pre-formed `wss://` URL with the token appended |
| `expires_in` | `number` | Seconds until the token expires — always `60` |

```
// Request
GET /ws?model=hybrid&minutes=10&megabytes=100

// Response
{
  "token": "a1b2c3...64-char-hex",
  "connect_url": "wss://consensus.canister.software/ws-connect?token=a1b2c3...64-char-hex",
  "expires_in": 60
}
```

---

### WSS /ws-connect

Upgrades to a WebSocket connection using a valid session token. Tokens expire **60 seconds** after issuance and are single-use.

**Query parameters**

| Parameter | Type | Required | Description |
|---|---|---|---|
| `token` | `string` | ✓ | The token returned by `GET /ws`. Consumed on connection |

**Connection headers** (optional, sent during the WebSocket upgrade)

| Header | Type | Description |
|---|---|---|
| `x-node-region` | `string` | Prefer a proxy node in this geographic region |
| `x-node-domain` | `string` | Route the session through a specific node domain |
| `x-node-exclude` | `string` | Exclude a specific node domain from selection |

**On connect — `session_start` message**

Sent by the server immediately after the handshake completes:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Always `"session_start"` |
| `sessionId` | `string` | UUID for this session |
| `model` | `string` | Billing model from the token |
| `served_by` | `string` | Node ID serving the session, or `"local"` for self-fallback |
| `limits.timeSeconds` | `number` | Maximum session duration in seconds |
| `limits.dataMB` | `number` | Maximum data transfer in megabytes |
| `pricing.totalCost` | `number` | Total USD charged for this session |
| `pricing.pricePerMinute` | `number` | Rate per minute |
| `pricing.pricePerMB` | `number` | Rate per megabyte |

**On limit reached — `session_expired` message**

Sent immediately before the server closes the connection:

| Field | Type | Description |
|---|---|---|
| `type` | `string` | Always `"session_expired"` |
| `reason` | `string` | `"time_limit_reached"` or `"data_limit_reached"` |
| `finalUsage.durationMinutes` | `number` | Total session duration in minutes |
| `finalUsage.dataMB` | `number` | Total data transferred in megabytes |

**HTTP error conditions** (before upgrade)

| Status | Condition |
|---|---|
| `401` | Token not found or already consumed |
| `401` | Token expired (older than 60 seconds) |

```json
// session_start
{
  "type": "session_start",
  "sessionId": "550e8400-e29b-41d4-a716-446655440000",
  "model": "hybrid",
  "served_by": "a1b2c3d4e5f6",
  "limits": { "timeSeconds": 600, "dataMB": 100 },
  "pricing": { "totalCost": 0.042, "pricePerMinute": 0.003, "pricePerMB": 0.0001 }
}

// session_expired (time limit)
{
  "type": "session_expired",
  "reason": "time_limit_reached",
  "finalUsage": { "durationMinutes": 10.0, "dataMB": 38.4 }
}

// session_expired (data limit)
{
  "type": "session_expired",
  "reason": "data_limit_reached",
  "finalUsage": { "durationMinutes": 4.2, "dataMB": 100.0 }
}
```
