#!/usr/bin/env bash
# One-time setup of the live server on the Mac mini (Linux). Run from the repository checkout:
#   ./deploy/install.sh
# Creates deploy/.env (if missing), installs the auto-update timer and starts the live server.
set -euo pipefail
dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
say() { echo -e "\033[1m==>\033[0m $*"; }

command -v docker >/dev/null || { echo "Docker is not installed (see docs/deploy.md, step 1)"; exit 1; }
docker compose version >/dev/null 2>&1 || { echo "The docker compose plugin is missing (see docs/deploy.md, step 1)"; exit 1; }
docker info >/dev/null 2>&1 || { echo "This user can't talk to Docker: sudo usermod -aG docker \$USER, then log in again"; exit 1; }

if [ ! -f "$dir/.env" ]; then
  cp "$dir/.env.example" "$dir/.env"
  # A random admin token for the learner endpoints.
  sed -i "s/^ADMIN_TOKEN=.*/ADMIN_TOKEN=$(head -c 24 /dev/urandom | base64 | tr -dc 'A-Za-z0-9' | head -c 32)/" "$dir/.env"
  chmod 600 "$dir/.env"
  say "Created $dir/.env. Fill in the S3 backup settings (S3_BUCKET, AWS_*), then run this script again."
  exit 0
fi
chmod 600 "$dir/.env"

say "Installing the auto-update timer (needs sudo)"
for unit in castle-defense-update.service castle-defense-update.timer; do
  sed -e "s#__DEPLOY_DIR__#${dir}#g" -e "s#__USER__#$(id -un)#g" "$dir/systemd/$unit" | sudo tee "/etc/systemd/system/$unit" >/dev/null
done
sudo systemctl daemon-reload
sudo systemctl enable --now castle-defense-update.timer

say "Installing the latest release and starting the live server"
"$dir/update.sh" --force

say "Done. Status:"
sleep 5
curl -fs "http://127.0.0.1:$(grep -E '^HOST_PORT=' "$dir/.env" | cut -d= -f2 || echo 8080)/api/health" && echo
(cd "$dir" && docker compose ps)
