import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const titulo = String(form.get("titulo") ?? "").trim();
  const descricao = String(form.get("descricao") ?? "").trim();
  if (!titulo || !descricao) {
    return NextResponse.redirect(urlDe(req, "/chamados?erro=campos"), 303);
  }

  let obraId: number | null = null;
  const obraBruto = String(form.get("obraId") ?? "");
  if (obraBruto) {
    const obra = await prisma.obra.findUnique({ where: { id: Number(obraBruto) } });
    if (!obra) {
      return NextResponse.redirect(urlDe(req, "/chamados?erro=campos"), 303);
    }
    obraId = obra.id;
  }

  await prisma.chamado.create({ data: { titulo, descricao, obraId } });
  return NextResponse.redirect(urlDe(req, "/chamados?ok=1"), 303);
}
