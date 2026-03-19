---
title: Resource Server
description: Set up an x402-protected Express server that verifies payments through the Consensus facilitator
sidebar:
  order: 2
---

A resource server is any HTTP server that charges for access to its routes using x402. The server issues `402` challenges, receives signed payment proofs from clients, and delegates verification to the facilitator.

---

## Installation

```bash
npm install @x402/express @x402/core @canister-software/x402-icp dotenv
```

For multi-network support, add the relevant scheme packages:

```bash
# EVM
npm install @x402/evm

# Solana
npm install @x402/svm @solana/signers
```

---

## Minimal Example (ICP)

```js
import 'dotenv/config'
import express from 'express'
import { paymentMiddleware, x402ResourceServer } from '@x402/express'
import { HTTPFacilitatorClient } from '@x402/core/server'
import { ExactIcpScheme } from '@canister-software/x402-icp/server'

const FACILITATOR_URL  = process.env.FACILITATOR_URL  ?? 'https://facilitator.canister.software'
const PAYTO_PRINCIPAL  = process.env.PAYTO_PRINCIPAL  ?? ''

if (!PAYTO_PRINCIPAL) {
  console.error('Set PAYTO_PRINCIPAL env var')
  process.exit(1)
}

// 1. Connect to the facilitator
const facilitatorClient = new HTTPFacilitatorClient({ url: FACILITATOR_URL })

// 2. Create the resource server and register scheme(s)
const x402Server = new x402ResourceServer(facilitatorClient)
  .register('icp:1:xafvr-biaaa-aaaai-aql5q-cai', new ExactIcpScheme())

const app = express()
app.use(express.json())

// 3. Protect a route with paymentMiddleware
app.use(
  paymentMiddleware(
    {
      'GET /api/data': {
        accepts: [
          {
            scheme: 'exact',
            price: '100000',
            network: 'icp:1:xafvr-biaaa-aaaai-aql5q-cai',
            payTo: PAYTO_PRINCIPAL,
          },
        ],
        description: 'Premium data endpoint',
        mimeType: 'application/json',
      },
    },
    x402Server,
  )
)

// 4. The route handler — only reached after payment is verified
app.get('/api/data', (_req, res) => {
  res.json({
    message: 'Here is your premium data!',
    timestamp: new Date().toISOString(),
    value: Math.random(),
  })
})

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

const PORT = Number(process.env.PORT ?? 4000)
app.listen(PORT, () => {
  console.log(`Resource server on :${PORT}`)
  console.log(`Paid route:  GET /api/data  (100000 e8s TESTICP)`)
  console.log(`Facilitator: ${FACILITATOR_URL}`)
  console.log(`PayTo:       ${PAYTO_PRINCIPAL}`)
})
```

### Environment variables

```bash
FACILITATOR_URL=https://facilitator.canister.software
PAYTO_PRINCIPAL=<your-icp-principal>
PORT=4000
```

---

## Multi-Network Example

Register a scheme for every network you want to accept. List each network in the route's `accepts` array.

```js
import { ExactIcpScheme } from '@canister-software/x402-icp/server'
import { ExactEvmScheme } from '@x402/evm/exact/server'
import { ExactSvmScheme } from '@x402/svm/exact/server'

const x402Server = new x402ResourceServer(facilitatorClient)
  .register('icp:1:xafvr-biaaa-aaaai-aql5q-cai',            new ExactIcpScheme())
  .register('eip155:84532',                                   new ExactEvmScheme())
  .register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',       new ExactSvmScheme())
```

```js
'POST /proxy': {
  accepts: [
    {
      scheme: 'exact',
      price: '100000',
      network: 'icp:1:xafvr-biaaa-aaaai-aql5q-cai',
      payTo: process.env.ICP_PAY_TO,
    },
    {
      scheme: 'exact',
      price: '$0.001',
      network: 'eip155:84532',
      payTo: process.env.EVM_PAY_TO,
    },
    {
      scheme: 'exact',
      price: '$0.001',
      network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',
      payTo: process.env.SOLANA_PAY_TO,
    },
  ],
  description: 'Proxy request',
  mimeType: 'application/json',
}
```

### Environment variables (multi-network)

```bash
FACILITATOR_URL=https://facilitator.canister.software
ICP_PAY_TO=<your-icp-principal>
EVM_PAY_TO=0x...
SOLANA_PAY_TO=<base58-address>
PORT=4000
```

---

## Dynamic Pricing

The `price` field in each accepted network can be a function. The function receives a context object and returns the price string. This is used for routes where the price depends on request parameters — such as the WebSocket session endpoint where price is computed from `model`, `minutes`, and `megabytes`:

```js
{
  scheme: 'exact',
  price: (context) => {
    const minutes   = parseInt(context.adapter.getQueryParam?.('minutes')   ?? '5')
    const megabytes = parseInt(context.adapter.getQueryParam?.('megabytes') ?? '50')
    const cost = calculateSessionCost(minutes, megabytes)
    return `$${cost.toFixed(4)}`
  },
  network: 'eip155:84532',
  payTo: process.env.EVM_PAY_TO,
}
```

The function is called fresh for each payment challenge, so the price always reflects the current request parameters.

---

## Route Pattern Reference

`paymentMiddleware` accepts a map of route patterns to payment configurations. The pattern must match the method and path of the request exactly as Express would see it.

| Pattern | Matches |
|---|---|
| `'GET /api/data'` | `GET /api/data` only |
| `'POST /proxy'` | `POST /proxy` only |
| `'GET /ws'` | `GET /ws` (used for WebSocket token acquisition) |

:::note
`paymentMiddleware` must be registered **before** the route handler in the Express middleware chain. The handler is only reached after the middleware confirms payment.
:::
