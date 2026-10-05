---
title: 'Public x402 facilitator for Base, Solana, and ICP'
description: 'A public x402 facilitator that verifies and settles payments on Base and Solana mainnet, their testnets, and the Internet Computer test ledger, so your API can charge per request without running chain infrastructure.'
sidebar:
  label: 'What is the Facilitator?'
  order: 1
---

The facilitator is an off-chain service that verifies x402 payment proofs on behalf of resource servers. When a client attaches a signed payment to an HTTP request, the resource server does not query the blockchain directly: it forwards the payment to the facilitator, which verifies it and then settles it on chain.

**Public endpoint:** `https://facilitator.canister.software`

---

## Why a Facilitator?

On-chain verification from inside a request handler is impractical — it would block the server on RPC latency for every paid request, require the server to maintain full blockchain state or RPC credentials per network, and make multi-network support expensive to operate.

The facilitator solves this by acting as a verification and settlement service. The resource server speaks a single REST protocol to one endpoint regardless of which network the client paid on. The facilitator resolves the chain-specific logic, checks the payment, and then settles it on chain.

```
Resource Server               Facilitator                  Chain
      │                            │                          │
      ├── POST /verify ───────────►│                          │
      │   { paymentPayload,        │                          │
      │     paymentRequirements }  │                          │
      │◄── { isValid: true } ──────┤                          │
      │                            │                          │
      ├── POST /settle ───────────►├── submit transfer ──────►│
      │◄── { success, transaction }┤◄── confirmed ────────────┤
```

---

## Verification Flow

1. Client sends a request with a signed payment in the `PAYMENT-SIGNATURE` header (`X-PAYMENT` for x402 v1 clients)
2. Resource server pairs the payment with what the route expects: network, amount, and `payTo`
3. Resource server calls the facilitator's `POST /verify`, which returns `{ isValid, invalidReason? }`
4. If the payment is valid, the resource server calls `POST /settle`, and the facilitator submits the transfer on the payment's network
5. Settlement returns `{ success, transaction, network }`, or `success: false` with an `errorReason`
6. Resource server serves the response, or returns `402` again

`paymentMiddleware` from `@x402/express` makes these calls for you. Each call is independent; the resource server does not hold a session with the facilitator.

## Endpoints

| Route | Purpose |
|---|---|
| `POST /verify` | Check a payment against its requirements, without moving funds |
| `POST /settle` | Settle a verified payment on chain |
| `GET /supported` | The scheme and network pairs this facilitator handles |
| `GET /info` | Facilitator identity, including its ICP principal and enabled networks |
| `GET /discovery/resources` | A catalog of resources that accept x402 payment through this facilitator |
| `GET /health` | Liveness check |

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
| **Protocol** | REST: the resource server posts each payment to `/verify`, then `/settle` |
| **State** | Each call is independent. The facilitator keeps a small database of used payment nonces, so a payment cannot be replayed, and of its discovery catalog |
| **Multi-network** | Yes — the facilitator handles all supported networks behind one endpoint |

See [Supported Networks](/facilitator/networks/) for the full list of chains and tokens the facilitator accepts.
