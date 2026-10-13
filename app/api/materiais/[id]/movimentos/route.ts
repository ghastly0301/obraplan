import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO, parseNumeroBR } from "@/lib/format";
import { estoqueMaterial } from "@/lib/calc";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const material = await prisma.material.findUnique({
    where: { id: Number(id) },
    include: { movimentos: true },
  });
  if (!material) return NextResponse.redirect(new URL("/materiais", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/materiais?${q}`, req.url), 303);

  const form = await req.formData();
  const tipo = String(form.get("tipo") ?? "");
  const data = parseDataISO(form.get("data"));
  const quantidade = parseNumeroBR(form.get("quantidade"));
  const descricao = String(form.get("descricao") ?? "").trim() || null;

  if (!data || quantidade === null || quantidade <= 0) return voltar("erro=campos");

  if (tipo === "compra") {
    const precoUnitario = parseNumeroBR(form.get("precoUnitario"));
    if (precoUnitario === null || precoUnitario < 0) return voltar("erro=campos");
    await prisma.movimentoMaterial.create({
      data: { materialId: material.id, data, tipo, quantidade, precoUnitario, descricao },
    });
  } else if (tipo === "uso") {
    // Regra: não dá para usar mais do que há no estoque.
    const estoque = estoqueMaterial(material.movimentos);
    if (quantidade > estoque + 1e-6) {
      return voltar(`erro=estoque&m=${encodeURIComponent(material.nome)}`);
    }
    let obraId: number | null = null;
    const obraBruto = String(form.get("obraId") ?? "");
    if (obraBruto) {
      const obra = await prisma.obra.findUnique({ where: { id: Number(obraBruto) } });
      if (!obra) return voltar("erro=campos");
      obraId = obra.id;
    }
    await prisma.movimentoMaterial.create({
      data: { materialId: material.id, data, tipo, quantidade, obraId, descricao },
    });
  } else {
    return voltar("erro=campos");
  }

  return voltar("ok=1");
}
