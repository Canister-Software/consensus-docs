---
title: 'Pay-per-use WebSocket sessions with time and data limits'
description: Open prepaid WebSocket sessions bounded by time and data, with SocketClient or the CLI. No accounts or API keys, and free during the beta.
sidebar:
  label: 'Metered WebSockets'
  order: 3
---

Consensus gives you WebSocket sessions with limits built in. You ask for a session of a certain length, a certain amount of data, or both; the network opens it, meters it as it runs, and closes it cleanly when the limit is reached. There is no account to create and nothing billed after the fact.

Use it for real-time data feeds, chat and agent sessions, live dashboards, and anything else that needs a long-lived connection with a predictable cost.

:::note[Free during the public beta]
WebSocket sessions take no payment during the beta. The limits still apply.
:::

## How a session works

1. **Get a token.** Ask for a session with `GET /ws`, choosing a billing model and limits. When payment is on, this is the step you pay for, once and up front.
2. **Connect.** Open the WebSocket at the `connect_url` you get back, within 60 seconds. The token works once.
3. **Use it.** The first message, `session_start`, confirms your limits. Traffic flows normally after that.
4. **It ends cleanly.** When the time or data limit is reached, you receive `session_expired` and the connection closes. Start a new session to keep going.

| Model | Limited by | Use when |
|---|---|---|
| `hybrid` | Time and data, whichever runs out first (default) | You want both bounds |
| `time` | Minutes | Traffic volume is unpredictable |
| `data` | Megabytes | Sessions are long but light |

## From your code

```ts
import { SocketClient, createPaymentFetch } from '@canister-software/consensus-cli'

const client = SocketClient(await createPaymentFetch())

// 1. Get a token for a 10-minute, 100 MB session
const auth = await client.requestToken({ model: 'hybrid', minutes: 10, megabytes: 100 })

// 2. Connect, and handle messages
const session = await client.connect(auth)
session.on('message', (msg) => console.log('received', msg))
session.send('hello')

// Close when you are done
session.close()
```

`SocketClient` reconnects automatically after an unexpected disconnect by requesting a fresh token with the same parameters. See [the SDK reference](/quickstart/usage/#socketclient) for every option, including spend limits and safe mode.

### Choose where it runs

Pass `nodeRegion` (such as `east-us`), `nodeDomain`, or `nodeExclude` (node IDs) to `requestToken()` to choose which node serves the session. To keep a session on one IP address, pin it to a node; see [Static IP for API whitelisting](/guides/static-ip/).

## From the terminal

Open an interactive session and type messages to send them:

```bash
consensus ws connect --model hybrid --minutes 5 --megabytes 50
```

Or just get a token and connect with your own client:

```bash
consensus ws token --model time --minutes 10
```

If you have leased a node with `consensus ip lease`, both commands use it.

## Next steps

- [WebSocket API reference](/protocol/api/#websocket): `GET /ws`, `WSS /ws-connect`, and the session messages
- [Proxying HTTP requests](/guides/proxy/): route your app's HTTP requests through the network
- [Expose localhost with an HTTPS tunnel](/guides/tunnels/): put a local service on a public URL
