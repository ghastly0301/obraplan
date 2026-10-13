import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { estoqueMaterial } from "@/lib/calc";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const movimento = await prisma.movimentoMaterial.findUnique({
    where: { id: Number(id) },
    include: { material: { include: { movimentos: true } } },
  });
  if (!movimento) return NextResponse.redirect(new URL("/materiais", req.url), 303);

  // Excluir uma compra não pode deixar o estoque negativo.
  if (movimento.tipo === "compra") {
    const estoque = estoqueMaterial(movimento.material.movimentos);
    if (estoque - movimento.quantidade < -1e-6) {
      return NextResponse.redirect(
        new URL(
          `/materiais?erro=estoque_excluir&m=${encodeURIComponent(movimento.material.nome)}`,
          req.url
        ),
        303
      );
    }
  }

  await prisma.movimentoMaterial.delete({ where: { id: movimento.id } });
  return NextResponse.redirect(new URL("/materiais?ok=1", req.url), 303);
}
