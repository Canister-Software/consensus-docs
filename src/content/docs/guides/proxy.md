---
title: Routing a request
description: Follow one HTTP request through the Consensus network, from your code to the upstream API and back.
sidebar:
  order: 1
---

This guide follows a single HTTP request through the Consensus network: how you send it, what the server does with it, how a node is chosen, and how to read what comes back.

You need a working `fetchWithPayment` from [Client Setup](/quickstart/request/). Every example below builds on it.

## 1. Send the request

There are three ways to route a request. All of them end up at the same `POST /proxy` route.

**Let `ProxyClient` intercept `fetch()`.** In `auto` mode, `fetch()` calls inside your route handlers are proxied with no code changes. See [Usage](/quickstart/usage/#auto-strategy).

**Proxy one call explicitly.** In `manual` mode, call `req.consensus.fetch()` where you want a request routed:

```ts
import express from 'express'
import { ProxyClient } from '@canister-software/consensus-cli'

const app = express()
app.use(ProxyClient(fetchWithPayment, { strategy: 'manual' }))

app.get('/prices', async (req, res) => {
  const response = await req.consensus.fetch('https://api.example.com/prices')
  res.json(await response.json())
})
```

**Call the route directly.** `ProxyClient` is a convenience. Underneath, it posts the target request to `/proxy`. Control headers such as `x-verbose` go inside the body's `headers` object, alongside the headers you want forwarded upstream:

```ts
const response = await fetchWithPayment('https://consensus.canister.software/proxy', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    target_url: 'https://api.example.com/prices',
    method: 'GET',
    headers: { accept: 'application/json', 'x-verbose': 'true' },
  }),
})
console.log(await response.json())
```

## 2. What the server does with it

When the request reaches the server, it goes through these steps in order:

1. **Fingerprint the request.** The server computes a [deduplication key](/protocol/concepts/#deduplication-key) from the method, the normalized URL, the `accept` and `content-type` headers, and the body.
2. **Check the cache.** If a response for that key is cached, it is returned immediately. No payment step runs and no upstream call is made.
3. **Check payment.** Otherwise the request goes through the [x402](/protocol/concepts/#x402) payment step. `fetchWithPayment` answers the `402` challenge for you and retries the request.
4. **Join an in-flight request.** If an identical request is already being fetched, this one waits for that result instead of calling upstream again.
5. **Select a node.** The router picks a node, honoring any preferences you sent (see [Choose where it runs](#3-choose-where-it-runs)). If every eligible node is saturated, the orchestrator handles the request itself.
6. **Call the upstream API** once. With `ProxyClient`, this happens on the node: the server returns a signed ticket, and the client sends the request to the node through the node gateway (see [Direct routing](#direct-routing)).
7. **Cache the response** for its TTL.
8. **Respond** to this request and to every request that was waiting on it.

The [Request Lifecycle](/protocol/concepts/#request-lifecycle) section of Core Concepts covers each step in more detail.

:::note[Public beta]
The network is free to use during the public beta. This page describes the payment step as the protocol implements it.
:::

## 3. Choose where it runs

By default the router picks a node for you: it sends a request back to the node that served the same request before, so that node's cache is reused, and otherwise picks a lightly loaded node. To steer it, set these as `ProxyClient` options, per call with `req.consensus.fetch()`, or in the body's `headers` on a direct `/proxy` call:

| Option | Header | Effect |
|---|---|---|
| `node_region` | `x-node-region` | Prefer nodes in this region, such as `east-us` or `west-europe` |
| `node_domain` | `x-node-domain` | Route only through this node domain |
| `node_exclude` | `x-node-exclude` | Never use this node ID. `server` excludes the orchestrator |

Each header takes a comma-separated list. For example, to send one call through a node in `east-us`:

```ts
const response = await req.consensus.fetch(
  'https://api.example.com/prices',
  { method: 'GET' },
  { node_region: 'east-us' }
)
```

To find nodes and their regions, use [`GET /nodes`](/protocol/api/#get-nodes) or `consensus ip list`.

## 4. Control caching

A cached response is reused by **every** caller who sends the same request, so a popular request is fetched upstream once and then served from cache. Responses stay cached for 300 seconds unless you set a TTL, from 1 second up to 1 hour:

- the `cache_ttl` option on `ProxyClient` or on a single call;
- `x-cache-ttl` in the body's `headers` on a direct `/proxy` call.

The [Cache TTL](/protocol/concepts/#cache-ttl) section explains the full priority order.

## 5. Read the response

By default `/proxy` returns the upstream result:

```json
{
  "status": 200,
  "statusText": "OK",
  "data": { "btc": 65000, "eth": 3400 }
}
```

Send `x-verbose: true`, or set `verbose: true` on `ProxyClient`, to also get the upstream headers and a `meta` block:

```json
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

`meta.cached` tells you whether the response came from cache, `meta.served_by` names the node that executed it, and `meta.dedupe_key` is the request fingerprint the server computed. A cache hit always comes back in this verbose shape. Send the same request twice with `x-verbose: true` to watch the second one come back with `"cached": true`.

## Direct routing

`ProxyClient` uses direct routing by default. Instead of the orchestrator fetching the URL and relaying the answer, it splits the work:

1. The client sends the request to `/proxy` with `x-direct`.
2. The orchestrator checks payment, picks a node, and returns a **route**: the node's `connect_url` and a short-lived signed ticket bound to this exact request.
3. The client sends the request to the node through the **node gateway**, `wss://<node-id>.consensus.canister.software/connect`.
4. The node verifies the ticket, fetches the URL, and answers.

If the orchestrator is the node chosen, it simply answers the request itself. Set `direct: false` on `ProxyClient` to force the relayed path.

Today the node gateway still runs on the orchestrator, which bridges each connection onto the node's tunnel. The next step is for clients to reach nodes directly; [Architecture](/protocol/architecture/) tracks that work.

## Next steps

- [Usage](/quickstart/usage/): every `ProxyClient` option, batch requests, and spend limits
- [Consensus API](/protocol/api/#post-proxy): the full `/proxy` reference
- [Core Concepts](/protocol/concepts/): deduplication, exact-once execution, and caching in depth
