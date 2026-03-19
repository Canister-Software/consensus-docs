---
title: Supported Networks
description: All networks and tokens accepted by the Consensus facilitator for x402 payment verification
sidebar:
  order: 4
---

The Consensus facilitator at `https://facilitator.canister.software` supports the following networks. A resource server may accept payment on any subset of these — the client picks the network that matches its registered signer.

---

## EVM Networks

EVM payments use the **USDC** token and the `exact` scheme. Prices are expressed in USDC atomic units (6 decimal places — 1 USDC = 1,000,000 units) or as a dollar string (e.g. `"$0.001"`) which the server converts internally.

### Base Mainnet

| Property | Value |
|---|---|
| **Network identifier** | `eip155:8453` |
| **Token** | USDC |
| **Chain** | Base (mainnet) |
| **Status** | Production |

```js
{ scheme: 'exact', price: '$0.001', network: 'eip155:8453', payTo: process.env.EVM_PAY_TO }
```

### Base Sepolia

| Property | Value |
|---|---|
| **Network identifier** | `eip155:84532` |
| **Token** | USDC |
| **Chain** | Base Sepolia (testnet) |
| **Status** | Testnet |

```js
{ scheme: 'exact', price: '$0.001', network: 'eip155:84532', payTo: process.env.EVM_PAY_TO }
```

### Server registration (EVM)

```js
import { ExactEvmScheme } from '@x402/evm/exact/server'

x402Server
  .register('eip155:8453',  new ExactEvmScheme())
  .register('eip155:84532', new ExactEvmScheme())
```

### Client registration (EVM)

```js
import { registerExactEvmScheme } from '@x402/evm/exact/client'
import { privateKeyToAccount } from 'viem/accounts'

const key = process.env.EVM_PRIVATE_KEY
const signer = privateKeyToAccount(key.startsWith('0x') ? key : `0x${key}`)
registerExactEvmScheme(client, { signer })
```

---

## Solana Networks

Solana payments use **USDC** and the `exact` scheme. Prices are expressed in USDC atomic units (6 decimal places) or as a dollar string.

### Solana Mainnet

| Property | Value |
|---|---|
| **Network identifier** | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` |
| **Token** | USDC |
| **Chain** | Solana (mainnet) |
| **Status** | Production |

```js
{ scheme: 'exact', price: '$0.001', network: 'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp', payTo: process.env.SOLANA_PAY_TO }
```

### Solana Devnet

| Property | Value |
|---|---|
| **Network identifier** | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` |
| **Token** | USDC |
| **Chain** | Solana (devnet) |
| **Status** | Testnet |

```js
{ scheme: 'exact', price: '$0.001', network: 'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1', payTo: process.env.SOLANA_PAY_TO }
```

### Server registration (Solana)

```js
import { ExactSvmScheme } from '@x402/svm/exact/server'

x402Server
  .register('solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp',      new ExactSvmScheme())
  .register('solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1',       new ExactSvmScheme())
```

### Client registration (Solana)

```js
import { registerExactSvmScheme } from '@x402/svm/exact/client'
import { createKeyPairSignerFromBytes } from '@solana/signers'
import bs58 from 'bs58'

const keyBytes = bs58.decode(process.env.SOLANA_PRIVATE_KEY)
const signer = await createKeyPairSignerFromBytes(keyBytes)
registerExactSvmScheme(client, { signer })
```

---

## ICP Networks

ICP payments use the **TESTICP** token and the `exact` scheme. Prices are expressed in **e8s** — the smallest unit of the token (1 ICP = 100,000,000 e8s).

### ICP Testnet

| Property | Value |
|---|---|
| **Network identifier** | `icp:1:xafvr-biaaa-aaaai-aql5q-cai` |
| **Token** | TESTICP |
| **Ledger canister** | `xafvr-biaaa-aaaai-aql5q-cai` |
| **Pay-to format** | ICP principal |
| **Status** | Testnet |

**e8s conversion reference**

| e8s | TESTICP |
|---|---|
| `100` | 0.000001 |
| `10,000` | 0.0001 |
| `100,000` | 0.001 |
| `1,000,000` | 0.01 |
| `100,000,000` | 1.0 |

```js
{ scheme: 'exact', price: '100000', network: 'icp:1:xafvr-biaaa-aaaai-aql5q-cai', payTo: process.env.ICP_PAY_TO }
```

### Server registration (ICP)

```js
import { ExactIcpScheme } from '@canister-software/x402-icp/server'

x402Server.register('icp:1:xafvr-biaaa-aaaai-aql5q-cai', new ExactIcpScheme())
```

### Client registration (ICP)

```js
import { registerExactIcpScheme, pemToSigner } from '@canister-software/x402-icp/client'

const signer = await pemToSigner(process.env.PEM_PATH)
registerExactIcpScheme(client, { signer })
```

---

## Full Network Reference

| Network | Identifier | Token | Denomination | Status |
|---|---|---|---|---|
| Base | `eip155:8453` | USDC | 6 decimals | Production |
| Base Sepolia | `eip155:84532` | USDC | 6 decimals | Testnet |
| Solana | `solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp` | USDC | 6 decimals | Production |
| Solana Devnet | `solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1` | USDC | 6 decimals | Testnet |
| ICP | `icp:1:xafvr-biaaa-aaaai-aql5q-cai` | TESTICP | e8s | Testnet |

:::note
The `x402ResourceServer` must have a scheme registered for every network listed in a route's `accepts` array. Listing a network in `accepts` without registering its scheme will cause payment verification to fail for that network.
:::
