---
title: Setup
description: Set up the Consensus CLI, configure payment credentials, and run your first commands.
sidebar:
  order: 1
---

The `consensus` command gives you the whole network from a terminal: tunnels, proxying, WebSockets, and leased IPs. Run it with no arguments for the full-screen TUI, or call a command directly.

## 1. Install

The CLI runs on [Bun](https://bun.com) `1.3.0` or newer. Install Bun, then the package:

```bash
curl -fsSL https://bun.com/install | bash
npm install -g @canister-software/consensus-cli
```

Check that it works:

```bash
consensus help
```

## 2. Set up credentials

During the public beta the network runs in free mode, so **you can skip this step**: every command works without credentials.

When payment is enabled, run setup once:

```bash
consensus setup
```

It offers two modes:

- **Self-managed keys (recommended).** Enter an EVM private key, a Solana keypair, and optionally the path to an ICP PEM file. Setup writes them as `CONSENSUS_EVM_KEY`, `CONSENSUS_SVM_KEY`, and `CONSENSUS_PEM_PATH` to your shell profile, and payments are signed locally. Keys never leave your machine. Run the `source` command setup prints, or open a new shell, to load them.
- **Managed wallet.** Creates a wallet from your [Coinbase Developer Platform](https://portal.cdp.coinbase.com/) credentials, set as `CDP_API_KEY_ID`, `CDP_API_KEY_SECRET`, and `CDP_WALLET_SECRET` in a `.env` file. The keys are held by the proxy service.

Payments settle on test networks: Base Sepolia, Solana Devnet, and ICP's TESTICP ledger. Setup prints your addresses with faucet links so you can fund them.

To start over, run `consensus setup --force`.

:::danger[Treat these keys as live credentials]
Self-managed keys sit in plain text in your shell profile. Use wallets that hold only what you are comfortable spending, and never commit your shell profile or `.env` to version control.
:::

## 3. Try it

Expose a local web server on a public HTTPS URL:

```bash
consensus tunnel http localhost:3000
```

Send one request through the network:

```bash
consensus proxy fetch https://api.example.com/prices --verbose
```

List nodes, then pin your traffic to one of them, and so to its IP address:

```bash
consensus ip list --region east-us
consensus ip lease <node-id-or-domain>
```

[Usage](/quickstart/usage/#cli-commands) lists every command and option.

## Where the CLI keeps its state

The CLI stores its configuration, leased node, preferences, and session history in `~/.consensus/`. Self-managed keys live in your shell profile, not in that directory.
