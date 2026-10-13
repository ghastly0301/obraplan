import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { UNIDADES_MATERIAL } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const unidade = String(form.get("unidade") ?? "");

  if (!nome || !(UNIDADES_MATERIAL as readonly string[]).includes(unidade)) {
    return NextResponse.redirect(urlDe(req, "/materiais?erro=campos"), 303);
  }

  await prisma.material.create({ data: { nome, unidade } });
  return NextResponse.redirect(urlDe(req, "/materiais?ok=1"), 303);
}
