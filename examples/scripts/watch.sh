#!/bin/bash

# DO NOT EDIT
# AUTO COPIED FROM ROOT/shared

pwd

echo "NOT IMPLEMENTED YET!!!"

# watch 只有自定而下有意义，用于实时预览 example，单独 watch 一个 package 是没有意义的；
# 应该尝试 https://facebook.github.io/watchman/ 的方案，只在顶部提供整个项目的热更新功能；
# 而非使用 tsc 的 watch；
# actually，tsc 内置的 watch 只能用于维护完全由 ts 一种语言构成的项目；
# 多语言的项目（like this）必须另寻他路。

# npx tsc -v

# tsc --project tsconfig.build.json --incremental false --watch