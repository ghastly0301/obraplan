#!/usr/bin/env bash
#
# Prepara o ObraPlan dentro de um GitHub Codespace: instala o Postgres na
# própria máquina do Codespace, cria o banco, aplica o schema e carrega os
# dados de demonstração.
#
# É o postCreateCommand do devcontainer, e pode ser rodado de novo à mão.
# Ambiente de demonstração: o banco vive no disco do Codespace e vai embora
# com ele.
set -euo pipefail
cd "$(dirname "$0")/.."

USUARIO="$(whoami)"

echo "== Postgres"
if ! command -v psql >/dev/null; then
  sudo apt-get update -qq
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq postgresql
fi
sudo service postgresql start

# `sudo -u postgres` pede senha neste container; `sudo su` não.
como_postgres() { sudo su postgres -c "$1"; }

como_postgres "psql -tAc \"select 1 from pg_roles where rolname='$USUARIO'\"" | grep -q 1 \
  || como_postgres "createuser -s $USUARIO"
psql -d postgres -tAc "select 1 from pg_database where datname='obraplan'" | grep -q 1 \
  || createdb obraplan

echo "== Ambiente"
[ -f .env ] || printf 'DATABASE_URL="postgresql://%s@localhost:5432/obraplan"\n' "$USUARIO" > .env

echo "== Dependências e schema"
npm install --silent
npx prisma generate >/dev/null
npx prisma db push --skip-generate >/dev/null

echo "== Dados de demonstração"
npm run seed

cat <<'FIM'

Pronto. Suba o servidor com:

  npm run dev

Antes de abrir a porta para a internet, troque o administrador:

  cp .env.admin.exemplo .env.admin && nano .env.admin && npm run criar-admin

O administrador que o seed cria tem a senha publicada no README.
FIM
