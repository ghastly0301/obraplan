import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { CLIMAS, parseDataISO } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const obraId = Number(form.get("obraId"));
  const obra = Number.isInteger(obraId)
    ? await prisma.obra.findUnique({ where: { id: obraId } })
    : null;
  if (!obra) return NextResponse.redirect(urlDe(req, "/"), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(urlDe(req, `/obra/${obra.id}/diario?${q}`), 303);

  const data = parseDataISO(form.get("data"));
  const climaManha = String(form.get("climaManha") ?? "");
  const climaTarde = String(form.get("climaTarde") ?? "");
  const efetivo = Number(String(form.get("efetivo") ?? "").trim());
  const atividades = String(form.get("atividades") ?? "").trim();
  const ocorrencias = String(form.get("ocorrencias") ?? "").trim();

  if (
    !data ||
    !(CLIMAS as readonly string[]).includes(climaManha) ||
    !(CLIMAS as readonly string[]).includes(climaTarde) ||
    !Number.isInteger(efetivo) ||
    efetivo < 0 ||
    !atividades
  ) {
    return voltar("erro=campos");
  }

  try {
    await prisma.diario.create({
      data: {
        obraId: obra.id,
        data,
        climaManha,
        climaTarde,
        efetivo,
        atividades,
        ocorrencias: ocorrencias || null,
      },
    });
  } catch (e) {
    // Regra: um diário por obra por data.
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return voltar("erro=duplicado");
    }
    throw e;
  }

  return voltar("ok=1");
}
