#!/bin/sh
set -eu

project_dir="${MONEYBOT_DIR:-/opt/moneybot}"
compose="docker compose -f docker-compose.prod.yml -f docker-compose.tls.yml"

cd "$project_dir"

restart_frontend() {
    $compose up -d --force-recreate frontend
}

trap restart_frontend EXIT
$compose stop frontend
/opt/certbot-venv/bin/certbot renew --quiet

