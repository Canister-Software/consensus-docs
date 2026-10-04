---
title: Expose localhost with an HTTPS tunnel
description: Put a local web server, device, or TCP service on a public HTTPS URL with one command. An ngrok alternative with no account, no API key, and free during the beta.
sidebar:
  order: 2
---

A tunnel gives a service on your machine or local network a public address. Run one command and anyone on the internet can reach `localhost:3000` at a URL like `https://amber-otter.tunnel.canister.software`. It does the same job as an ngrok or Cloudflare tunnel, without an account, an API key, or a dashboard to sign in to.

Use it to:

- share a local web app or API with a teammate or client;
- receive webhooks from Stripe, GitHub, or any other service on your laptop;
- reach a device on your home network, such as a Raspberry Pi, a camera, or an MQTT broker;
- demo work in progress without deploying it.

:::note[Free during the public beta]
Tunnels take no payment during the beta, so there is nothing to set up beyond installing the CLI.
:::

## 1. Install the CLI

The `consensus` command runs on [Bun](https://bun.com):

```bash
curl -fsSL https://bun.com/install | bash
npm install -g @canister-software/consensus-cli
```

See [CLI setup](/cli/setup/) for details.

## 2. Open an HTTP tunnel

Start your local server, then point a tunnel at it:

```bash
consensus tunnel http localhost:3000
```

The tunnel gets a public HTTPS URL on `tunnel.canister.software`, with a short name such as `amber-otter`:

```text
https://amber-otter.tunnel.canister.software → localhost:3000
```

Every request to that URL is forwarded to your local port, and the response goes back the same way. TLS is handled for you, so your local server can stay plain HTTP.

On macOS the tunnel opens in its own Terminal window with a live dashboard: the public URL, request counts, and a log of each request as it arrives. Keep the window open; closing it closes the tunnel.

### Tunnel to another device on your network

The target does not have to be your own machine. Anything your machine can reach works:

```bash
consensus tunnel http 192.168.1.101:8080
```

## 3. Open a TCP tunnel

For services that do not speak HTTP, such as a database, an MQTT broker, or SSH, open a TCP tunnel:

```bash
consensus tunnel tcp localhost:1883
```

All TCP tunnels share one public address, `tcp.tunnel.canister.software:20000`. To tell the server which tunnel a connection is for, a client sends the tunnel's name and a newline as the first line, then talks to your service as normal:

```bash
{ printf 'amber-otter\n'; cat; } | nc tcp.tunnel.canister.software 20000
```

## How it works

1. The CLI asks the network for a tunnel with `POST /tunnel` and receives a public address and a one-time token.
2. It opens a WebSocket to the network with that token. That connection carries the tunnel's traffic.
3. When a request reaches the public address, the network sends it down your connection; the CLI forwards it to your local target and returns the response.

Because the connection is outbound from your machine, you do not need to open a port on your router or firewall. See the [API reference](/protocol/api/#tunnels) for the full `POST /tunnel` options, including private tunnels that are reachable only through the proxy.

## Next steps

- [Proxying HTTP requests](/guides/proxy/): route your app's outbound requests through the network
- [Static IP for API whitelisting](/guides/static-ip/): send traffic from one stable IP address
- [Metered WebSocket sessions](/guides/websockets/): open prepaid, bounded WebSocket sessions
