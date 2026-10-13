import { notFound } from "next/navigation";
import { prisma } from "./db";

export function totalOrcamento(servicos: { quantidade: number; precoUnitario: number }[]) {
  return servicos.reduce((soma, s) => soma + s.quantidade * s.precoUnitario, 0);
}

export function valorMedicao(itens: { quantidadeExecutada: number; servico: { precoUnitario: number } }[]) {
  return itens.reduce((soma, i) => soma + i.quantidadeExecutada * i.servico.precoUnitario, 0);
}

/** Valor acumulado das medições APROVADAS da obra. */
export async function valorMedidoAprovado(obraId: number) {
  const itens = await prisma.medicaoItem.findMany({
    where: { medicao: { obraId, status: "aprovada" } },
    include: { servico: true },
  });
  return valorMedicao(itens);
}

export async function resumoObra(obraId: number) {
  const servicos = await prisma.servico.findMany({ where: { obraId } });
  const orcamento = totalOrcamento(servicos);
  const medido = await valorMedidoAprovado(obraId);
  const perc = orcamento > 0 ? (medido / orcamento) * 100 : 0;
  return { orcamento, medido, perc, saldo: orcamento - medido };
}

/** Soma da quantidade executada por serviço em todas as medições da obra,
 *  exceto a medição informada (a que está sendo editada). */
export async function jaMedidoPorServico(obraId: number, excetoMedicaoId?: number) {
  const itens = await prisma.medicaoItem.findMany({
    where: {
      medicao: {
        obraId,
        ...(excetoMedicaoId ? { id: { not: excetoMedicaoId } } : {}),
      },
    },
  });
  const mapa = new Map<number, number>();
  for (const i of itens) {
    mapa.set(i.servicoId, (mapa.get(i.servicoId) ?? 0) + i.quantidadeExecutada);
  }
  return mapa;
}

/** Carrega a obra pelo parâmetro da URL ou dispara 404. */
export async function obterObra(idParam: string) {
  const id = Number(idParam);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const obra = await prisma.obra.findUnique({
    where: { id },
    include: { cliente: true },
  });
  if (!obra) notFound();
  return obra;
}
