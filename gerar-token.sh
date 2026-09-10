#!/bin/sh
set -eu

# Executar na VM Linux com Docker. Nao reinicia nenhum container.
cd "$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
BACKEND_CONTAINER=${BACKEND_CONTAINER:-totem-backend}
test -f .env.backend || { echo 'Arquivo .env.backend nao encontrado.' >&2; exit 1; }
test -f .env.frontend || { echo 'Arquivo .env.frontend nao encontrado.' >&2; exit 1; }
IMAGE=$(docker inspect --format '{{.Image}}' "$BACKEND_CONTAINER")
docker run --rm --pull=never \
  --network "container:$BACKEND_CONTAINER" \
  --env-file .env.backend \
  --mount "type=bind,source=$(pwd),target=/config" \
  --workdir /config --entrypoint node \
  "$IMAGE" /config/scripts/gerar-token.cjs
