/**
 * Copyright (C) 2021 Alibaba Group Holding Limited
 */

// turf-distance.d.ts
declare module '@turf/nearest-point-to-line' {
	function nearestPointToLine(a: any, b: any): any
	export default nearestPointToLine
}

// turf-distance.d.ts
declare module '@turf/point-to-line-distance' {
	function pointToLineDistance(a: any, b: any, c: any): any
	export default pointToLineDistance
}

// file-loader.d.ts
declare module 'file-loader?name=[name].js!*' {
	const value: string
	export = value
}
