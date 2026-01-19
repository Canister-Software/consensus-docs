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

## Use Cases

### Reducing API Exhaustion

[Your content here]

### Privacy Through IP Masking

[Your content here - the IP whitelisting example]