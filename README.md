# Polaris App

This is the scaffold of a Polaris App project.

## Intro

Polaris App is a framework for configurable spatial data visualization applications. Based on [polaris.gl](https://github.com/alibaba/spatial-data-vis-framework), it is designed to be simple, gui-friendly, easy to embed, and easy to extend.

We separate our work flow into two parts:

- **Code** is to implement the `layers` and bundle all the layer classes and polaris renderer into a `Polaris App Class`.
- **Config** is to edit the `app config json` that defines how to instance the polaris and layers, how to arrange stages and scenes, how the app behave and communicate with the user and your application, etc.

The coding and bundler phase is done by the developer in a local development environment.

The configuration happens in a runtime web environment. If paired with a GUI editor, can be done by designers or even end users.

In a low-code platform, a `Polaris App Class` is a general purpose component that can be configured for different apps.

Internally, we have a WYSIWYG GUI editor that straightforwardly represent the app config json and embedded into multiple platforms.

## Dev

### Init a new polaris app project

```bash
git clone --single-branch --branch BP/base https://github.com/alibaba/spatial-data-vis-framework.git {YOUR_PROJECT_NAME}

cd {YOUR_PROJECT_NAME}

npm install
```

### Start dev server

```bash
npm start
```

### Add New Layer Classes

```bash
node scripts/layer.mjs --action=add --layerName={LayerClassName} --flavor=html # Upper Camel Case ending with `Layer`
```

The new Layer Class (factory-pattern template code) will be added to `src/layers/{LayerClassName}/index.ts`.

### Remove Layer Classes

```bash
node scripts/layer.mjs --action=delete -layerName={LayerClassName}
```

### Update project scaffold

```bash
npm run updateScaffold
```

### Build

```bash
npm run build
```

Check out all the products in `intermediate` folder.

### 🌟 daemon mode

If you want to implement a WYSIWYG frontend of this project. Try the daemon mode.

```bash
npm run backend # start a headless vite dev server
# in a different terminal or process
node daemon.mjs # start the daemon server
```

## Usage

### import polaris app class

```js
// in vite local dev environment
import { App } from '../../src/apps/App.ts'

// after build
const { App } = await import('PATH_TO_PRODUCT/App.mjs')

// if webpack
const { App } = await import( /* webpackIgnore: true */ 'PATH_TO_PRODUCT/App.mjs')

// if you publish the app as a npm package
import { App } from 'YOUR_APP_PACKAGE_NAME'
```

### Instance a polaris app

```js
const app = new App({
	container: document.getElementById('container'),
	config: {
		// initial app config json
	},
})
```

### Edit config in runtime

```js
// slow
// not recommended in production
// definitely not for animation
app.configManager.setConfig(newConfig)
```

### Dispose

```js
app.dispose()
```

## Polaris App Config Specification

TODO

## Polaris App Class API

- CN [顶层 API](./docs/顶层API.md)
