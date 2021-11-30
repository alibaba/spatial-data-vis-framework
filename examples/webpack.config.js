/* eslint-disable */

const path = require('path')
const fs = require('fs')

process.noDeprecation = true

// const entry = {
// 	basic: [path.resolve(__dirname, 'basic/basic.ts')],
// 	amd: [path.resolve(__dirname, 'amd/amd.ts')],
// 	basic_props: [path.resolve(__dirname, 'basic/basic_props.ts')],
// 	projection: [path.resolve(__dirname, 'basic/projection.ts')],
// 	cameraProxy: [path.resolve(__dirname, 'basic/cameraProxy.ts')],
// 	props_manager: [path.resolve(__dirname, 'basic/props_manager.ts')],
// 	layer_std: [path.resolve(__dirname, 'basic/layer_std.ts')],
// 	renderer: [path.resolve(__dirname, 'basic/renderer.ts')],
// 	multi_instances: [path.resolve(__dirname, 'basic/multi_instances.ts')],
// 	// basic_gl2: [path.resolve(__dirname, 'basic_gl2/index.ts')],
// 	polygon: [path.resolve(__dirname, 'polygon/polygon.ts')],
// 	scatter: [path.resolve(__dirname, 'scatter/scatter.ts')],
// 	flyline: [path.resolve(__dirname, 'flyline/flyline.ts')],
// 	marker: [path.resolve(__dirname, 'marker/marker.ts')],
// 	props_manager: [path.resolve(__dirname, 'basic/props_manager.ts')],
// 	amap: [path.resolve(__dirname, 'amap/amap.ts')],
// 	gltf: [path.resolve(__dirname, 'gltf/gltf.ts')],
// 	postprocessing: [path.resolve(__dirname, 'postprocessing/postprocessing.ts')],
// 	reflection: [path.resolve(__dirname, 'reflection/reflection.ts')],
// 	animation: [path.resolve(__dirname, 'animation/animation.ts')],
// 	raycast: [path.resolve(__dirname, 'raycast/raycast.ts')],
// 	lite_basic: [path.resolve(__dirname, 'polaris_lite/lite_basic.ts')],
// 	lite_raycast: [path.resolve(__dirname, 'polaris_lite/lite_raycast.ts')],
// 	lite_marker: [path.resolve(__dirname, 'polaris_lite/lite_marker.ts')],
// 	lite_polygon: [path.resolve(__dirname, 'polaris_lite/lite_polygon.ts')],
// }

const entry = {}
const foldersTobeSkipped = ['design', 'node_modules', 'typings', 'scripts']
console.log('>>> examples <<<')

const dirFiles = fs.readdirSync(__dirname)
dirFiles.forEach((filename) => {
	if (foldersTobeSkipped.includes(filename)) return
	const filePath = path.resolve(__dirname, filename)
	const state = fs.statSync(filePath)
	if (state.isDirectory()) {
		const demos = fs.readdirSync(filePath)
		demos.forEach((demo) => {
			const ext = path.parse(demo).ext
			const name = path.parse(demo).name
			if (ext === '.ts' || ext === '.js') {
				const relativePath = `${filename}/${demo}`
				console.log('\x1b[32m' + relativePath)
				entry[name] = [path.resolve(__dirname, relativePath)]
			}
		})
	}
})
console.log('\n')

var config = {
	entry: entry,
	output: {
		// path: path.resolve(__dirname, 'build'),
		filename: '[name].demo.js',
		publicPath: '/static/',
	},

	// devtool: 'eval-source-map', // 性能较差但是可以保留原始ts代码，若要优化性能，注释掉这一行

	mode: 'development',

	/**
	 * node js 解析module时，会把 symlink 解析成真实路径，然后从真实位置向上查找
	 * 这会给 symlink 的项目带来一些问题，webpack 可以用 symlinks: false 避免这种情况
	 * 但是该特性会造成更多的问题，尤其是与 node 机制不一致带来的困惑，以及 require cache 失效造成包提及增大、依赖不再是单例
	 * 无论如何不要使用该特性
	 */

	resolve: {
		extensions: ['.js', '.scss', '.css', '.ts'],
		// !!! Important
		// default true, do not set this false
		// symlinks: false,
	},

	/**
	 * webpack 对于一个文件所用到的loader!，和这个文件的 require 查找逻辑一样
	 * 除非把 webpack 和 loader 都放在 root里，不然 就会导致 loader 查找不到
	 * 可以通过这种方式解决
	 */
	resolveLoader: {
		alias: {
			'worker-loader': [path.resolve(__dirname, 'node_modules/worker-loader')],
		},
	},
	module: {
		rules: [
			{
				// 保证 packages 里的所有依赖包都可以录入 sourcemap
				test: /\.js|ts$/,
				enforce: 'pre',
				use: ['source-map-loader'],
			},
			{
				test: /\.ts$/,
				// include: /src/,
				loader: 'ts-loader',
				options: {
					transpileOnly: true,
					configFile: path.resolve(__dirname, './tsconfig.build.json'),
				},
			},
		],
	},
}

module.exports = config
