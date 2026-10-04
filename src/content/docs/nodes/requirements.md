---
title: Requirements & responsibilities
description: What a machine needs to join the Consensus network as a node, how the admission test decides, and what a node is expected to do once it joins.
sidebar:
  order: 1
---

This page covers what a node needs before it joins, what the admission test checks, and what the network expects of a node afterwards. To set one up, follow [Setting up a node](/guides/node/).

## What you need

| | |
|---|---|
| **Machine** | A Mac with Apple Silicon. Node releases are currently built for `darwin-arm64` |
| **Runtime** | [Bun](https://bun.com) `1.3.0` or newer. Setup can install it, along with PM2 |
| **Uptime** | Online 24/7, and able to restart on its own after a reboot or power cut |
| **Network** | A public IPv4 address (IPv6 optional), and outbound HTTPS and WSS to `consensus.canister.software` |
| **Open port** | One inbound port. Not needed to join, but nodes are expected to become directly reachable |
| **Contact** | An email address you can verify |
| **Payout addresses** | One each for EVM, Solana, and ICP |

For a machine that comfortably clears the admission test, the [node operator page](/join/#requirements) lists the recommended baseline: 8 GB of memory, 4 cores, 50 GB of SSD storage, and 100 Mbps of bandwidth.

## The admission test

Before a node can register, setup runs an encrypted evaluation over a tunnel to the orchestrator. The node measures itself and reports the numbers; the **orchestrator** applies the thresholds and makes the decision, so a node cannot admit itself.

The evaluation also checks route integrity and measures hashing and encryption throughput. Admission is decided by these checks:

| Check | Passes when |
|---|---|
| **Memory** | The machine has at least 512 MB of memory in total |
| **Responsiveness** | Its event loop stays responsive: p99 at or below 50 ms |
| **Steady throughput** | Serving 16 KB responses for a sustained run, its throughput at the end stays at 85% or more of the start. Burst-credit cloud instances and machines that throttle under heat fail here |
| **A real core** | The process gets at least 90% of a full CPU core. Hosts that share or steal CPU time fail here |
| **Capacity** | Even its slowest measured window serves at least 50 requests per second at 16 KB |

16 KB responses are heavier than typical traffic, so a node that passes never does worse in real use than its rating. A pass gives the node a short-lived join authorization tied to its identity key, which registration then uses. If it fails, setup shows which check failed; fix the cause and run `bun run setup` again.

## Once you join

A registered node is expected to:

- **Stay connected.** Keep the encrypted control tunnel to the orchestrator open around the clock. A node that disconnects stops receiving traffic.
- **Come back on its own.** Run under the boot service so it restarts after a reboot or power cut without anyone logging in. See [Keep it running after a reboot](/guides/node/#5-keep-it-running-after-a-reboot).
- **Run the approved release.** The orchestrator decides which release every node runs and delivers updates over the tunnel; the node installs each one when it is idle. Do not run modified code. A node's release manifest is signed with its identity key and checked against the required release.
- **Keep its identity.** The state directory, `~/.consensus/node`, holds the node's identity key and registration. Losing it means registering again as a new node.
- **Serve what it declares.** Nodes carry proxied requests, tunnels, WebSocket sessions, and leased IPs. Clients that lease a node's IP rely on it staying up.

When the network enables its stability trial, a newly registered node starts in `trial` and must stay connected and perform under real requests for 24 hours before it is routed traffic.

## Rewards

No rewards are paid during the public beta. The beta exists to expand the network and find viable nodes. Registration is complete, payout addresses included, so a node that joins now is fully set up once the reward model is decided.
