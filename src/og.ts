// Social (Open Graph) cards for docs pages.
// Pages listed here use a hand-designed card from public/seo/; every other docs page
// gets one generated at build time by src/pages/og/[...slug].png.ts.
export const HANDMADE_CARDS: Record<string, string> = {
	'quickstart/request': '/seo/consensus-quickstart-request-card.png',
	'protocol/info': '/seo/consensus-what-is-consensus-card.png',
};

// Fallback for Starlight routes that are not docs pages (e.g. the 404 page).
export const DEFAULT_CARD = '/consensus-docs.png';

export const ogImagePath = (id: string): string =>
	HANDMADE_CARDS[id] ?? (id === '404' || id === '' ? DEFAULT_CARD : `/og/${id}.png`);
