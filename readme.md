# 分层空间数据可视化框架

**This Project Is Still In Uploading Process.**

Layered Spatial Data Vis Framework

or Polaris.gl in short.

分层空间数据可视化框架，或简称 Polaris.gl

<!-- labels -->

## Inro

Polaris.gl 是基于通用 3D 渲染引擎的空间数据可视化框架，在 通用 3D 渲染能力的基础上增加 地理信息标准、组件封装与组合标准、与地图库的联动机制，并在这些标准上积累了一大批开箱即用的 可视化组件、视觉组件、定制框架等。

Polaris.gl 并不是一个地图库，没有内置或绑定的地图服务，但是提供和众多公开地图库、地理可视化工具（包括 Mapbox、高德地图、百度地图、cesium、L7 等）的协同工作方案。

Polaris.gl 致力于提供一个 空间数据视觉组件的 开放标准，所有符合该标准的组件都可以在一个框架下协同工作。基于这套标准，你可以利用通用 3D 渲染引擎的能力，实现天马行空的视觉效果，同时进行严谨的地理可视化展示与分析。你可以使用 Polaris.gl 在地理数据可视化工具的基础上增加视觉效果，也可以把任意 3D 渲染引擎封装成一个地图库。

## Development

### Prerequisites

Make sure you have `nodejs`, `yarn` and `lerna` installed.

```sh
node -v # v14 or higher

npx yarn -v # v1.x

npx lerna -v # v4.x recommended
```

### Setup

`npm run setup`

Should not see any error. If something goes wrong (probably caused by a registry). Run `npm run clean` and try it again.

### Build packages

`npm run build`

If something goes wrong. You should try `npm run rebuild` which will clean up all the build caches.

### Watch files and serve examples

Good old fashioned `npm start`

### Co-develop with GSI (the upstream monorepo project)

协同开发多个相互依赖的 monorepo 项目。

**This project itself is an example of multiple monorepo projects co-development.**

- link the upstream monorepo. `npm run setup -- --gsi={PATH_TO_GSI_REPO}`
  - for example `npm run setup -- --gsi={../gsi}`
  - This will automatically
    - Create a new folder `gsi-packages` which is a symlink to GSI_FOLDER/packages
    - Setup this repo and link gsi-packages like other local monorepo packages
    - `cd` to gsi repo folder and setup gsi again. (Make sure the former one didn't mess it up.)
- Dev gsi packages in gsi repo (<u>_Not In Current Repo Through Symlinks Obviously_</u>🙄️)
- Call `build` or `watch` from gsi repo
- Use live-updated gsi packages in current repo

The logic of `co-dev multi monorepos` is pretty simple.

- Link outer packages like local packages. But ignore their dependents, scripts and toolchain.
- The benifits of a monorepo stay in _that_ monorepo.
  - Dev upstream packages in their original repo. Use the result (live-updated) in downstream repo.
  - Do not edit another repo's codes. Do not build another repo's package from your repo.
  - Keep the boundary. Or you will end up merging everything into one gaint repo.

It is common in Javascript/Typescript ecosystem that <u>**\*Only** build result of a package is **robust and compatible with different toolchains**. NOT THE SOURCE CODES.\*</u> It is not the best approach but it's what we got.

_<u>Every package only has one set of toolchain that guarantee to work.</u>_ You should expect errors if you bypass it.

Unless you can make sure all the repos use exactly same language \* version and toolchain. It's easier to only assume you get all the (live-updated) **build result** of dependents instead of **source code** and everything.

## License and disclaimer

本项目使用 MIT 开源协议，详见 [LICENSE](./LICENSE)

three.js 源码版权归 three.js 作者所有。

WebGL and the WebGL logo are trademarks of the Khronos Group Inc.

glTF and the glTF logo are trademarks of the Khronos Group Inc.

OpenGL® and the oval logo are trademarks or registered trademarks of Hewlett Packard Enterprise in the United States and/or other countries worldwide.

OpenGL is a registered trademark and the OpenGL ES logo is a trademark of Hewlett Packard Enterprise used by permission by Khronos.

## 准则

Alibaba has adopted a Code of Conduct that we expect project participants to adhere to.

Please refer to [Alibaba Open Source Code of Conduct](https://github.com/AlibabaDR/community/blob/master/CODE_OF_CONDUCT.md) ([中文版](https://github.com/AlibabaDR/community/blob/master/CODE_OF_CONDUCT_zh.md)).
