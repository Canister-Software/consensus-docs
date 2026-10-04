---
title: Setting up a node
description: Install the latest node software from GitHub, pass the admission benchmark, register, and keep your node running.
sidebar:
  order: 2
---

A Consensus node carries live traffic for the network: tunnels, proxied requests, leased IPs, and WebSocket sessions. This guide takes one machine from a fresh clone of the node software to a registered node that comes back on its own after a reboot.

:::note[Public beta]
No rewards are paid during the beta. The beta exists to expand the network and find viable nodes. Registration is complete, payout addresses included, so a node that joins now is fully set up once the reward model is decided.
:::

## How a node connects

A node dials **out** to the Consensus server and holds an encrypted control tunnel open. Registration assigns the node a permanent hostname, `<node-id>.consensus.canister.software`, which today resolves to the orchestrator; the orchestrator bridges client traffic onto your node's tunnel. That is why a node can **join without any open inbound port**, TLS certificate, or DNS record of its own.

That is not the end state. To scale, the network is moving to clients that reach nodes **directly**, so expect your node to need one open inbound port. Plan for it when you choose a machine and network.

On the machine itself, the node runs as one supervised unit with two parts:

- the **control tunnel** to `https://consensus.canister.software`, which also carries client traffic;
- a **local runtime server** on `127.0.0.1:9090`, reachable only from the machine, for health checks.

If either part exits, the supervisor restarts both.

## Before you start

You need:

- **A machine that stays online 24/7** and can pass the [admission test](/nodes/requirements/#the-admission-test). Setup runs it before the node can join.
- **A public IPv4 address.** IPv6 is optional.
- **Outbound HTTPS and WSS** to `consensus.canister.software`.
- **One inbound port you can open.** Not needed to join, but nodes are expected to become directly reachable.
- **A contact email address.** Setup sends a verification code to it.
- **Payout addresses** for EVM, Solana, and ICP. Setup can read them from MetaMask, Phantom, and Plug in your browser, or you can type them in.
- **A Mac with Apple Silicon.** Node releases are currently built for macOS on Apple Silicon (`darwin-arm64`). The runtime also ships a systemd unit for Linux, covered below, but Linux is not yet a release target.

## 1. Install Bun

The node runs on [Bun](https://bun.com) `1.3.0` or newer.

```bash
curl -fsSL https://bun.com/install | bash
```

Make sure `bun` is on your `PATH` in new shells (the installer prints the exact lines; on macOS they go in `~/.zprofile`), then check the version:

```bash
export PATH="$HOME/.bun/bin:$PATH"
bun --version
```

If you skip this step, setup offers to install Bun for you.

## 2. Get the latest node software from GitHub

Always start from the latest version of the [`consensus-node`](https://github.com/Demali-876/consensus-node) repository:

```bash
git clone https://github.com/Demali-876/consensus-node.git
cd consensus-node
bun install
```

Already have a clone? Update it before running setup:

```bash
cd consensus-node
git pull
bun install
```

The clone is the installer. Setup downloads the **server-approved release** of the node runtime, verifies it, and installs it under `~/.consensus/node-runtime`, which is what actually runs.

## 3. Run setup

```bash
bun run setup
```

Setup walks you through the whole join flow. Press Enter to accept the defaults unless you have a reason to change them:

1. **Confirm** you want to set up a node, and accept the default server URL (`https://consensus.canister.software`) and install directory (`~/.consensus/node-runtime`).
2. **Install dependencies** if prompted. On macOS, setup can install Homebrew, Node.js, and [PM2](https://pm2.keymetrics.io/), the process manager that keeps the node running.
3. **Install the approved release.** Setup shows the release the server currently approves, downloads it, checks its SHA-256, and installs it.
4. **Detect the network.** Setup finds your public IPv4, optional IPv6, and region.
5. **Pass the admission benchmark.** An encrypted evaluation measures route integrity, system capacity, CPU and encryption throughput, and memory pressure. A pass writes `join-auth.json` to the state directory.
6. **Verify your email.** Enter your contact address, then the code sent to it.
7. **Add payout addresses.** Choose the browser option to connect MetaMask, Phantom, and Plug, or press Enter and type the addresses.
8. **Register.** Accept the default local port (`9090`), and setup registers the node with the network.
9. **Start the node** under PM2 when asked.

Setup saves its progress. If it stops partway, for example on a failed benchmark or a network error, run `bun run setup` again and it offers to reuse what already succeeded.

:::tip[Prefer a browser?]
`bun run setup:wizard` runs the same flow on a local web page.
:::

When setup finishes, your node's configuration, including its `node_id` and domain, is in `~/.consensus/node/config.json`.

:::caution
`~/.consensus/node` holds your node's identity key and registration. Do not delete it.
:::

## 4. Check the node is running

Confirm PM2 is running the node and follow its logs:

```bash
pm2 status consensus-node-control
pm2 logs consensus-node-control --lines 50
```

Check the local health endpoint:

```bash
curl http://127.0.0.1:9090/health
```

A registered node reports `"status": "healthy"` and `"registered": true`, along with its `node_id` and `domain`.

Then check that the network can reach it. Replace `<node-id>` with the value from `config.json`:

```bash
curl https://<node-id>.consensus.canister.software/health
```

## 5. Keep it running after a reboot

A node earns its place by staying online, so it has to come back by itself after a reboot or power cut, without anyone logging in.

### macOS

Install the boot service. It runs the node as a system **LaunchDaemon**, which starts at boot before any login. Do not use `pm2 startup` on macOS: it creates a LaunchAgent, which only starts once a user logs in.

First remove the copy PM2 started during setup, so only one copy of the node runs:

```bash
pm2 delete consensus-node-control
pm2 save
```

Then install and test the service:

```bash
cd ~/.consensus/node-runtime/current
sudo scripts/install-launchd.sh
sudo scripts/node-service.sh restart
```

`restart` relaunches the node and waits until the network reports it **active** again. That is the real test that it came back and is serving.

Two macOS settings decide whether the machine can boot unattended:

- **Restart after a power cut.** Run `sudo pmset -a autorestart 1`, and `sudo pmset -a sleep 0` so the machine never sleeps.
- **FileVault.** With FileVault on, the Mac stops at a password prompt before macOS loads, so the node cannot start until someone types it. For a planned reboot, `sudo fdesetup authrestart` boots once without the prompt, but after a power cut the machine waits for a person. Turning FileVault off removes the prompt and also removes disk encryption, so weigh that before you decide.

### Linux

Install the systemd unit that ships with the runtime, `~/.consensus/node-runtime/current/systemd/consensus-node.service`, then enable it with `systemctl enable --now consensus-node`. Review the paths and the user in the unit file before enabling it.

## 6. Day-to-day operations

On macOS, with the boot service installed:

```bash
cd ~/.consensus/node-runtime/current
sudo scripts/node-service.sh status    # is the service running, and does the network see it?
sudo scripts/node-service.sh restart   # restart, then wait until the node is serving again
scripts/node-service.sh ping           # ask the network whether this node is live
scripts/node-service.sh logs           # follow the node's logs
```

**Updates are automatic.** The server decides when a node should update, sends the approved release over the control tunnel, and applies it once the node is idle. To check by hand whether your node matches the required release:

```bash
cd ~/.consensus/node-runtime/current
CONSENSUS_SERVER_URL=https://consensus.canister.software \
CONSENSUS_STATE_DIR="$HOME/.consensus/node" \
bun run update
```

## Troubleshooting

- **`bun` not found when the node starts under PM2 or the boot service.** PM2 and launchd do not load your shell profile. Make sure Bun is in `~/.bun/bin` or a Homebrew location, add `export PATH="$HOME/.bun/bin:$PATH"` to `~/.zprofile`, then restart with `pm2 restart consensus-node-control --update-env`, or reinstall the boot service.
- **`Missing node id. Register the node before starting control mode.`** Registration did not finish. Run `bun run setup` again.
- **`Missing join authorization` or `Join authorization expired`.** The benchmark did not pass, or its result expired before registration. Run `bun run setup` again to rerun it.
- **Local health is down.** Check the logs, and make sure nothing else is using port `9090`.
- **Local health shows `"registered": false`.** Registration did not write a `node_id` into `~/.consensus/node/config.json`. Run `bun run setup` again.
- **The `<node-id>.consensus.canister.software` URL does not respond.** Confirm the node is running and local health is healthy, then check the logs for a successful control tunnel connection.
- **Inbound ports.** Today's gateway deployment does not use them, so an open port is not the cause of a connection problem. Keep one available for direct reachability later.
