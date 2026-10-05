---
title: 'Static outbound IP for serverless apps: a Fixie and QuotaGuard alternative'
description: 'Give Vercel, Netlify, Heroku, AWS Lambda, or other serverless apps one static outbound IP address to whitelist with partner APIs and firewalls, without a NAT gateway or monthly add-on.'
sidebar:
  label: Static outbound IP (Fixie / QuotaGuard)
  order: 3
---

Partner APIs, payment providers, banks, and database firewalls often only accept traffic from IP addresses you register in advance. Serverless platforms and autoscaling containers don't give you one: each request can leave from a different, shared address.

The usual fixes are a **static IP proxy add-on** (such as Fixie or QuotaGuard), a **NAT gateway** with an elastic IP in your own cloud network, or a platform's own static-egress feature where one exists. Consensus offers another option: **lease a node, and your requests leave from that node's IPv4 address.**

```ts
import { ProxyClient, createPaymentFetch } from '@canister-software/consensus-cli'

const proxy = ProxyClient(await createPaymentFetch(), {
  node_domain: 'a3f1c94b2e07.consensus.canister.software', // your leased node
})

const res = await proxy.fetch('https://api.partner.example/v1/orders')
```

The full walkthrough, including how to find the IP to whitelist, is in [Static IP for API whitelisting](/guides/static-ip/).

## Comparing the options

| | Consensus | Static IP proxy add-on | NAT gateway + elastic IP |
|---|---|---|---|
| Works from serverless (Vercel, Netlify, Lambda) | Yes | Yes | Only inside your VPC |
| Account or subscription | None | Monthly plan | Cloud account, hourly + data charges |
| How your code uses it | SDK (`ProxyClient`) or `POST /proxy` | Standard `HTTP_PROXY` / SOCKS | Transparent |
| IP is dedicated to you | No, it's the node's address | Depends on plan | Yes |
| Redundancy | Lease a second node as a fallback | Usually two IPs included | Per availability zone |
| Price | Free during the public beta | Paid | Paid |

## When Consensus is the better fit

- you're on a serverless or edge platform and only need a handful of upstream calls whitelisted;
- you don't want a monthly add-on or to run a VPC and NAT gateway just for egress;
- you also want [deduplicated, cached requests](/guides/proxy/), for example from replicated or retried workers that would otherwise call the partner API many times.

## When another option is the better fit

- **You need a standard HTTP proxy.** Consensus routes requests through its SDK or `POST /proxy`; it isn't a drop-in `HTTP_PROXY` setting yet.
- **The IP must be yours alone.** A leased node's address can also carry other users' traffic.
- **The integration can't tolerate a node going offline.** If your leased node is down, requests can leave from another IP. Whitelist a second leased node, or use a NAT gateway for critical paths.

## FAQ

**How do I get a static outbound IP on Vercel or Netlify?**
Route the calls that need whitelisting through a leased Consensus node with `ProxyClient`, then whitelist that node's IP. The rest of your traffic is unaffected.

**Which IP do I whitelist?**
The node list doesn't publish addresses, so you ask an IP echo service through your leased node. See [Find the IP to whitelist](/guides/static-ip/#3-find-the-ip-to-whitelist).

**Does the IP change?**
Not while you keep routing through the same leased node. See [Keep it reliable](/guides/static-ip/#keep-it-reliable).

**Is it free?**
Proxied requests are free during the public beta.

## Next steps

- [Static IP for API whitelisting](/guides/static-ip/): the step-by-step guide
- [HTTP proxy API](/guides/proxy/): everything `ProxyClient` can do
