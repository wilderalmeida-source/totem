#!/bin/sh
set -eu
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
test "$#" -eq 1 || { echo 'Uso: sh configurar-licenca.sh https://SEU-WORKER.workers.dev' >&2; exit 1; }
BACKEND_CONTAINER=${BACKEND_CONTAINER:-totem-backend}
IMAGE=$(docker inspect --format '{{.Image}}' "$BACKEND_CONTAINER")
docker run --rm --pull=never --user "$(id -u):$(id -g)" \
  --mount "type=bind,source=$(pwd),target=/config" \
  --workdir /config --entrypoint node \
  "$IMAGE" /config/scripts/configurar-licenca-env.cjs --url "$1"
