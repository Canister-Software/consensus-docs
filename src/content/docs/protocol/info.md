---
title: What is Consensus Protocol?
description: A decentralized x402 HTTP proxy service network
---

Consensus is a decentralized **HTTPS protocol** that operates as a [proxy](https://en.wikipedia.org/wiki/Proxy_server) on behalf of applications. More simply, Consensus Protocol is a network for sharing compute resources.

<img
  src="/consensus.png"
  alt="High-level Consensus request flow"
  class="consensus-diagram light"
/>
<img
  src="/consensus-dark.png"
  alt="High-level Consensus request flow"
  class="consensus-diagram dark"
/>

## How It Works

Consensus sits **between an application and an external HTTP service**. Applications send standard HTTP requests to the Consensus network.

Incoming requests are [canonicalized](https://en.wikipedia.org/wiki/Canonicalization) to produce a unique signature. If an identical request has already been processed successfully, Consensus returns the cached response instead of executing the request again.

<img
  src="/proxy.png"
  alt="High-level Consensus request flow"
  class="consensus-diagram light"
/>
<img
  src="/proxy-dark.png"
  alt="High-level Consensus request flow"
  class="consensus-diagram dark"
/>

## An Economy for Computation

Consensus is a **paid HTTP proxy network** with built-in caching and deduplication.

The network maintains a shared cache of executed requests. When a request has already been processed, the cached result is returned instantly—reducing costs and API load. This creates an economic incentive to provide compute, while preventing waste from duplicate execution.

Rather than relying on trust or centralized control, Consensus coordinates access to compute through **protocol-level pricing**.

## Use cases

Many modern systems rely on external HTTP services but lack a reliable way to coordinate how and when those requests are executed. Consensus is a coordination protocol that ensures **side-effectful HTTP requests execute exactly once** across replicated systems, without relying on trust, leader election, or centralized control.

Without coordination, duplicate requests waste resources, inconsistent responses introduce nondeterminism, and IP-based trust models break down in distributed environments.

Consensus addresses these problems by providing a shared execution and response layer for HTTP-based interactions.

### Primary features

* Coordinated HTTP request execution
* Metered WebSocket connections

### Reaching consensus on external data

In a replicated system, each node issues the same HTTP request independently.

Even when the target URL and parameters are identical, small milisecond timing differences, upstream load, or network jitter can cause the external API to return slightly different responses. While these differences may be insignificant to humans, they are **not equivalent at the byte level**.

As a result, replicas may observe different values, leading to divergent state and preventing the system from reaching **consensus** (hence the name Consensus Protocol). This is the one of the primary use cases of Coordinated HTTP request execution.

<img
src="/usecase1.png"
alt="Replicated nodes independently calling an external API"
class="consensus-diagram light"
/> <img
src="/usecase1dark.png"
alt="Replicated nodes independently calling an external API"
class="consensus-diagram dark"
/>

Consider an oracle that needs to fetch the price of ICP from an external HTTP API(eg. Coingecko).

The oracle program runs on a multi-node subnet, meaning the same request is executed independently by multiple replicas. Although each replica issues the same HTTP request to the same endpoint, the requests are not initiated at exactly the same moment. Even millisecond-level differences can cause the upstream API to return slightly different values.

For example, one replica may observe:

```json
{ "usd": 6.0897 }
```

while another replica observes:

```json
{ "usd": 6.0912 }
```

These differences may appear insignificant, but they are **not equivalent at the byte level**. As a result, replicas no longer agree on the response, creating divergence in the system state.

To compensate for this, applications are often forced to introduce ad-hoc transformations, rounding rules, or tolerance thresholds in order to regain consensus. This shifts complexity into application logic and makes correctness dependent on assumptions about upstream behavior.

:::note[Configurable micro caching window]
Consensus caching is **configurable**. If an endpoint is polled frequently or the party is interested in the most rea, you can set a short TTL (e.g. **1000 milliseconds**).

Requests that arrive within the same 1-second window are **deduplicated** and receive the **same response**. After the TTL expires, the next request executes once again and refreshes the cache — preventing stale data.
:::

Let's consider the same scenario routed through consensus.

<img
src="/uc1p2.png"
alt="Replicated nodes independently calling an external API"
class="consensus-diagram light"
/> <img
src="/uc1p2dark.png"
alt="Replicated nodes independently calling an external API"
class="consensus-diagram dark"
/>

With Consensus, all replicas route the request through the Consensus network. The request is canonicalized to produce a deterministic fingerprint, ensuring that identical requests are treated as the same operation.

The first request to arrive executes against the upstream API. While that request is in flight, any subsequent identical requests are **deduplicated** and wait for the result of the original execution.

Once the upstream response is received, Consensus returns the **same response bytes** to every replica:

```json
{ "usd": 6.09 }
```

Because all replicas observe an identical response, the system reaches consensus **without transforming the data**, introducing tolerance thresholds, or relying on timing assumptions.

Consensus shifts coordination out of application logic and into the protocol itself, providing a deterministic execution layer for side-effectful HTTP requests in replicated environments.

### Reducing API exhaution

### Example with IP whitelisting
