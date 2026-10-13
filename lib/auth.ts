import crypto from "crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "./db";

export const COOKIE_SESSAO = "obraplan_sessao";
const DURACAO_DIAS = 30;

export async function criarSessao(usuarioId: number) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiraEm = new Date(Date.now() + DURACAO_DIAS * 24 * 60 * 60 * 1000);
  await prisma.sessao.create({ data: { token, usuarioId, expiraEm } });
  return { token, expiraEm };
}

export async function usuarioDaSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (!token) return null;
  const sessao = await prisma.sessao.findUnique({
    where: { token },
    include: { usuario: true },
  });
  if (!sessao || sessao.expiraEm < new Date()) return null;
  return sessao.usuario;
}

export async function exigirSessao() {
  const usuario = await usuarioDaSessao();
  if (!usuario) redirect("/login");
  return usuario;
}

export async function encerrarSessao() {
  const jar = await cookies();
  const token = jar.get(COOKIE_SESSAO)?.value;
  if (token) await prisma.sessao.deleteMany({ where: { token } });
}
