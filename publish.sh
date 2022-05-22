set -e
rm -rf ./build
./node_modules/.bin/tsc
cp ./package.json ./README.md ./build/
set +e
loginName=$(npm whoami 2>/dev/null)
set -e
old_npm_registry=$(npm config get registry)
npm config set registry https://registry.npmjs.org
if [ -z "$loginName" ]
then
    echo "请先登录"
    npm login
fi

echo "My npm name is $(npm whoami)"
echo "Start Publish..."
npm publish ./build/ --access=public
npm config set registry "$old_npm_registry"
