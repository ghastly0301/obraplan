import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { estoqueMaterial } from "@/lib/calc";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const { id } = await params;
  const movimento = await prisma.movimentoMaterial.findUnique({
    where: { id: Number(id) },
    include: { material: { include: { movimentos: true } } },
  });
  if (!movimento) return NextResponse.redirect(urlDe(req, "/materiais"), 303);

  // Excluir uma compra não pode deixar o estoque negativo.
  if (movimento.tipo === "compra") {
    const estoque = estoqueMaterial(movimento.material.movimentos);
    if (estoque - movimento.quantidade < -1e-6) {
      return NextResponse.redirect(
        urlDe(req, `/materiais?erro=estoque_excluir&m=${encodeURIComponent(movimento.material.nome)}`),
        303
      );
    }
  }

  await prisma.movimentoMaterial.delete({ where: { id: movimento.id } });
  return NextResponse.redirect(urlDe(req, "/materiais?ok=1"), 303);
}
