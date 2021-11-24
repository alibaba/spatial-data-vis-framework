echo "安装 examples 的 *外部* 依赖"
cd ./examples
yarn install --no-optional

echo "link examples 的 *本地* 依赖"
cd ../
npx lerna link --force-local

