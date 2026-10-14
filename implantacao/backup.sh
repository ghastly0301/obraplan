#!/usr/bin/env bash
# Backup diário do banco e das fotos. Instale no cron do root:
#   0 3 * * * /opt/obraplan/implantacao/backup.sh
#
# Guarda 14 dias em /var/backups/obraplan. Copie esse diretório para fora
# da máquina: backup que mora no mesmo disco não é backup.
set -euo pipefail
DESTINO=/var/backups/obraplan
DIA=$(date +%F)
mkdir -p "$DESTINO"

sudo -u postgres pg_dump obraplan | gzip > "$DESTINO/banco-$DIA.sql.gz"
tar -czf "$DESTINO/fotos-$DIA.tar.gz" -C /opt/obraplan/public uploads

find "$DESTINO" -name '*.gz' -mtime +14 -delete
