---
title: 'ngrok alternative: HTTPS and TCP tunnels with no account'
description: 'Looking for an ngrok alternative? Consensus exposes localhost on a public HTTPS URL, or any TCP service, with one command. No sign-up, no authtoken, and free during the beta.'
sidebar:
  label: ngrok alternative
  order: 1
---

[ngrok](https://ngrok.com) is the best-known way to put a local service on the internet. Consensus does the same core job (a public URL for something running on your machine) with one difference that matters for quick work: **there is no account to create and no authtoken to install.** Install the CLI, run one command, and share the URL.

```bash
npm install -g @canister-software/consensus-cli
consensus tunnel http localhost:3000
```

```text
https://amber-otter.tunnel.canister.software → localhost:3000
```

## Consensus vs ngrok at a glance

| | Consensus | ngrok |
|---|---|---|
| Sign-up required | No | Yes (account + authtoken) |
| Public HTTPS URL for localhost | Yes | Yes |
| TCP tunnels | Yes, on a shared port ([details](/guides/tunnels/#3-open-a-tcp-tunnel)) | Yes |
| Tunnel to other devices on your LAN | Yes | Yes |
| Custom domains | No | Yes, on paid plans |
| Auth in front of the tunnel (OAuth, IP rules) | No | Yes |
| Request inspection | Live dashboard in the terminal (macOS) | Web inspector with replay |
| Infrastructure | Decentralized network of independent nodes | ngrok's managed global edge |
| Price | Free during the public beta | Free plan with limits; paid plans |

## When Consensus is the better fit

- **You want a URL in ten seconds without signing up.** Demos, quick sharing, testing on a phone, or showing a client work in progress.
- **You're receiving webhooks on your laptop.** Point Stripe, GitHub, or any other service at your tunnel URL while you develop.
- **You need to reach a device on your network.** A Raspberry Pi, camera, or MQTT broker, with `consensus tunnel http 192.168.1.101:8080` or a TCP tunnel.
- **You can't open ports.** The tunnel is an outbound connection, so routers, NAT, and firewalls don't need changes.
- **You're building with x402.** The same CLI and SDK also give you [proxying](/guides/proxy/), [static IPs](/guides/static-ip/), and [metered WebSockets](/guides/websockets/) paid per use, without accounts.

## When ngrok is the better fit

Be honest with yourself about these. If you need any of them today, use ngrok:

- a custom domain or a reserved, permanent URL;
- authentication, IP restrictions, or other policies in front of the tunnel;
- a web inspector with request replay;
- an enterprise SLA and support contract.

Consensus tunnels are new, in public beta, and focused on the simple case.

## Switching from ngrok

| ngrok | Consensus |
|---|---|
| `ngrok http 3000` | `consensus tunnel http localhost:3000` |
| `ngrok http 192.168.1.10:8080` | `consensus tunnel http 192.168.1.10:8080` |
| `ngrok tcp 1883` | `consensus tunnel tcp localhost:1883` |

TCP works a little differently: all Consensus TCP tunnels share `tcp.tunnel.canister.software:20000`, and a client sends the tunnel's name as its first line. See [Open a TCP tunnel](/guides/tunnels/#3-open-a-tcp-tunnel).

## FAQ

**Is there a free ngrok alternative with no sign-up?**
Yes. Consensus tunnels need no account, no email, and no authtoken, and they're free during the public beta.

**Does it support HTTPS?**
Yes. Every HTTP tunnel gets a public `https://` URL. TLS is handled for you, so your local server can stay plain HTTP.

**Do I need to open a port on my router?**
No. The CLI opens an outbound connection to the network, and traffic comes back down it.

**Can I keep the same URL?**
A tunnel keeps its URL while it's open. Reserved or custom domains aren't supported yet.

**What does the CLI need?**
The `consensus` command runs on [Bun](https://bun.com). See [CLI setup](/cli/setup/).

## Next steps

- [Expose localhost with an HTTPS tunnel](/guides/tunnels/): the full tunnel guide
- [Cloudflare Tunnel alternative](/alternatives/cloudflare-tunnel/): how Consensus compares with `cloudflared`
