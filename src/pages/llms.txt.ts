import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://docs.consensus.canister.software';

/** Section order + human labels, mirroring the docs sidebar in astro.config.mjs. */
const SECTIONS: Array<[string, string]> = [
	['quickstart', 'Quickstart'],
	['protocol', 'Protocol'],
	['nodes', 'Nodes'],
	['cli', 'CLI'],
	['facilitator', 'Facilitator'],
	['guides', 'Guides'],
];

export const GET: APIRoute = async () => {
	const docs = await getCollection('docs');

	const bySection = new Map<string, Array<{ title: string; description: string; url: string }>>();
	for (const entry of docs) {
		const section = entry.id.split('/')[0];
		if (!section) continue;
		const list = bySection.get(section) ?? [];
		list.push({
			title: entry.data.title,
			description: entry.data.description ?? '',
			url: `${SITE}/${entry.id}/`,
		});
		bySection.set(section, list);
	}

	const lines: string[] = [
		'# Consensus',
		'',
		'> Consensus is a decentralized x402 proxy and WebSocket network. It provides four',
		'> primitives over one CLI and SDK: HTTP/TCP tunnels that expose a local service on a',
		'> public HTTPS URL, forward and reverse proxying with request deduplication and caching,',
		'> leased stable IP addresses for whitelisted gateways, and prepaid metered WebSocket',
		'> sessions. Payments settle over the x402 payment protocol on Ethereum,',
		'> Solana, or the Internet Computer. There are no accounts and no API keys.',
		'',
		'Key facts:',
		'',
		'- Pricing: Consensus is in public beta and is currently 100% free to use.',
		'- Install: `npm i @canister-software/consensus-cli`',
		'- Tunnels: `consensus tunnel http localhost:3000` returns a public HTTPS URL.',
		'- Proxying: `ProxyClient(fetchWithPayment, options)` routes outbound HTTP through the network, as Express middleware or via `proxy.fetch()`.',
		'- Stable IPs: `consensus ip lease <node-id-or-domain>` pins traffic to one node, and so to its IPv4 address.',
		'- WebSockets: `SocketClient` prepays a session bounded by minutes and megabytes.',
		'- Payment: x402, settled through the Consensus facilitator; the network currently accepts Base Sepolia, Solana Devnet, and ICP TESTICP, and runs in free mode during the beta.',
		'- Nodes are permissionless to join but must pass an encrypted admission test and keep an encrypted tunnel to the network connected.',
		'- Proxying happens at the application level; HTTPS is never decrypted.',
		'',
		'## Entry points',
		'',
		`- [Consensus overview](${SITE}/): tunnels, proxies, stable IPs, and metered WebSockets.`,
		`- [Run a node](${SITE}/join/): hardware requirements and the admission benchmark for node operators (no rewards are paid during the beta).`,
		`- [Full documentation text](${SITE}/llms-full.txt): every documentation page as one plain-text corpus.`,
		'',
	];

	for (const [dir, label] of SECTIONS) {
		const entries = bySection.get(dir);
		if (!entries?.length) continue;
		entries.sort((a, b) => a.url.localeCompare(b.url));
		lines.push(`## ${label}`, '');
		for (const e of entries) {
			lines.push(`- [${e.title}](${e.url})${e.description ? `: ${e.description}` : ''}`);
		}
		lines.push('');
	}

	lines.push(
		'## Source repositories',
		'',
		'- [consensus](https://github.com/Demali-876/consensus): orchestrator and proxy server.',
		'- [consensus-client](https://github.com/Demali-876/consensus-client): SDK, CLI, and TUI.',
		'- [consensus-node](https://github.com/Demali-876/consensus-node): worker-node runtime.',
		'- [consensus-facilitator](https://github.com/Demali-876/consensus-facilitator): x402 payment facilitator.',
		''
	);

	return new Response(lines.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
