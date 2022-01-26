#!/usr/bin/env bash

echo -n "Are you located in *mainland China*? (yes/No)"
read -r inChina

if [ $inChina == "yes" ]
then
    echo "Your answer is yes. Will set registry to Chinese mirror"

    npm config set registry https://registry.npm.taobao.org
    yarn config set registry https://registry.npmmirror.com
    
else 
    echo "Your answer is no. Will use original registry."
fi

npm i -g lerna

npm i -g yarn

echo -e "\nnode -v # v14 or higher"
node -v # v14 or higher

echo -e "\nnpx yarn -v # v1.x"
npx yarn -v # v1.x

echo -e "\nnpx lerna -v # v4.x recommended"
npx lerna -v # v4.x recommended


npm run setup