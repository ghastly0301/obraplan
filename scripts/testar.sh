#!/usr/bin/env bash
# Roda a bateria de testes de ponta a ponta num banco e numa porta próprios,
# sem tocar no banco de desenvolvimento.
#
# Precisa de um Postgres acessível. Por padrão usa o banco local
# `obraplan_test`; defina DATABASE_URL_TESTE para apontar para outro.
set -euo pipefail
cd "$(dirname "$0")/.."

export DATABASE_URL="${DATABASE_URL_TESTE:-postgresql://$(whoami)@localhost:5432/obraplan_test}"
PORTA="${PORTA:-3100}"

createdb obraplan_test 2>/dev/null || true
npx prisma db push --skip-generate >/dev/null

npx next dev -p "$PORTA" > /tmp/obraplan-testes.log 2>&1 &
SERVIDOR=$!
trap 'kill "$SERVIDOR" 2>/dev/null || true' EXIT

for _ in $(seq 1 60); do
  curl -sf "http://127.0.0.1:$PORTA/login" >/dev/null && break
  sleep 1
done

BASE="http://127.0.0.1:$PORTA" npx tsx scripts/testes-e2e.ts
