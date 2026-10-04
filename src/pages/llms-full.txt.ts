import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';

const SITE = 'https://docs.consensus.canister.software';

/** Same order the sidebar uses, so the corpus reads top-down like the site. */
const ORDER = ['quickstart', 'protocol', 'nodes', 'cli', 'facilitator', 'guides'];

const rank = (id: string) => {
	const i = ORDER.indexOf(id.split('/')[0] ?? '');
	return i === -1 ? ORDER.length : i;
};

export const GET: APIRoute = async () => {
	const docs = await getCollection('docs');
	docs.sort((a, b) => rank(a.id) - rank(b.id) || a.id.localeCompare(b.id));

	/** MDX component imports are build plumbing, not prose — drop them from the corpus. */
	const clean = (body: string) =>
		body
			.replace(/^\s*import\s+.*?from\s+['"].*?['"];?\s*$/gm, '')
			.replace(/\n{3,}/g, '\n\n')
			.trim();

	const parts: string[] = [
		'# Consensus — full documentation',
		'',
		'Consensus is a decentralized x402 proxy and WebSocket network: HTTP/TCP tunnels,',
		'forward and reverse proxying with request deduplication, leased stable IP addresses,',
		'and prepaid metered WebSocket sessions, paid per use with no accounts and no API keys.',
		'',
		`Source: ${SITE}`,
		`Generated: ${new Date().toISOString().slice(0, 10)}`,
		'',
		'---',
		'',
	];

	for (const entry of docs) {
		parts.push(
			`# ${entry.data.title}`,
			'',
			`Source: ${SITE}/${entry.id}/`,
			...(entry.data.description ? ['', `${entry.data.description}`] : []),
			'',
			clean(entry.body ?? ''),
			'',
			'---',
			''
		);
	}

	return new Response(parts.join('\n'), {
		headers: { 'Content-Type': 'text/plain; charset=utf-8' },
	});
};
