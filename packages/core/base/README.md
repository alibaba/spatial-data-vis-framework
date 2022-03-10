# @p.gl/base

Polaris 场景标准, 包含 {场景全局信息 + Layer 树 + 生命周期 + 地理信息}

FrontEnd/SDK -> polaris scene schema -> BackEnd/Renderer

Polaris Release = {SDK + schema + Renderer + Entry}

## 兼容性

当前大量使用了weakmap，private等特性。
> 除了 promise，不应该出现其他需要在 IE 上 polyfill 的功能，所有的 polyfill 和语法转译交给用户来做，这里只 从 ts build 到 js。

## TODO

timeline 、 projection 、camera proxy 如果不移除，就无法变成可传输的格式。

projection 应该只需要保留 desc，不需要实例。
