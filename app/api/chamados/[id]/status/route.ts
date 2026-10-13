import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { confirmarAdmin, usuarioDaSessao } from "@/lib/auth";

/** De quais status cada ação pode partir, e para onde leva. */
const TRANSICOES: Record<string, { de: string[]; para: string }> = {
  analisar: { de: ["aberto"], para: "em_analise" },
  resolver: { de: ["aberto", "em_analise"], para: "resolvido" },
  reabrir: { de: ["em_analise", "resolvido"], para: "aberto" },
};

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioDaSessao();
  if (!usuario) return NextResponse.redirect(urlDe(req, "/login"), 303);

  // Triagem e resposta são exclusivas do administrador do ObraPlan.
  // O papel é relido do banco para não depender do objeto da sessão.
  if (!(await confirmarAdmin(usuario.id))) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=permissao"), 303);
  }

  const { id } = await params;
  const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) } });
  if (!chamado) return NextResponse.redirect(urlDe(req, "/chamados"), 303);

  const form = await req.formData();
  const acao = String(form.get("acao") ?? "");
  const transicao = TRANSICOES[acao];
  if (!transicao || !transicao.de.includes(chamado.status)) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=transicao"), 303);
  }

  const respostaBruta = form.get("resposta");
  const resposta =
    typeof respostaBruta === "string" ? respostaBruta.trim() : null;

  await prisma.chamado.update({
    where: { id: chamado.id },
    data: {
      status: transicao.para,
      resolvidoEm: transicao.para === "resolvido" ? new Date() : null,
      ...(resposta !== null ? { resposta: resposta || null } : {}),
    },
  });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=1"), 303);
}
