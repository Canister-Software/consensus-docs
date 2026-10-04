import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection } from 'astro:content';
import fs from 'node:fs/promises';
import path from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { HANDMADE_CARDS } from '../../og';

// One 2400×1260 card per docs page, rendered at build time in the style of the
// hand-made cards in public/seo/. Pages in HANDMADE_CARDS are skipped.

const SECTION_LABELS: Record<string, string> = {
	quickstart: 'Quickstart',
	protocol: 'Protocol',
	nodes: 'Nodes',
	cli: 'CLI',
	facilitator: 'Facilitator',
	guides: 'Guides',
};

// Collapse stray whitespace from frontmatter. Text is passed to Satori as plain
// text nodes (never parsed as HTML), so &, <, > and quotes need no escaping.
const clean = (s: string | undefined) => (s ?? '').replace(/\s+/g, ' ').trim();

export const getStaticPaths = (async () => {
	const docs = await getCollection('docs');
	return docs
		.filter((d) => !(d.id in HANDMADE_CARDS))
		.map((d) => ({
			params: { slug: d.id },
			props: {
				title: clean(d.data.title),
				description: clean(d.data.description),
				path: d.id,
			},
		}));
}) satisfies GetStaticPaths;

// Resolved from the project root: import.meta.url moves once Astro bundles this endpoint.
const fontDir = path.resolve('src/assets/og');
const [groteskRegular, groteskSemibold, mono, logoSvg] = await Promise.all([
	fs.readFile(path.join(fontDir, 'space-grotesk-latin-400-normal.woff')),
	fs.readFile(path.join(fontDir, 'space-grotesk-latin-600-normal.woff')),
	fs.readFile(path.join(fontDir, 'jetbrains-mono-latin-400-normal.woff')),
	fs.readFile(path.resolve('public/logo-light.svg')),
]);
const logo = `data:image/svg+xml;base64,${logoSvg.toString('base64')}`;

// Minimal element builder for Satori's object tree.
type Node = { type: string; props: Record<string, unknown> };
const el = (type: string, props: Record<string, unknown>, ...children: (Node | string)[]): Node => ({
	type,
	props: { ...props, children: children.length === 1 ? children[0] : children },
});

const card = (title: string, description: string, path: string): Node => {
	const section = SECTION_LABELS[path.split('/')[0]] ?? 'Docs';
	return el(
		'div',
		{
			style: {
				width: '100%',
				height: '100%',
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'space-between',
				padding: '52px 62px 48px',
				backgroundColor: '#000',
				backgroundImage:
					'linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)',
				backgroundSize: '60px 60px, 60px 60px',
				color: '#fff',
				fontFamily: 'Space Grotesk',
			},
		},
		// Brand row
		el(
			'div',
			{ style: { display: 'flex', alignItems: 'center', gap: '14px' } },
			el('img', { src: logo, width: 38, height: 38 }),
			el('span', { style: { fontSize: '29px', fontWeight: 400, letterSpacing: '-0.3px' } }, 'Consensus'),
		),
		// Section label, title, description
		el(
			'div',
			{ style: { display: 'flex', flexDirection: 'column', maxWidth: '930px' } },
			el(
				'span',
				{
					style: {
						fontFamily: 'JetBrains Mono',
						fontSize: '17px',
						letterSpacing: '6px',
						textTransform: 'uppercase',
						color: 'rgba(255,255,255,0.45)',
						marginBottom: '20px',
					},
				},
				section,
			),
			el(
				'span',
				{ style: { fontSize: '74px', fontWeight: 600, lineHeight: 1.04, letterSpacing: '-2.2px' } },
				title,
			),
			...(description
				? [
						el(
							'span',
							{
								style: {
									display: 'block',
									fontSize: '29px',
									lineHeight: 1.35,
									color: 'rgba(255,255,255,0.45)',
									marginTop: '24px',
									lineClamp: 3,
								},
							},
							description,
						),
					]
				: []),
		),
		// URL footer
		el(
			'div',
			{ style: { display: 'flex', fontFamily: 'JetBrains Mono', fontSize: '19px' } },
			el('span', { style: { color: 'rgba(255,255,255,0.85)' } }, 'docs.consensus.canister.software'),
			el('span', { style: { color: 'rgba(255,255,255,0.4)' } }, `/${path}`),
		),
	);
};

export const GET: APIRoute = async ({ props }) => {
	const { title, description, path } = props as { title: string; description: string; path: string };
	const svg = await satori(card(title, description, path) as Parameters<typeof satori>[0], {
		width: 1200,
		height: 630,
		fonts: [
			{ name: 'Space Grotesk', data: groteskRegular, weight: 400, style: 'normal' },
			{ name: 'Space Grotesk', data: groteskSemibold, weight: 600, style: 'normal' },
			{ name: 'JetBrains Mono', data: mono, weight: 400, style: 'normal' },
		],
	});
	// Lay out at 1200×630, export at 2x to match the hand-made 2400×1260 cards.
	const png = new Resvg(svg, { fitTo: { mode: 'width', value: 2400 } }).render().asPng();
	return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
