import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { UNIDADES_MATERIAL } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const unidade = String(form.get("unidade") ?? "");

  if (!nome || !(UNIDADES_MATERIAL as readonly string[]).includes(unidade)) {
    return NextResponse.redirect(new URL("/materiais?erro=campos", req.url), 303);
  }

  await prisma.material.create({ data: { nome, unidade } });
  return NextResponse.redirect(new URL("/materiais?ok=1", req.url), 303);
}
