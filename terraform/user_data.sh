#!/bin/bash
set -euo pipefail
exec > /var/log/user-data.log 2>&1

echo "=== Installing Docker ==="
apt-get update -y
apt-get install -y ca-certificates curl gnupg git

install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | tee /etc/apt/sources.list.d/docker.list > /dev/null

apt-get update -y
apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

echo "=== Cloning repository ==="
git clone ${repo_url} /app
cd /app

echo "=== Writing environment file ==="
cat > .env <<'ENVEOF'
DB_NAME=${db_name}
DB_USER=${db_user}
DB_PASSWORD=${db_password}
BASE_URL=${base_url}
CLIENT_URL=${client_url}
ENVEOF

echo "=== Building and starting containers ==="
docker compose -f docker-compose.prod.yml up -d --build

echo "=== Done — app is starting at ${base_url} ==="
