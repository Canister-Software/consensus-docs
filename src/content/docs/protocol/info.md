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

## An economy for computation

Consensus establishes an economic model for computation by pricing **access to execution itself**, rather than treating compute as an implicit side effect of infrastructure. The network coordinates both **HTTP request execution** and **long-lived WebSocket sessions** as paid, protocol-level resources.

For HTTP, Consensus executes side-effectful requests exactly once and returns the same response to all identical callers, eliminating duplicate execution and reducing upstream API load through deterministic caching and deduplication. For WebSockets, Consensus introduces metered, prepaid sessions that allow interactive computation to occur within explicitly defined time and data limits.

By requiring payment before execution and enforcing limits at the protocol layer, Consensus aligns incentives between consumers and providers of compute without relying on trust, centralized control, or traditional(ie. credit ord debit) billing systems. Compute becomes a scarce, accountable resource—accessible deterministically, shared where possible, paid for exactly once and without the need for an itermediatry.

## Use cases

Many modern systems rely on external HTTP services but lack a reliable mechanism to coordinate how and when those requests are executed. Consensus is a coordination protocol that ensures **side-effectful HTTP requests execute exactly once** across replicated systems, without relying on trust, leader election, or centralized control.

Without coordination, duplicate requests waste resources, inconsistent responses introduce nondeterminism, and IP-based trust models break down in distributed environments.

Consensus addresses these problems by providing a shared execution and response layer for HTTP-based interactions.

### Primary features

* Coordinated HTTP request execution
* Metered WebSocket connections

### Reaching consensus on external data

In a replicated system, each node issues the same HTTP request independently.

Even when the target URL and parameters are identical, small millisecond-level timing differences, upstream load, or network jitter can cause the external API to return slightly different responses. While these differences may be insignificant to humans, they are **not equivalent at the byte level**.

As a result, replicas may observe different values, leading to divergent state and preventing the system from reaching **consensus** (hence the name *Consensus Protocol*). This is one of the primary use cases of coordinated HTTP request execution.

<img
  src="/usecase1.png"
  alt="Replicated nodes independently calling an external API"
  class="consensus-diagram light"
/>
<img
  src="/usecase1dark.png"
  alt="Replicated nodes independently calling an external API"
  class="consensus-diagram dark"
/>

Consider an oracle that needs to fetch the price of ICP from an external HTTP API (e.g. CoinGecko).

The oracle program runs on a multi-node subnet, meaning the same request is executed independently by multiple replicas. Although each replica issues the same HTTP request to the same endpoint, the requests are not initiated at exactly the same moment. Even millisecond-level differences can cause the upstream API to return slightly different values.

For example, one replica may observe:

```json
{ "usd": 6.0897 }
```

while another replica observes:

```json
{ "usd": 6.0912 }
```

These differences may appear insignificant, but they are **not equivalent at the byte level**. As a result, replicas no longer agree on the response, creating divergence in system state.

To compensate for this, applications are often forced to introduce ad-hoc transformations, rounding rules, or tolerance thresholds in order to regain consensus. This shifts complexity into application logic and makes correctness dependent on assumptions about upstream behavior.

:::note[Configurable micro caching window]
Consensus caching is **configurable**. If an endpoint is polled frequently or the party is interested in the most rea, you can set a short TTL (e.g. **1000 milliseconds**).

Requests that arrive within the same 1-second window are **deduplicated** and receive the **same response**. After the TTL expires, the next request executes once again and refreshes the cache — preventing stale data.
:::
Now consider the same scenario routed through Consensus.

<img
src="/uc1p2.png"
alt="Requests routed through Consensus"
class="consensus-diagram light"
/> <img
src="/uc1p2dark.png"
alt="Requests routed through Consensus"
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

### Reducing API exhaustion

<img
src="/exhaustion.png"
alt="API exhaustion without coordination"
class="consensus-diagram light"
/> <img
src="/exhaustiondark.png"
alt="API exhaustion without coordination"
class="consensus-diagram dark"
/>

Consider a **non-idempotent courier service** such as [Infobip](https://www.infobip.com/), where each HTTP request represents a real-world side effect: sending an SMS.

When a replicated program issues an outbound request, **each replica executes the request independently**. The intent is the same, but the side effect is not coordinated.

As a result, the target service receives the same request multiple times.

In this example, a single logical SMS send is executed by **13 replicas**, producing **13 outbound requests** to Infobip. Because the service is non-idempotent, each request is billable. Even if downstream safeguards prevent duplicate delivery and only one message ultimately reaches the end user, **the cost is incurred for all 13 requests**.

What should have cost **$0.01** instead costs **$0.13**.

On a 36-node subnet, the same request would cost **36×** the intended amount.

Worse, external systems are not designed to handle this pattern. Courier services may rate-limit, reject, or block requests entirely when duplicate submissions are detected. In this case, Infobip refused to process the additional 12 requests, introducing failure modes the application did not anticipate.

Without a mechanism to ensure that side-effectful HTTP requests execute **exactly once**, replicated systems are forced to choose between correctness and cost—and often lose both. A real-world example can be viewed [here](https://youtu.be/CUkpDmyLAJk).

<img
src="/exhaustionfix.png"
alt="API exhaustion resolved with Consensus"
class="consensus-diagram light"
/> <img
src="/exhaustionfixdark.png"
alt="API exhaustion resolved with Consensus"
class="consensus-diagram dark"
/>

With Consensus in place, replicated systems no longer execute side-effectful HTTP requests independently.

Instead, each replica submits the same request to the Consensus network, where the request is canonicalized and hashed (for example, `sha256(method + endpoint + payload)`) to produce a deterministic identifier. This identifier represents the **intent** of the request, not the node that issued it.

When multiple replicas submit the same request:

* The **first submission** is executed against the target service
* Subsequent submissions **do not re-execute** the request
* All replicas **wait on and receive the same response**

In the Infobip example, the replicated program still issues 13 requests—but only **one outbound request** is ever sent to Infobip. The SMS is delivered once. The cost is incurred once. The response is shared across all replicas.

What previously cost **$0.13** now correctly costs **$0.01 + $0.001 (Consensus fee)**, regardless of subnet size.

Consensus acts as a coordination layer that enforces **exactly-once execution** for non-idempotent HTTP calls, without requiring changes to the upstream service and without introducing centralized trust.

This model also restores compatibility with external systems. Rate limits are respected, duplicate submissions are eliminated, and side effects occur precisely once—even in highly replicated environments.

By separating *request intent* from *request execution*, Consensus allows distributed programs to interact with the external world **safely, deterministically, and economically**.

### IP Whitelisting

<img
src="/whitelist.png"
alt="IP whitelisting challenges"
class="consensus-diagram light"
/> <img
src="/whitelistdark.png"
alt="IP whitelisting challenges"
class="consensus-diagram dark"
/>

Consider a replicated program interacting with an IP-whitelist-protected gateway. This immediately introduces several challenges.

In a replicated environment, the program cannot control which node a request originates from. Each replica may execute the same logic and issue the request independently, resulting in requests coming from multiple nodes with different IP addresses.

One possible approach is to whitelist all available nodes. However, this does not solve the core problem: **node IP addresses are not stable**. Nodes may be added, removed, rotated, or reassigned new IPs over time. As a result, the whitelist must be constantly updated, and requests may still be rejected when originating from an unexpected IP.

This makes direct interaction between replicated programs and whitelist-protected gateways unreliable and operationally fragile.

<img
src="/whitelistc.png"
alt="Consensus-based IP execution"
class="consensus-diagram light"
/> <img
src="/whitelistcdark.png"
alt="Consensus-based IP execution"
class="consensus-diagram dark"
/>

Consensus resolves this problem by separating **where a request is decided** from **where it is executed**.

Within the Consensus network, participating nodes may offer stable IP addresses for lease. Each IP is verified for stability and reliability before being admitted into a shared IP pool. These IPs are long-lived, known in advance, and suitable for whitelisting by external services.

Applications lease an IP from this pool rather than relying on the unpredictable egress of a replicated program. When a request is issued, Consensus deterministically selects a leased execution node—such as *Bob’s node*—and instructs the network to route the request through that specific IP.

As a result:

* Requests always originate from a **known, whitelisted IP**
* Only **one execution** occurs, even in a replicated environment
* External gateways observe a **single, stable caller**, not many replicas

This allows replicated programs to reliably interact with whitelist-protected services without sacrificing decentralization or operational correctness.

### Prepaid WebSockets sessions

Some workloads require **long-lived, interactive computation** rather than a single HTTP request. Examples include real-time data streams, interactive agents, live chats, and streaming analytics. These workloads naturally map to **WebSockets**, but traditional WebSocket infrastructure provides no protocol-level mechanism to price or bound execution.

Once a WebSocket connection is established, computation may continue indefinitely. Data may flow without limit, and enforcement typically relies on application-level logic, API keys, or centralized billing systems. In decentralized or replicated environments, this makes real-time services difficult to expose safely and economically.

Consensus addresses this by treating WebSocket access as **prepaid computation**, coordinated through HTTP using x402.

<img
src="/ws.png"
alt="Consensus-based IP execution"
class="consensus-diagram light"
/> <img
src="/ws-dark.png"
alt="Consensus-based IP execution"
class="consensus-diagram dark"
/>

The full flow is illustrated in the diagram above.

A client begins by requesting WebSocket access over HTTP, specifying the desired execution limits:

```http
GET /ws?mode=time&minutes=1&megabytes=0
```

Because the request represents a request for computation, Consensus responds with an x402 challenge:

```http
402 Payment Required
```

The client retries the request with a valid x402 payment payload. Consensus verifies and settles the payment, then returns a session token and a connection URL:

```json
{
  "token": "xyz",
  "connect_url": "ws://consensus/ws-connect?token=xyz"
}
```

The token represents the right to establish **exactly one WebSocket session** with predefined limits. In the example shown in the diagram, the token encodes the following constraints:

```json
{
  "time_ms": 60000,
  "data_mb": 100
}
```

The client then upgrades to a WebSocket connection using the issued token:

```text
WS /ws-connect?token=xyz
```

Before upgrading the connection, Consensus validates the token. If the token is expired, already consumed, or invalid, the upgrade is rejected. If the token is valid, the HTTP connection is upgraded and a WebSocket session is established.

Once the session begins, no further payment negotiation occurs. The WebSocket server enforces the prepaid limits deterministically. When the time limit or data limit is reached, the connection is closed. In the example shown in the diagram, the client sends an initial greeting:

```text
Hello from client!
```

The server responds normally:

```text
echo: Hello from client!
```

The session continues until the prepaid limits are exhausted. If additional computation is required, the client must acquire a new token by repeating the HTTP payment flow.

By separating **payment and coordination over HTTP** from **interactive execution over WebSockets**, Consensus enables real-time computation to be exposed as a paid, bounded, protocol-level resource. Providers are compensated upfront, clients know costs in advance, and enforcement does not rely on trust, subscriptions, or centralized billing systems.

This allows WebSocket-based services to operate safely and economically in decentralized and replicated environments while preserving deterministic execution and predictable cost.
