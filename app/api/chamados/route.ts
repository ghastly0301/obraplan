import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { PRIORIDADES, TELAS_SISTEMA } from "@/lib/format";

export async function POST(req: Request) {
  const usuario = await usuarioDaSessao();
  if (!usuario) return NextResponse.redirect(urlDe(req, "/login"), 303);

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

  await prisma.chamado.create({
    data: { usuarioId: usuario.id, titulo, descricao, prioridade, tela },
  });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=aberto"), 303);
}
