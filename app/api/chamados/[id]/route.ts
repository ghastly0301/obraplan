import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { ehAdmin, usuarioDaSessao } from "@/lib/auth";
import { PRIORIDADES, TELAS_SISTEMA } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioDaSessao();
  if (!usuario) return NextResponse.redirect(urlDe(req, "/login"), 303);

  const { id } = await params;
  const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) } });
  if (!chamado) return NextResponse.redirect(urlDe(req, "/chamados"), 303);

  // Só o autor (enquanto não está resolvido) ou o administrador editam.
  const souAutor = chamado.usuarioId === usuario.id;
  if (!ehAdmin(usuario) && (!souAutor || chamado.status === "resolvido")) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=permissao"), 303);
  }

  const form = await req.formData();
  const titulo = String(form.get("titulo") ?? "").trim();
  const descricao = String(form.get("descricao") ?? "").trim();
  const prioridade = String(form.get("prioridade") ?? "media");
  const telaBruta = String(form.get("tela") ?? "").trim();

  if (!titulo || !descricao || !(prioridade in PRIORIDADES)) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=campos"), 303);
  }

  const tela = (TELAS_SISTEMA as readonly string[]).includes(telaBruta)
    ? telaBruta
    : null;

  await prisma.chamado.update({
    where: { id: chamado.id },
    data: { titulo, descricao, prioridade, tela },
  });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=1"), 303);
}
