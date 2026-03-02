import { defineConfig } from 'vitepress';

export default defineConfig({
	title: 'Universal Client',
	description: 'A flexible, extensible universal client for web applications supporting HTTP, WebSocket, and SSE',
	base: '/universal-client/',

	themeConfig: {
		nav: [
			{ text: 'Guide', link: '/getting-started' },
			{
				text: 'Links',
				items: [
					{ text: 'npm', link: 'https://www.npmjs.com/package/universal-client' },
					{ text: 'JSR', link: 'https://jsr.io/@kevinbonnoron/universal-client' },
					{ text: 'GitHub', link: 'https://github.com/KevinBonnoron/universal-client' },
				],
			},
		],

		sidebar: [
			{
				text: 'Introduction',
				items: [{ text: 'Getting Started', link: '/getting-started' }],
			},
			{
				text: 'Guide',
				items: [
					{ text: 'Basic Usage', link: '/guide/basic-usage' },
					{ text: 'Interceptors', link: '/guide/interceptors' },
					{ text: 'WebSocket', link: '/guide/websocket' },
					{ text: 'Server-Sent Events', link: '/guide/sse' },
					{ text: 'Advanced Features', link: '/guide/advanced' },
				],
			},
		],

		socialLinks: [{ icon: 'github', link: 'https://github.com/KevinBonnoron/universal-client' }],

		search: {
			provider: 'local',
		},

		editLink: {
			pattern: 'https://github.com/KevinBonnoron/universal-client/edit/main/docs/:path',
			text: 'Edit this page on GitHub',
		},

		footer: {
			message: 'Released under the MIT License.',
			copyright: 'Copyright 2025 Kevin Bonnoron',
		},
	},
});
