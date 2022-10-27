export function getLayerConfig<
	AppConfig extends { layers: readonly { id: string }[] },
	LayerID extends AppConfig['layers'][number]['id']
>(appConfig: AppConfig, id: LayerID) {
	const layerConfig = appConfig.layers.find((l) => l.id === id)
	if (!layerConfig) {
		console.error(`Can not find layer config by id (${id})`)
		// return null
	}

	return layerConfig as MapByID<AppConfig['layers'][number]>[LayerID]
}

type MapByID<U extends { id: string }> = {
	[I in U['id']]: Extract<U, { id: I }>
}

// @test
// const a = [
// 	{ id: '1', value: 1 },
// 	{ id: '2', value: 2 },
// ] as const
// type O = MapByID<typeof a[number]>
