-- Papéis de usuário: admin (administrador do ObraPlan, resolve chamados)
-- e empreiteiro (usa o sistema e abre chamados).
ALTER TABLE "Usuario" ADD COLUMN "papel" TEXT NOT NULL DEFAULT 'empreiteiro';

-- Chamado passa a registrar quem relatou.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Chamado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usuarioId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tela" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "resposta" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" DATETIME,
    CONSTRAINT "Chamado_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Chamados já existentes passam a pertencer ao primeiro usuário cadastrado.
INSERT INTO "new_Chamado" ("id", "usuarioId", "titulo", "descricao", "tela", "prioridade", "status", "resposta", "criadoEm", "resolvidoEm")
SELECT "id", (SELECT MIN("id") FROM "Usuario"), "titulo", "descricao", "tela", "prioridade", "status", "resposta", "criadoEm", "resolvidoEm"
FROM "Chamado"
WHERE (SELECT MIN("id") FROM "Usuario") IS NOT NULL;

DROP TABLE "Chamado";
ALTER TABLE "new_Chamado" RENAME TO "Chamado";

PRAGMA foreign_keys=ON;
