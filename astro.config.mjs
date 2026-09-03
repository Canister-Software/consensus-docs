import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
	output:'static',
	site: "https://docs.consensus.canister.software",
  	base: "/",
	integrations: [
		sitemap({
			changefreq: 'weekly',
			priority: 0.7,
			serialize(item) {
				// Landing page: top-priority entry point
				if (item.url === 'https://docs.consensus.canister.software/') {
					item.priority = 1.0;
				}
				// Node-operator + quickstart funnels: slight boost
				else if (/\/(guides\/node|quickstart)\//.test(item.url)) {
					item.priority = 0.9;
				}
				return item;
			},
		}),
		starlight({
			title: 'Consensus Docs',
			
			logo: {
				dark: './src/assets/logo-light.svg',
				light: './src/assets/logo-dark.svg',
				alt: 'Consensus',
			},
			customCss: ['./src/styles/custom.css'],
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/demali-876/consensus' },
					 {icon: 'discord', label: 'Discord', href: 'https://discord.gg/6aquHGsn'}],
			components: {
				Head: './src/components/Head.astro',
			},
			sidebar: [
				{
					label: 'Quickstart',
					autogenerate: {directory:'quickstart'},
				},
				{
					label: 'Protocol',
					items: [
						{ label: 'What is Consensus?', slug: 'protocol/info' },
						{ label: 'Core concepts', slug: 'protocol/concepts' },
						{ label: 'Consensus API', slug: 'protocol/api' },
					],
				},
				{
					label: 'Nodes',
					autogenerate: {directory: 'nodes'},
				},
				{
					label: 'CLI',
					autogenerate: { directory: 'cli' },
				},
				{
					label: 'Facilitator',
					autogenerate: {directory:'facilitator'},
				},
				{
					label: 'Guides',
					autogenerate: {directory:'guides'},
				},
			],
		}),
	],
});
