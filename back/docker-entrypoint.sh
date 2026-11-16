#!/bin/sh
set -e
# Roda como root apenas para corrigir o dono das pastas gravadas pelo backend. Volumes criados por
# versões antigas (que rodavam como root) continuam funcionando depois da troca para o usuário "node".
if [ "$(id -u)" = "0" ]; then
  for dir in /app/public/audios /app/data/audit-outbox /app/data/license /app/export/modelos-rtf; do
    mkdir -p "$dir"
    chown -R node:node "$dir" 2>/dev/null || echo "Aviso: não foi possível ajustar o dono de $dir"
  done
  exec su-exec node "$@"
fi
exec "$@"
