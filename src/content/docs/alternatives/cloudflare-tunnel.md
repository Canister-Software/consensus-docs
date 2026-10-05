---
title: 'Cloudflare Tunnel alternative: no account, no domain'
description: 'A Cloudflare Tunnel alternative for exposing localhost: get a public HTTPS URL or a TCP tunnel with one command, without a Cloudflare account or your own domain.'
sidebar:
  label: Cloudflare Tunnel alternative
  order: 2
---

[Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (`cloudflared`) is an excellent way to publish a service, especially one you run in production on your own domain. For a long-lived named tunnel you need a Cloudflare account and a domain whose DNS is on Cloudflare. Its quick tunnels on `trycloudflare.com` skip the account, but Cloudflare positions them for testing.

Consensus sits in between: **one command, no account, no domain**, with HTTP and TCP tunnels from the same CLI.

```bash
npm install -g @canister-software/consensus-cli
consensus tunnel http localhost:3000
```

## Consensus vs Cloudflare Tunnel

| | Consensus | Cloudflare Tunnel |
|---|---|---|
| Account required | No | Yes for named tunnels (quick tunnels: no) |
| Your own domain required | No | Yes for named tunnels |
| Public HTTPS URL | Yes, `*.tunnel.canister.software` | Yes, on your domain or `trycloudflare.com` |
| Raw TCP services | Yes, any client that can send the tunnel name first | Yes, clients typically run `cloudflared access` |
| Access policies (SSO, device rules) | No | Yes (Cloudflare Access) |
| Network | Decentralized nodes | Cloudflare's global network |
| Price | Free during the public beta | Free tier; paid Zero Trust plans |

## Choose Consensus when

- you want a public URL now and don't want to set up an account, DNS, or a config file;
- you don't own a domain, or don't want to move its DNS;
- you need a quick TCP tunnel for an MQTT broker, database, or game server;
- you're already using Consensus for [proxying](/guides/proxy/), [static IPs](/guides/static-ip/), or [WebSockets](/guides/websockets/).

## Choose Cloudflare Tunnel when

- the service is in production on your own domain;
- you need SSO, device posture, or other access policies in front of it;
- you want Cloudflare's CDN, WAF, and DDoS protection on the same hostname.

## Command comparison

| Cloudflare | Consensus |
|---|---|
| `cloudflared tunnel --url http://localhost:3000` | `consensus tunnel http localhost:3000` |
| Named tunnel + DNS route + `config.yml` | Not needed |
| `cloudflared access tcp …` on the client | Client sends the tunnel name, then talks normally ([details](/guides/tunnels/#3-open-a-tcp-tunnel)) |

## FAQ

**Can I expose localhost without a Cloudflare account?**
Yes. Consensus tunnels need no account and no domain. Run `consensus tunnel http localhost:3000` and share the URL it prints.

**Does it work behind NAT or a firewall?**
Yes. The tunnel is an outbound connection from your machine, so no inbound ports need opening.

**Is it free?**
Tunnels are free during the public beta.

## Next steps

- [Expose localhost with an HTTPS tunnel](/guides/tunnels/): the full tunnel guide
- [ngrok alternative](/alternatives/ngrok/): how Consensus compares with ngrok
