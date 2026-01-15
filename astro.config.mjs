import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';

export default defineConfig({
	integrations: [
		starlight({
			title: 'Consensus Docs',
			social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/demali-876/consensus' },
					 {icon: 'discord', label: 'Discord', href: 'https://discord.gg/6aquHGsn'}],
			components: {
				Head: './src/components/Head.astro',
			},
			
			sidebar: [
				{
					label: 'Protocol',
					items: [
						{ label: 'What is Consensus?', slug: 'protocol/info' },
					],
				},
				{
					label: 'Reference',
					autogenerate: { directory: 'reference' },
				},
			],
		}),
	],
});
