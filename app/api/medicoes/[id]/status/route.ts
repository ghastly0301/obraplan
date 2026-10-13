import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";

const TRANSICOES: Record<string, { de: string; para: string }> = {
  enviar: { de: "rascunho", para: "enviada" },
  aprovar: { de: "enviada", para: "aprovada" },
  reabrir: { de: "enviada", para: "rascunho" },
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const medicao = await prisma.medicao.findUnique({ where: { id: Number(id) } });
  if (!medicao) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(
      new URL(`/obra/${medicao.obraId}/medicao/${medicao.id}?${q}`, req.url),
      303
    );

  const form = await req.formData();
  const acao = String(form.get("acao") ?? "");
  const transicao = TRANSICOES[acao];

  // Medição aprovada é final: nenhuma transição parte dela.
  if (!transicao || medicao.status !== transicao.de) {
    return voltar("erro=transicao");
  }

  await prisma.medicao.update({
    where: { id: medicao.id },
    data: { status: transicao.para },
  });
  return voltar("ok=1");
}
