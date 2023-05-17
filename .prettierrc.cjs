module.exports = {
	jsxBracketSameLine: true,
	singleQuote: true,
	semi: false,
	useTabs: true,
	printWidth: 100,
	trailingComma: 'es5',
	eslintIntegration: true,
	quoteProps: 'consistent',

	importOrder: ['^@gs.i/*', '^@polaris.gl/*', '<THIRD_PARTY_MODULES>', '^[./].*(?<!css)$', '.css$'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,

	overrides: [
		{
			files: 'docs/*.md',
			options: {
				useTabs: false,
				tabWidth: 4,
			},
		},
		{
			files: '*.gen.ts',
			options: {
				printWidth: 200,
			},
		},
		{
			files: '*-schema.ts',
			options: {
				quoteProps: 'preserve',
				singleQuote: false,
				printWidth: 200,
			},
		},
		{
			files: '*/layers/index.ts',
			options: {
				printWidth: 200,
				// disable importOrder plugin (by disable all plugins)
				pluginSearchDirs: false,
				plugins: [],
				importOrder: null,
				importOrderSeparation: false,
				importOrderSortSpecifiers: false,
			},
		},
	],
}
