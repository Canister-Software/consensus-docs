---
title: 'Static outbound IP address for API whitelisting'
description: Send your app's outbound requests from one stable IPv4 address, so you can whitelist it once with an upstream API, payment provider, or firewall.
sidebar:
  label: 'Static IP for whitelisting'
  order: 4
---

Many APIs, payment providers, and corporate firewalls only accept traffic from IP addresses you register in advance. That breaks when your app runs on serverless functions, autoscaling containers, or replicated programs, because each request can leave from a different IP.

Consensus fixes this by pinning your traffic to one node. Every request you route through the network then leaves from that node's IPv4 address, so you whitelist **one IP, once**.

## How it works

Every Consensus node has its own public IPv4 address. When you **lease** a node, your requests are routed only through that node, so the upstream service always sees the same caller. Nodes are vetted before they join and must stay connected to keep serving, so a leased node is a stable place to send traffic from.

:::note[Free during the public beta]
Proxied requests take no payment during the beta.
:::

## 1. Choose a node

List the nodes and pick one near the service you call:

```bash
consensus ip list --region east-us
```

```text
NODE ID        DOMAIN                                    REGION    SCORE
a3f1c94b2e07   a3f1c94b2e07.consensus.canister.software  east-us   96
```

Regions use names such as `east-us`, `west-europe`, and `japan-east`. Without `--region`, every node is listed. You can also fetch the list from [`GET /nodes`](/protocol/api/#get-nodes).

## 2. Lease it

**From the CLI**, lease the node by its ID or domain:

```bash
consensus ip lease a3f1c94b2e07
```

The CLI's proxy and WebSocket commands now go through that node. Check the lease with `consensus ip active`, and remove it with `consensus ip release`.

**From your code**, pin `ProxyClient` to the node's domain:

```ts
import { ProxyClient, createPaymentFetch } from '@canister-software/consensus-cli'

const proxy = ProxyClient(await createPaymentFetch(), {
  node_domain: 'a3f1c94b2e07.consensus.canister.software',
})

const res = await proxy.fetch('https://api.partner.example/v1/orders')
```

Calling `/proxy` directly? Put `x-node-domain` in the body's `headers` object instead. See [Proxying HTTP requests](/guides/proxy/#3-choose-where-it-runs).

## 3. Find the IP to whitelist

The node list does not publish IP addresses, so ask an IP echo service which address your requests arrive from. Route the check through your leased node:

```bash
consensus proxy fetch "https://api.ipify.org?format=json&node=a3f1c94b2e07" --json
```

```json
{ "ip": "203.0.113.42" }
```

The `node=` parameter is there on purpose. Consensus shares cached responses between everyone who sends the same request, so a plain `https://api.ipify.org` could return another node's cached answer. Adding your node ID makes the request unique to you.

Register that address with the upstream service, and you are done.

## Keep it reliable

- **Keep the lease.** The IP stays the same for as long as you route through the same node.
- **If the node goes offline,** requests can be served from somewhere else and leave from a different IP, and a strict whitelist will reject them. Check the node with [`GET /node/status/:node_id`](/protocol/api/#get-nodestatusnode_id). For critical integrations, whitelist a second leased node as a fallback.
- **Tunnels are separate.** A lease applies to proxied requests and WebSocket sessions, not to tunnels.

## Next steps

- [Proxying HTTP requests](/guides/proxy/): everything `ProxyClient` can do
- [Metered WebSocket sessions](/guides/websockets/): open WebSocket sessions through your leased node
- [What is Consensus?](/protocol/info/#ip-whitelisting): why IP whitelisting is hard in replicated systems
- [Static outbound IP for serverless apps](/alternatives/static-outbound-ip/): how this compares with Fixie, QuotaGuard, and NAT gateways
