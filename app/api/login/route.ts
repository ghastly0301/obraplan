import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { COOKIE_SESSAO, criarSessao } from "@/lib/auth";

export async function POST(req: Request) {
  const form = await req.formData();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const senha = String(form.get("senha") ?? "");

  const usuario = email
    ? await prisma.usuario.findUnique({ where: { email } })
    : null;
  const ok = usuario && senha ? bcrypt.compareSync(senha, usuario.senhaHash) : false;

  if (!ok || !usuario) {
    // Mensagem genérica: não revela se o e-mail existe.
    return NextResponse.redirect(urlDe(req, "/login?erro=1"), 303);
  }

  const { token, expiraEm } = await criarSessao(usuario.id);
  const res = NextResponse.redirect(urlDe(req, "/"), 303);
  res.cookies.set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires: expiraEm,
  });
  return res;
}
