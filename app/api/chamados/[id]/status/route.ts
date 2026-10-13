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
  const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) } });
  if (!chamado) return NextResponse.redirect(urlDe(req, "/chamados"), 303);

  const form = await req.formData();
  const acao = String(form.get("acao") ?? "");
  const novo =
    acao === "resolver" && chamado.status === "aberto"
      ? "resolvido"
      : acao === "reabrir" && chamado.status === "resolvido"
        ? "aberto"
        : null;
  if (!novo) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=campos"), 303);
  }

  await prisma.chamado.update({ where: { id: chamado.id }, data: { status: novo } });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=1"), 303);
}
