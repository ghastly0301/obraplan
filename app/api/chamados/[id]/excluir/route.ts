import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { confirmarAdmin, usuarioDaSessao } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const usuario = await usuarioDaSessao();
  if (!usuario) return NextResponse.redirect(urlDe(req, "/login"), 303);

  const { id } = await params;
  const chamado = await prisma.chamado.findUnique({ where: { id: Number(id) } });
  if (!chamado) return NextResponse.redirect(urlDe(req, "/chamados"), 303);

  // O autor pode cancelar o próprio chamado enquanto está aberto;
  // o administrador pode excluir qualquer um.
  const podeExcluir =
    (chamado.usuarioId === usuario.id && chamado.status === "aberto") ||
    (await confirmarAdmin(usuario.id));
  if (!podeExcluir) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=permissao"), 303);
  }

  await prisma.chamado.delete({ where: { id: chamado.id } });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=1"), 303);
}
