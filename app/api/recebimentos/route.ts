import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO, parseNumeroBR } from "@/lib/format";

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
    NextResponse.redirect(new URL(`/obra/${obra.id}/recebimentos?${q}`, req.url), 303);

  const data = parseDataISO(form.get("data"));
  const valor = parseNumeroBR(form.get("valor"));
  if (!data || valor === null || valor <= 0) return voltar("erro=campos");

  await prisma.recebimento.create({
    data: {
      obraId: obra.id,
      data,
      valor,
      descricao: String(form.get("descricao") ?? "").trim() || null,
    },
  });
  return voltar("ok=1");
}
