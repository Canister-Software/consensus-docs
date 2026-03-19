---
title: Client
description: Connect an x402 client to a resource server and pay for requests through the Consensus facilitator
sidebar:
  order: 3
---

The x402 client does not communicate with the facilitator directly. It only needs the resource server URL. The facilitator URL is configured server-side — from the client's perspective, payment is simply part of the HTTP request.

---

## Installation

```bash
npm install @x402/core @x402/fetch @canister-software/x402-icp dotenv
```

For EVM or Solana, add the relevant package:

```bash
# EVM
npm install @x402/evm viem

# Solana
npm install @x402/svm @solana/signers bs58
```

---

## ICP Client

```js
import dotenv from 'dotenv'
dotenv.config()

import { x402Client } from '@x402/core/client'
import { wrapFetchWithPayment } from '@x402/fetch'
import { registerExactIcpScheme, pemToSigner } from '@canister-software/x402-icp/client'

const PEM_PATH   = process.env.PEM_PATH            || './identity.pem'
const SERVER_URL = process.env.RESOURCE_SERVER_URL  || 'http://localhost:4000'
const ENDPOINT   = process.env.ENDPOINT             || '/api/data'

async function main() {
  // 1. Load signer from PEM
  const signer = await pemToSigner(PEM_PATH)
  console.log(`Signer principal: ${signer.principal}`)

  // 2. Create x402 client and register ICP scheme
  const client = new x402Client()
  registerExactIcpScheme(client, { signer })

  // 3. Wrap fetch — 402 handling is automatic from here
  const fetchWithPayment = wrapFetchWithPayment(fetch, client)

  // 4. Make the request
  const response = await fetchWithPayment(`${SERVER_URL}${ENDPOINT}`)
  console.log(`Status: ${response.status}`)
  console.log(await response.json())
}

main()
```

### Environment variables

```bash
PEM_PATH=./identity.pem
RESOURCE_SERVER_URL=http://localhost:4000
ENDPOINT=/api/data
```

---

## EVM Client

```js
import dotenv from 'dotenv'
dotenv.config()

import { x402Client } from '@x402/core/client'
import { wrapFetchWithPayment } from '@x402/fetch'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { privateKeyToAccount } from 'viem/accounts'

const SERVER_URL = process.env.RESOURCE_SERVER_URL || 'http://localhost:4000'
const ENDPOINT   = process.env.ENDPOINT            || '/api/data'

async function main() {
  const key    = process.env.EVM_PRIVATE_KEY
  const signer = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`)
  console.log(`Signer address: ${signer.address}`)

  const client = new x402Client()
  registerExactEvmScheme(client, { signer })

  const fetchWithPayment = wrapFetchWithPayment(fetch, client)

  const response = await fetchWithPayment(`${SERVER_URL}${ENDPOINT}`)
  console.log(`Status: ${response.status}`)
  console.log(await response.json())
}

main()
```

### Environment variables

```bash
EVM_PRIVATE_KEY=0x...
RESOURCE_SERVER_URL=http://localhost:4000
ENDPOINT=/api/data
```

---

## Solana Client

```js
import dotenv from 'dotenv'
dotenv.config()

import { x402Client } from '@x402/core/client'
import { wrapFetchWithPayment } from '@x402/fetch'
import { registerExactSvmScheme } from '@x402/svm/exact/client'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import bs58 from 'bs58'

const SERVER_URL = process.env.RESOURCE_SERVER_URL || 'http://localhost:4000'
const ENDPOINT   = process.env.ENDPOINT            || '/api/data'

async function main() {
  const keyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY)
  const signer   = await createKeyPairSignerFromBytes(keyBytes)
  console.log(`Signer address: ${signer.address}`)

  const client = new x402Client()
  registerExactSvmScheme(client, { signer })

  const fetchWithPayment = wrapFetchWithPayment(fetch, client)

  const response = await fetchWithPayment(`${SERVER_URL}${ENDPOINT}`)
  console.log(`Status: ${response.status}`)
  console.log(await response.json())
}

main()
```

### Environment variables

```bash
SOLANA_PRIVATE_KEY=<base58-private-key>
RESOURCE_SERVER_URL=http://localhost:4000
ENDPOINT=/api/data
```

---

## Multi-Network Client

Register multiple schemes on the same client instance. When the server issues a `402`, the client automatically picks the first scheme that matches one of the server's accepted networks:

```js
import { registerExactIcpScheme, pemToSigner } from '@canister-software/x402-icp/client'
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { registerExactSvmScheme } from '@x402/svm/exact/client'
import { privateKeyToAccount } from 'viem/accounts'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import bs58 from 'bs58'

const icpSigner = await pemToSigner(process.env.PEM_PATH)
const evmSigner = privateKeyToAccount(process.env.EVM_PRIVATE_KEY)
const svmSigner = await createKeyPairSignerFromBytes(bs58.decode(process.env.SOLANA_PRIVATE_KEY))

const client = new x402Client()
registerExactIcpScheme(client, { signer: icpSigner })
registerExactEvmScheme(client, { signer: evmSigner })
registerExactSvmScheme(client, { signer: svmSigner })

const fetchWithPayment = wrapFetchWithPayment(fetch, client)
```

---

## Running Against a Local Resource Server

**Terminal 1 — start the resource server:**

```bash
FACILITATOR_URL=https://facilitator.canister.software \
PAYTO_PRINCIPAL=<your-principal> \
PORT=4000 \
node server.js
```

**Terminal 2 — run the client:**

```bash
PEM_PATH=./identity.pem \
RESOURCE_SERVER_URL=http://localhost:4000 \
ENDPOINT=/api/data \
node client.js
```

**Expected output:**

```
── ICP x402 Client Test ──
PEM:    ./identity.pem
Server: http://localhost:4000
Route:  /api/data

Creating signer from PEM...
Signer principal: xxxxx-xxxxx-xxxxx-xxxxx-cai

Fetching http://localhost:4000/api/data...

Status: 200
Headers:
  content-type: application/json

Response body:
{
  "message": "Here is your premium data!",
  "timestamp": "2025-01-01T00:00:00.000Z",
  "value": 0.7391284
}
```

The first request triggers the full `402 → sign → retry` cycle. Subsequent identical requests may be served from cache depending on the server's caching configuration.
