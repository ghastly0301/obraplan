import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { destinoSeguro } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const voltar = destinoSeguro(form.get("voltar"), "/clientes");
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) {
    return NextResponse.redirect(urlDe(req, `${voltar}?erro=campos`), 303);
  }

  await prisma.cliente.create({
    data: {
      nome,
      documento: String(form.get("documento") ?? "").trim(),
      telefone: String(form.get("telefone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
    },
  });
  return NextResponse.redirect(urlDe(req, `${voltar}?ok=1`), 303);
}
