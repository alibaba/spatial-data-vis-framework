module.exports = {
	jsxBracketSameLine: true,
	singleQuote: true,
	semi: false,
	useTabs: true,
	printWidth: 100,
	trailingComma: 'es5',
	eslintIntegration: true,

	importOrder: ['^@gs.i/*', '^@polaris.gl/*', '<THIRD_PARTY_MODULES>', '^[./].*(?<!css)$', '.css$'],
	importOrderSeparation: true,
	importOrderSortSpecifiers: true,

	overrides: [
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
			files: '*index.ts',
			options: {
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
