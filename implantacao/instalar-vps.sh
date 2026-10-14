#!/usr/bin/env bash
#
# Instala o ObraPlan num VPS Ubuntu 22.04 ou 24.04, do zero.
# Rode como root:
#
#   DOMINIO=obraplan.com.br REPO=https://github.com/ghastly0301/obraplan \
#     BRANCH=main bash instalar-vps.sh
#
# É idempotente: rodar de novo atualiza o código e reinicia o serviço.
# O HTTPS é o último passo e fica a seu critério (precisa do DNS já
# apontando para este servidor).
set -euo pipefail

DOMINIO="${DOMINIO:?defina DOMINIO}"
REPO="${REPO:?defina REPO}"
BRANCH="${BRANCH:-main}"
DIR=/opt/obraplan
SENHA_BANCO="${SENHA_BANCO:-$(openssl rand -hex 24)}"

[ "$(id -u)" = 0 ] || { echo "Rode como root."; exit 1; }

echo "== Pacotes"
apt-get update -qq
apt-get install -y -qq curl git nginx postgresql ca-certificates gnupg
if ! command -v node >/dev/null || [ "$(node -v | cut -d. -f1)" != "v20" ]; then
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key \
    | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" \
    > /etc/apt/sources.list.d/nodesource.list
  apt-get update -qq
  apt-get install -y -qq nodejs
fi

echo "== Usuário do sistema"
id obraplan >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin obraplan

echo "== Banco"
systemctl enable --now postgresql
if ! sudo -u postgres psql -tAc "select 1 from pg_roles where rolname='obraplan'" | grep -q 1; then
  sudo -u postgres psql -qc "CREATE ROLE obraplan LOGIN PASSWORD '$SENHA_BANCO'"
  NOVO_BANCO=1
fi
sudo -u postgres psql -tAc "select 1 from pg_database where datname='obraplan'" | grep -q 1 \
  || sudo -u postgres createdb -O obraplan obraplan

echo "== Código"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --quiet origin "$BRANCH"
  git -C "$DIR" reset --hard --quiet "origin/$BRANCH"
else
  git clone --quiet --branch "$BRANCH" "$REPO" "$DIR"
fi

# O .env não vem do git: é criado aqui, na primeira instalação.
if [ ! -f "$DIR/.env" ]; then
  cat > "$DIR/.env" <<ENV
DATABASE_URL="postgresql://obraplan:$SENHA_BANCO@localhost:5432/obraplan"
NODE_ENV=production
ENV
  chmod 600 "$DIR/.env"
  echo "   .env criado. Senha do banco guardada só nele."
fi

mkdir -p "$DIR/public/uploads"
chown -R obraplan:obraplan "$DIR"

echo "== Dependências e build"
sudo -u obraplan npm --prefix "$DIR" ci --silent
sudo -u obraplan --preserve-env=HOME bash -c "cd $DIR && npx prisma migrate deploy && npm run build"

echo "== Serviço"
install -m 644 "$DIR/implantacao/obraplan.service" /etc/systemd/system/obraplan.service
systemctl daemon-reload
systemctl enable --now obraplan
systemctl restart obraplan

echo "== nginx"
sed "s/DOMINIO/$DOMINIO/" "$DIR/implantacao/nginx.conf" > /etc/nginx/sites-available/obraplan
ln -sf /etc/nginx/sites-available/obraplan /etc/nginx/sites-enabled/obraplan
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx

echo "== Backup diário"
install -m 755 "$DIR/implantacao/backup.sh" /usr/local/bin/obraplan-backup
echo '0 3 * * * root /usr/local/bin/obraplan-backup' > /etc/cron.d/obraplan-backup

echo
echo "Pronto. http://$DOMINIO"
echo
echo "Faltam dois passos, nesta ordem:"
echo "  1. HTTPS:  apt-get install -y certbot python3-certbot-nginx && certbot --nginx -d $DOMINIO"
echo "  2. Admin:  cd $DIR && cp .env.admin.exemplo .env.admin && nano .env.admin && npm run criar-admin"
echo
echo "Não rode 'npm run seed' em produção: ele apaga todos os dados e recria"
echo "o administrador de demonstração, cuja senha está publicada no README."
