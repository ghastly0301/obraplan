-- CreateTable
CREATE TABLE "Usuario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senhaHash" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Sessao" (
    "token" TEXT NOT NULL PRIMARY KEY,
    "usuarioId" INTEGER NOT NULL,
    "expiraEm" DATETIME NOT NULL,
    CONSTRAINT "Sessao_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Cliente" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "documento" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "email" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "Obra" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "nome" TEXT NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "endereco" TEXT NOT NULL,
    "dataInicio" DATETIME NOT NULL,
    "prazoDias" INTEGER NOT NULL,
    "valorContrato" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'planejada',
    CONSTRAINT "Obra_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Servico" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" INTEGER NOT NULL,
    "codigo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "unidade" TEXT NOT NULL,
    "quantidade" REAL NOT NULL,
    "precoUnitario" REAL NOT NULL,
    CONSTRAINT "Servico_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Medicao" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" INTEGER NOT NULL,
    "numero" INTEGER NOT NULL,
    "periodoInicio" DATETIME NOT NULL,
    "periodoFim" DATETIME NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'rascunho',
    "observacoes" TEXT,
    CONSTRAINT "Medicao_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicaoItem" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "medicaoId" INTEGER NOT NULL,
    "servicoId" INTEGER NOT NULL,
    "quantidadeExecutada" REAL NOT NULL,
    CONSTRAINT "MedicaoItem_medicaoId_fkey" FOREIGN KEY ("medicaoId") REFERENCES "Medicao" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "MedicaoItem_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Diario" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" INTEGER NOT NULL,
    "data" DATETIME NOT NULL,
    "climaManha" TEXT NOT NULL,
    "climaTarde" TEXT NOT NULL,
    "efetivo" INTEGER NOT NULL,
    "atividades" TEXT NOT NULL,
    "ocorrencias" TEXT,
    CONSTRAINT "Diario_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Foto" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "obraId" INTEGER NOT NULL,
    "servicoId" INTEGER,
    "data" DATETIME NOT NULL,
    "legenda" TEXT,
    "caminhoArquivo" TEXT NOT NULL,
    "criadoEm" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Foto_obraId_fkey" FOREIGN KEY ("obraId") REFERENCES "Obra" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Foto_servicoId_fkey" FOREIGN KEY ("servicoId") REFERENCES "Servico" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Medicao_obraId_numero_key" ON "Medicao"("obraId", "numero");

-- CreateIndex
CREATE UNIQUE INDEX "MedicaoItem_medicaoId_servicoId_key" ON "MedicaoItem"("medicaoId", "servicoId");

-- CreateIndex
CREATE UNIQUE INDEX "Diario_obraId_data_key" ON "Diario"("obraId", "data");
