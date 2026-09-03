---
title: Core Concepts
description: The building blocks of the Consensus Protocol — x402, deduplication, schemes, nodes, and sessions
---

This page defines the fundamental concepts that underpin the Consensus Protocol. Understanding these helps explain why the system behaves the way it does and how each part relates to the others.

---

## x402

x402 is an open payment protocol built on HTTP. It extends the standard `402 Payment Required` status code into a machine-readable payment flow that any HTTP client can implement.

The full flow for a protected request:

1. The client sends a normal HTTP request
2. The server responds `402 Payment Required` with a payment challenge in the response headers — specifying the accepted networks, price, and payment address
3. The client signs and submits a micropayment on the chosen network
4. The client retries the original request with the signed payment attached in the `X-Payment` header
5. The server verifies the payment through the facilitator and processes the request

```
Client                  Consensus              Facilitator
  │                        │                       │
  ├── GET /ws ────────────►│                       │
  │◄── 402 Payment Req ────┤                       │
  │                        │                       │
  ├── GET /ws (+ payment) ►│                       │
  │                        ├── verify payment ────►│
  │                        │◄── verified ──────────┤
  │◄── 200 (token) ────────┤                       │
```

The `x402Client` and `wrapFetchWithPayment` in `@x402/fetch` handle steps 2–4 automatically. Your code only sees the final response.

---

## Facilitator

The facilitator is an off-chain service that verifies x402 payment proofs. When the Consensus server receives a request with an `X-Payment` header, it submits the proof to the facilitator, which confirms on-chain settlement before granting access.

The facilitator decouples payment verification from the server — the server does not need to query the blockchain directly. Consensus uses `https://facilitator.canister.software` by default.

The facilitator is network-aware: a different verification path is used for each payment network (EVM, Solana, ICP).

---

## Payment Networks and Schemes

Consensus accepts payment on three networks simultaneously. Clients choose any one:

| Network | Identifier | Settlement |
|---|---|---|
| EVM | `eip155:84532` (Base Sepolia) | `viem` / `privateKeyToAccount` |
| Solana | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` (Devnet) | `@solana/signers` / `createKeyPairSignerFromBytes` |
| ICP | `icp:1:xafvr-biaaa-aaaai-aql5q-cai` (TESTICP) | `@canister-software/x402-icp` / `pemToSigner` |

A **scheme** defines how payment is structured and verified for a given network. The `exact` scheme requires the client to pay a specific amount to a specific address — no range, no estimation. The server registers one scheme implementation per network:

```js
// Server-side
x402Server
  .register('eip155:84532',                          new ExactEvmScheme())
  .register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', new ExactSvmScheme())
  .register('icp:1:xafvr-biaaa-aaaai-aql5q-cai',    new ExactIcpScheme())
```

The client registers the corresponding client-side scheme to know how to sign and submit payment for that network:

```js
// Client-side
registerExactEvmScheme(client, { signer })
registerExactSvmScheme(client, { signer })
registerExactIcpScheme(client, { signer })
```

---

## Deduplication Key

The deduplication key is the core fingerprint that identifies a unique request. It is a SHA-256 hash of the canonicalized request, computed before any payment is checked.

The key is derived from four inputs:

| Input | How it's canonicalized |
|---|---|
| **Method** | Uppercased — `GET`, `POST`, etc. |
| **URL** | Lowercased scheme and host, default ports removed, query params sorted alphabetically, fragment stripped |
| **Semantic headers** | Only `accept` and `content-type` are included, lowercased and trimmed |
| **Body** | SHA-256 hash of the body — JSON objects are deep-sorted before hashing for stability |

Two requests produce the same deduplication key if and only if all four inputs are equivalent after canonicalization. This means:

- `https://api.example.com/prices?a=1&b=2` and `https://api.example.com/prices?b=2&a=1` produce the **same key**
- The same JSON body with different key ordering produces the **same key**
- Two callers issuing the same request produce the **same key** and share the cache entry — the scope is always global

:::note[No caller scoping]
The deduplication scope is global. There is no per-caller namespace: the same canonical request is the same key no matter who sends it, which is what makes deduplication pay off across users. Earlier versions scoped the key by `x-api-key`; that behaviour has been removed, and the header is now stripped without effect. Do not send anything caller-specific in `accept` or `content-type`, the only headers that enter the key.
:::

The key is computed twice per request: once before the payment check (to serve cache hits for free) and once after payment to store the response.

---

## Exact-Once Execution

When a cache miss occurs, Consensus enforces that the upstream request executes exactly once, even under concurrent load.

The execution model has three states:

1. **Cache hit** — the response is returned immediately from the local cache. No payment is required.
2. **Pending** — an identical request is already in flight. The incoming request waits on the same promise and receives the same response when it resolves. One upstream call, multiple waiters.
3. **Cache miss** — the request is new. It is executed against the upstream service, the response is stored in cache, and all waiters receive the result.

```
Request A ──► MISS ──► execute upstream ──► cache + respond
Request B ──► PENDING (waits on A) ──────────────────────► respond
Request C ──► HIT ──► respond from cache (free)
```

Cached responses persist for the configured TTL (default `300s`, overridable per-request with `x-cache-ttl`). Once the TTL expires, the next request re-executes and refreshes the cache.

---

## Nodes

A **node** is an independent server operator registered with the Consensus network. Nodes extend the network's geographic reach, absorb proxy load, and provide stable egress IPs for IP-whitelisting use cases.

### Registration

Nodes join by calling `POST /node/join` with an x402 payment. The join price increases with network size:

```
price = min($100 + n × $50, $1000)
```

Before a node is admitted, the server runs a benchmark against the node's `test_endpoint`. Nodes scoring below **60/100** are rejected. Passing nodes receive a DNS subdomain (`<node_id>.consensus.canister.software`) provisioned automatically.

### Routing

When a proxy or WebSocket request arrives, the router selects a node based on preference headers (`x-node-region`, `x-node-domain`, `x-node-exclude`). If no matching node is available, the server handles the request directly — this is called **self-fallback**.

### Heartbeat

Registered nodes must send a heartbeat to `POST /node/heartbeat/:node_id` every **5 minutes**. Heartbeats report current `rps`, `p95_ms`, and software `version`. Nodes that stop sending heartbeats are marked inactive and removed from routing.

---

## WebSocket Sessions

Consensus treats WebSocket access as **prepaid computation**. A session is always acquired in two steps:

### 1. Token acquisition (`GET /ws`)

The client sends an HTTP request specifying the billing model and desired limits. Consensus responds with a `402` challenge. After payment, a session token is returned — a 64-character hex string valid for **60 seconds**.

### 2. Connection (`WSS /ws-connect?token=`)

The client upgrades to WebSocket using the token. The token is single-use and consumed on connect. The server immediately sends a `session_start` message confirming limits and pricing.

### Billing models

| Model | Billed by | Session ends when |
|---|---|---|
| `time` | Duration only | Time limit reached |
| `data` | Transfer only | Data limit reached |
| `hybrid` | Both time and data | Either limit reached |

Price is computed server-side from the model and the `minutes` / `megabytes` parameters before the payment challenge is issued — the client always knows the exact cost before paying.

When a limit is reached the server sends a `session_expired` message and closes the connection cleanly. There is no automatic extension — the client must acquire a new token to continue.

---

## Cache TTL

Every cached response has a TTL. When the TTL expires the response is evicted and the next identical request re-executes.

TTL is resolved in this priority order:

1. `x-cache-ttl` request header — per-request override
2. `cache-ttl` request header — alias
3. `cache_ttl` ProxyClient option — client-level default
4. Server default — **300 seconds**

The minimum enforced TTL is **1 second**. Setting TTL to `0` does not disable caching — use a dedicated bypass mechanism if you need guaranteed freshness.

---

## Request Lifecycle

Putting it all together, a full `POST /proxy` request flows as follows:

```
1. Compute deduplication key from the canonicalized request

2. Cache hit?
   └─ Yes → return cached response (free, no payment check)

3. Payment check (x402)
   └─ No valid payment → 402 challenge issued to client
   └─ Valid payment → verified by facilitator → continue

4. Pending request for this key?
   └─ Yes → wait for in-flight result → return same response

5. Select node via router
   └─ Node available → proxy request to node
   └─ No node → execute directly (self-fallback)

6. Execute upstream request

7. Store response in cache with TTL

8. Return response to all waiters
```
