import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { CLIMAS, parseDataISO } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const diario = await prisma.diario.findUnique({ where: { id: Number(id) } });
  if (!diario) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/obra/${diario.obraId}/diario?${q}`, req.url), 303);

  const form = await req.formData();
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
    await prisma.diario.update({
      where: { id: diario.id },
      data: {
        data,
        climaManha,
        climaTarde,
        efetivo,
        atividades,
        ocorrencias: ocorrencias || null,
      },
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return voltar("erro=duplicado");
    }
    throw e;
  }

  return voltar("ok=1");
}
