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
  await prisma.movimentoMaterial.deleteMany();
  await prisma.material.deleteMany();
  await prisma.movimentoFuncionario.deleteMany();
  await prisma.funcionario.deleteMany();
  await prisma.recebimento.deleteMany();
  await prisma.chamado.deleteMany();
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

  // Funcionários com dias trabalhados e pagamentos
  const funcionarios = [
    {
      nome: "João Pereira",
      funcao: "Pedreiro",
      diaria: 180,
      movimentos: [
        { data: "2026-10-03", tipo: "trabalho", dias: 6, valor: 1080, descricao: "Semana 28/09 a 03/10" },
        { data: "2026-10-10", tipo: "trabalho", dias: 6, valor: 1080, descricao: "Semana 05/10 a 10/10" },
        { data: "2026-10-10", tipo: "pagamento", dias: null, valor: 1500, descricao: "Adiantamento" },
      ],
    },
    {
      nome: "Carlos Lima",
      funcao: "Servente",
      diaria: 130,
      movimentos: [
        { data: "2026-10-10", tipo: "trabalho", dias: 12, valor: 1560, descricao: "Quinzena" },
        { data: "2026-10-10", tipo: "pagamento", dias: null, valor: 800, descricao: "Adiantamento" },
      ],
    },
    {
      nome: "Antônio Souza",
      funcao: "Eletricista",
      diaria: 220,
      movimentos: [
        { data: "2026-10-10", tipo: "trabalho", dias: 5, valor: 1100, descricao: "Marcação elétrica" },
      ],
    },
  ];
  for (const f of funcionarios) {
    await prisma.funcionario.create({
      data: {
        nome: f.nome,
        funcao: f.funcao,
        diaria: f.diaria,
        movimentos: {
          create: f.movimentos.map((m) => ({
            data: new Date(`${m.data}T00:00:00.000Z`),
            tipo: m.tipo,
            dias: m.dias,
            valor: m.valor,
            descricao: m.descricao,
          })),
        },
      },
    });
  }

  // Materiais com compras e usos
  const materiais = [
    {
      nome: "Cimento CP-II 50 kg",
      unidade: "sc",
      movimentos: [
        { data: "2026-09-20", tipo: "compra", quantidade: 100, precoUnitario: 38.9, descricao: "Depósito Central" },
        { data: "2026-10-05", tipo: "uso", quantidade: 60, obraId: galpao.id, descricao: "Laje do mezanino" },
      ],
    },
    {
      nome: "Areia média lavada",
      unidade: "m3",
      movimentos: [
        { data: "2026-09-20", tipo: "compra", quantidade: 20, precoUnitario: 120, descricao: "Depósito Central" },
        { data: "2026-10-05", tipo: "uso", quantidade: 12, obraId: galpao.id, descricao: null },
      ],
    },
    {
      nome: "Bloco cerâmico 9x19x39",
      unidade: "un",
      movimentos: [
        { data: "2026-09-15", tipo: "compra", quantidade: 5000, precoUnitario: 2.1, descricao: "Cerâmica São José" },
        { data: "2026-10-08", tipo: "uso", quantidade: 3500, obraId: galpao.id, descricao: "Alvenaria eixos B e C" },
      ],
    },
    {
      nome: "Tinta acrílica branca 18 L",
      unidade: "gl",
      movimentos: [
        { data: "2026-10-01", tipo: "compra", quantidade: 10, precoUnitario: 320, descricao: "Casa das Tintas" },
      ],
    },
  ];
  for (const m of materiais) {
    await prisma.material.create({
      data: {
        nome: m.nome,
        unidade: m.unidade,
        movimentos: {
          create: m.movimentos.map((mov) => ({
            data: new Date(`${mov.data}T00:00:00.000Z`),
            tipo: mov.tipo,
            quantidade: mov.quantidade,
            precoUnitario: "precoUnitario" in mov ? mov.precoUnitario : null,
            obraId: "obraId" in mov ? mov.obraId : null,
            descricao: mov.descricao ?? null,
          })),
        },
      },
    });
  }

  // Recebimento do cliente (medição 1 paga em parte)
  await prisma.recebimento.create({
    data: {
      obraId: galpao.id,
      data: new Date("2026-09-10T00:00:00.000Z"),
      valor: 80000,
      descricao: "Pagamento parcial da medição nº 1",
    },
  });

  // Chamados
  await prisma.chamado.create({
    data: {
      titulo: "Vazamento na prumada do mezanino",
      descricao:
        "Cliente relatou vazamento após a concretagem da laje. Verificar a prumada hidráulica do eixo B antes do reboco.",
      obraId: galpao.id,
      status: "aberto",
    },
  });
  await prisma.chamado.create({
    data: {
      titulo: "Portão do canteiro sem cadeado",
      descricao: "Comprar cadeado novo para o portão de acesso ao canteiro.",
      obraId: galpao.id,
      status: "resolvido",
    },
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
