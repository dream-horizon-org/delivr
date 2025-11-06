# export ENV=stag
# echo "ENV: ${ENV}"
# export SERVICE_NAME="dota"
# export NAMESPACE="master"
# export CONFIG_BRANCH="master"
# echo "SERVICE_NAME: ${SERVICE_NAME}"
# echo "CONSUL_TOKEN: ${CONSUL_TOKEN}"
# echo "VAULT_TOKEN: ${VAULT_TOKEN}"
# echo "NAMESPACE: ${NAMESPACE}"
# echo "CONFIG_BRANCH: ${CONFIG_BRANCH}"

# curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.1/install.sh | bash

# source ~/.nvm/nvm.sh
# nvm --version
# nvm install  18.16.0
# nvm use 18.16.0
# node --version
# npm cache clean --force
# npm install -g pnpm
# npm install -g yarn
# yarn --version
# pnpm install
# pnpm --version

corepack --version

npm install -g corepack

corepack --version

corepack enable


cd ${BASE_DIR}/${SERVICE_NAME}

echo "Installing dependencies..."
yes | pnpm install

NODE_ENV=production PORT=3000 pnpm build
