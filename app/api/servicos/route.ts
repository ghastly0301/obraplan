import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseNumeroBR, UNIDADES } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const obraId = Number(form.get("obraId"));
  const obra = Number.isInteger(obraId)
    ? await prisma.obra.findUnique({ where: { id: obraId } })
    : null;
  if (!obra) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/obra/${obra.id}/orcamento?${q}`, req.url), 303);

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

  await prisma.servico.create({
    data: { obraId: obra.id, codigo, descricao, unidade, quantidade, precoUnitario },
  });
  return voltar("ok=1");
}
