---
title: Package
description: Install the Consensus CLI and SDK package from npm, and what it contains.
sidebar:
  order: 2
---

`@canister-software/consensus-cli` is one npm package with two parts:

- the **SDK**, `ProxyClient`, `SocketClient`, and `createPaymentFetch()`, which you import into your own JavaScript or TypeScript code;
- the **`consensus` command**, a CLI and full-screen TUI for tunnels, proxying, WebSockets, and leased IPs.

## Install

**As a project dependency**, to use the SDK:

```bash
npm install @canister-software/consensus-cli
```

**Globally**, to use the `consensus` command anywhere:

```bash
npm install -g @canister-software/consensus-cli
```

The package is in beta; `npm` installs the current `0.2.0-beta` release.

## Requirements

| Use | Requires |
|---|---|
| SDK | Node.js `20.19` or newer, or Bun `1.3.0` or newer |
| `consensus` command | [Bun](https://bun.com) `1.3.0` or newer. The command runs on Bun even when installed with npm |

## What it exports

```ts
import {
  ProxyClient,        // route outbound HTTP through the network
  SocketClient,       // open metered WebSocket sessions
  createPaymentFetch, // a fetch that answers x402 payment challenges
  resolveSigners,     // load signers from CONSENSUS_* environment variables
} from '@canister-software/consensus-cli'
```

The package also exports `connectToNode` for the direct data path, batch and profile helpers, and their TypeScript types.

## Next steps

- [Setup](/cli/setup/): configure the CLI and payment credentials
- [Client Setup](/quickstart/request/): create `fetchWithPayment` for the SDK
- [Usage](/quickstart/usage/): every `ProxyClient` and `SocketClient` option
