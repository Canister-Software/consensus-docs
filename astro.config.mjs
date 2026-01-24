import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
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
					label: 'x402 Proxy',
					autogenerate: {directory:'x402proxy'},
				},
				{
					label: 'Guides',
					autogenerate: {directory:'guides'},
				},
			],
		}),
	],
});
