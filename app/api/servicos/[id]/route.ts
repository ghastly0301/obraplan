import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseNumeroBR, UNIDADES } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const { id } = await params;
  const servico = await prisma.servico.findUnique({ where: { id: Number(id) } });
  if (!servico) return NextResponse.redirect(urlDe(req, "/"), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(
      urlDe(req, `/obra/${servico.obraId}/orcamento?${q}`),
      303
    );

  const form = await req.formData();
  const codigo = String(form.get("codigo") ?? "").trim();
  const descricao = String(form.get("descricao") ?? "").trim();
  const unidade = String(form.get("unidade") ?? "");
  const quantidade = parseNumeroBR(form.get("quantidade"));
  const precoUnitario = parseNumeroBR(form.get("precoUnitario"));

  if (
    !codigo ||
    !descricao ||
    !(UNIDADES as readonly string[]).includes(unidade) ||
    quantidade === null ||
    quantidade <= 0 ||
    precoUnitario === null ||
    precoUnitario < 0
  ) {
    return voltar("erro=campos");
  }

  // A quantidade orçada não pode ficar menor do que o total já medido.
  const medido = await prisma.medicaoItem.aggregate({
    where: { servicoId: servico.id },
    _sum: { quantidadeExecutada: true },
  });
  const totalMedido = medido._sum.quantidadeExecutada ?? 0;
  if (quantidade < totalMedido - 1e-6) {
    return voltar(`erro=qtd_medida&s=${encodeURIComponent(servico.codigo)}`);
  }

  await prisma.servico.update({
    where: { id: servico.id },
    data: { codigo, descricao, unidade, quantidade, precoUnitario },
  });
  return voltar("ok=1");
}
