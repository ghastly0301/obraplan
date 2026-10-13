-- Chamado passa a ser chamado de SUPORTE DO SISTEMA (bug/dificuldade
-- relatada pelo empreiteiro ao administrador), e não algo ligado a uma obra.
-- Remove obraId e acrescenta tela, prioridade, resposta e resolvidoEm.
PRAGMA foreign_keys=OFF;

CREATE TABLE "new_Chamado" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "tela" TEXT,
    "prioridade" TEXT NOT NULL DEFAULT 'media',
    "status" TEXT NOT NULL DEFAULT 'aberto',
    "resposta" TEXT,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvidoEm" DATETIME
);

INSERT INTO "new_Chamado" ("id", "titulo", "descricao", "status", "criadoEm")
SELECT "id", "titulo", "descricao", "status", "criadoEm" FROM "Chamado";

DROP TABLE "Chamado";
ALTER TABLE "new_Chamado" RENAME TO "Chamado";

PRAGMA foreign_keys=ON;
