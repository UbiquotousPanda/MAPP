#!/usr/bin/env bash
# Sends HEAD (not uncommitted changes) to the VM and rebuilds there, keeping ~/mapp/.env; see README.md.
set -euo pipefail

target=${1:?usage: deploy/test-vm/deploy.sh azureuser@<vm-host>}
cd "$(git rev-parse --show-toplevel)"

git archive --format=tar HEAD | ssh "$target" '
  set -e
  mkdir -p ~/mapp
  find ~/mapp -mindepth 1 -maxdepth 1 ! -name .env -exec rm -rf {} +
  tar -x -C ~/mapp
  cd ~/mapp
  docker compose -f compose.yaml -f deploy/test-vm/compose.yaml up -d --build --remove-orphans
  docker image prune -f
'
echo "Deployed $(git rev-parse --short HEAD) to $target"
