/**
 * 外部依赖
 * @note 除非用于蓝图，否则似乎没啥用
 * @link [2.2 组件映射关系（A）](https://lowcode-engine.cn/lowcode#22-%E7%BB%84%E4%BB%B6%E6%98%A0%E5%B0%84%E5%85%B3%E7%B3%BBa)
 */
export interface ExternalComponent {
	/**
	 * 协议中的组件名，唯一性，对应包导出的组件名，是一个有效的 JS 标识符，而且是大写字母打头
	 */
	// componentName: string
	/**
	 * npm 公域的 package name
	 */
	package: string
	/**
	 * package version
	 */
	version: string
	/**
	 * 使用解构方式对模块进行导出
	 */
	destructuring?: boolean
	/**
	 * 包导出的组件名
	 */
	exportName?: string
	/**
	 * 下标子组件名称
	 */
	subName?: string
	/**
	 * 包导出组件入口文件路径
	 */
	main?: string
}
