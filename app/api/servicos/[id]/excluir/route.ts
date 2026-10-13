import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";

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

  const itens = await prisma.medicaoItem.count({ where: { servicoId: servico.id } });
  if (itens > 0) {
    return voltar(`erro=excluir_medido&s=${encodeURIComponent(servico.codigo)}`);
  }

  await prisma.servico.delete({ where: { id: servico.id } });
  return voltar("ok=1");
}
