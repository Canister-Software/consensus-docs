---
title: What is the Facilitator?
description: How the Consensus facilitator verifies x402 payment proofs off-chain and which services use it
sidebar:
  order: 1
---

The facilitator is an off-chain service that verifies x402 payment proofs on behalf of resource servers. When a client attaches an `X-Payment` header to an HTTP request, the resource server does not query the blockchain directly — it forwards the proof to the facilitator, which performs on-chain verification and returns a signed confirmation.

**Public endpoint:** `https://facilitator.canister.software`

---

## Why a Facilitator?

On-chain verification from inside a request handler is impractical — it would block the server on RPC latency for every paid request, require the server to maintain full blockchain state or RPC credentials per network, and make multi-network support expensive to operate.

The facilitator solves this by acting as a stateless verification proxy. The resource server speaks a single REST protocol to one endpoint regardless of which network the client paid on. The facilitator resolves the chain-specific logic and returns a simple valid/invalid signal.

```
Resource Server          Facilitator                  Chain
      │                       │                          │
      ├── POST /verify ───────►│                          │
      │   { proof, expected }  │                          │
      │                        ├── RPC call (network) ───►│
      │                        │◄── transfer confirmed ───┤
      │◄── { valid: true } ────┤                          │
```

---

## Verification Flow

1. Client sends a request with `X-Payment` header containing a signed payment proof
2. Resource server extracts the proof and the expected payment parameters (network, amount, payTo)
3. Resource server calls the facilitator's `/verify` endpoint
4. Facilitator queries the appropriate chain to confirm the transfer occurred
5. Facilitator returns `{ valid: true }` or an error
6. Resource server either serves the response or returns `402` again

The facilitator is stateless — each call is an independent verification. The resource server does not maintain a session with it.

---

## Connecting a Resource Server

```js
import { HTTPFacilitatorClient } from '@x402/core/server'

const facilitatorClient = new HTTPFacilitatorClient({
  url: process.env.FACILITATOR_URL ?? 'https://facilitator.canister.software'
})
```

Pass this client to `x402ResourceServer`. All verification calls from `paymentMiddleware` are routed through it automatically.

---

## Reference

| Property | Value |
|---|---|
| **Public URL** | `https://facilitator.canister.software` |
| **Client class** | `HTTPFacilitatorClient` from `@x402/core/server` |
| **Protocol** | REST — resource server POSTs payment proofs, receives confirmation |
| **Statefulness** | Stateless — each verification is independent |
| **Multi-network** | Yes — the facilitator handles all supported networks behind one endpoint |

See [Supported Networks](/facilitator/networks/) for the full list of chains and tokens the facilitator accepts.
