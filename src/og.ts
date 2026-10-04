// Social (Open Graph) cards for docs pages.
// Pages listed here use a hand-designed card from public/seo/; every other docs page
// gets one generated at build time by src/pages/og/[...slug].png.ts.
export const HANDMADE_CARDS: Record<string, string> = {
	'quickstart/request': '/seo/consensus-quickstart-request-card.png',
	'protocol/info': '/seo/consensus-what-is-consensus-card.png',
};

export const ogImagePath = (id: string): string => HANDMADE_CARDS[id] ?? `/og/${id}.png`;
