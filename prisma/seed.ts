import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Limpa tudo (ordem respeita as chaves estrangeiras)
  await prisma.medicaoItem.deleteMany();
  await prisma.medicao.deleteMany();
  await prisma.diario.deleteMany();
  await prisma.foto.deleteMany();
  await prisma.servico.deleteMany();
  await prisma.obra.deleteMany();
  await prisma.cliente.deleteMany();
  await prisma.sessao.deleteMany();
  await prisma.usuario.deleteMany();
  // Reinicia os IDs autoincrementais para o seed ser sempre igual
  await prisma.$executeRawUnsafe(`DELETE FROM sqlite_sequence`);

  await prisma.usuario.create({
    data: {
      nome: "Derik",
      email: "derik@obraplan.com.br",
      senhaHash: bcrypt.hashSync("Obra@Plan2026", 10),
    },
  });

  const horizonte = await prisma.cliente.create({
    data: {
      nome: "Horizonte Empreendimentos Ltda",
      documento: "12.345.678/0001-90",
      telefone: "(31) 3333-4455",
      email: "contato@horizonte.com.br",
    },
  });

  const marcos = await prisma.cliente.create({
    data: {
      nome: "Marcos Vilela",
      documento: "123.456.789-00",
      telefone: "(31) 98888-7766",
      email: "marcos.vilela@email.com",
    },
  });

  const galpao = await prisma.obra.create({
    data: {
      nome: "Galpão Logístico Horizonte",
      clienteId: horizonte.id,
      endereco: "Rod. BR-040, km 521 — Contagem/MG",
      dataInicio: new Date("2026-07-15T00:00:00.000Z"),
      prazoDias: 240,
      valorContrato: 392710,
      status: "em_andamento",
    },
  });

  await prisma.obra.create({
    data: {
      nome: "Residência Bosque das Araras",
      clienteId: marcos.id,
      endereco: "Rua das Araras, 120 — Nova Lima/MG",
      dataInicio: new Date("2026-11-03T00:00:00.000Z"),
      prazoDias: 300,
      valorContrato: 580000,
      status: "planejada",
    },
  });

  const servicos = [
    { codigo: "SRV-01", descricao: "Fundação em concreto armado", unidade: "m3", quantidade: 45, precoUnitario: 1850 },
    { codigo: "SRV-02", descricao: "Alvenaria de vedação em bloco cerâmico", unidade: "m2", quantidade: 620, precoUnitario: 98 },
    { codigo: "SRV-03", descricao: "Laje maciça em concreto armado", unidade: "m2", quantidade: 380, precoUnitario: 210 },
    { codigo: "SRV-04", descricao: "Reboco interno e externo", unidade: "m2", quantidade: 1150, precoUnitario: 42 },
    { codigo: "SRV-05", descricao: "Contrapiso desempenado", unidade: "m2", quantidade: 380, precoUnitario: 55 },
    { codigo: "SRV-06", descricao: "Pintura látex acrílica", unidade: "m2", quantidade: 1150, precoUnitario: 28 },
    { codigo: "SRV-07", descricao: "Instalação elétrica completa", unidade: "vb", quantidade: 1, precoUnitario: 38000 },
    { codigo: "SRV-08", descricao: "Instalação hidráulica completa", unidade: "vb", quantidade: 1, precoUnitario: 29500 },
  ];

  const porCodigo: Record<string, number> = {};
  for (const s of servicos) {
    const criado = await prisma.servico.create({ data: { ...s, obraId: galpao.id } });
    porCodigo[s.codigo] = criado.id;
  }

  // Medição 1 — aprovada (fundação completa + parte da alvenaria)
  await prisma.medicao.create({
    data: {
      obraId: galpao.id,
      numero: 1,
      periodoInicio: new Date("2026-08-01T00:00:00.000Z"),
      periodoFim: new Date("2026-08-31T00:00:00.000Z"),
      status: "aprovada",
      observacoes: "Fundação concluída e liberada pela fiscalização.",
      itens: {
        create: [
          { servicoId: porCodigo["SRV-01"], quantidadeExecutada: 45 },
          { servicoId: porCodigo["SRV-02"], quantidadeExecutada: 250 },
        ],
      },
    },
  });

  // Medição 2 — rascunho (continuação da alvenaria + laje)
  await prisma.medicao.create({
    data: {
      obraId: galpao.id,
      numero: 2,
      periodoInicio: new Date("2026-09-01T00:00:00.000Z"),
      periodoFim: new Date("2026-09-30T00:00:00.000Z"),
      status: "rascunho",
      itens: {
        create: [
          { servicoId: porCodigo["SRV-02"], quantidadeExecutada: 200 },
          { servicoId: porCodigo["SRV-03"], quantidadeExecutada: 190 },
        ],
      },
    },
  });

  await prisma.diario.createMany({
    data: [
      {
        obraId: galpao.id,
        data: new Date("2026-10-08T00:00:00.000Z"),
        climaManha: "Sol",
        climaTarde: "Sol",
        efetivo: 12,
        atividades: "Concretagem da laje do mezanino. Assentamento de alvenaria no eixo B.",
        ocorrencias: null,
      },
      {
        obraId: galpao.id,
        data: new Date("2026-10-09T00:00:00.000Z"),
        climaManha: "Sol",
        climaTarde: "Chuva",
        efetivo: 10,
        atividades: "Alvenaria no eixo C pela manhã. Organização do canteiro à tarde.",
        ocorrencias: "Chuva forte a partir das 14h paralisou os serviços externos.",
      },
      {
        obraId: galpao.id,
        data: new Date("2026-10-10T00:00:00.000Z"),
        climaManha: "Nublado",
        climaTarde: "Nublado",
        efetivo: 11,
        atividades: "Retomada da alvenaria. Início da marcação das instalações elétricas.",
        ocorrencias: null,
      },
    ],
  });

  console.log("Seed concluído.");
  console.log("Login de teste: derik@obraplan.com.br / Obra@Plan2026");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
