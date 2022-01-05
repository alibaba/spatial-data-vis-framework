#!/bin/bash

# DO NOT EDIT
# AUTO COPIED FROM ROOT/shared

pwd

npx tsc -v

rm -rf tsconfig.build.tsbuildinfo

tsc --project tsconfig.build.json --incremental