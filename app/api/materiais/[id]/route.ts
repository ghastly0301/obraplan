import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { UNIDADES_MATERIAL } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const material = await prisma.material.findUnique({ where: { id: Number(id) } });
  if (!material) return NextResponse.redirect(new URL("/materiais", req.url), 303);

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const unidade = String(form.get("unidade") ?? "");

  if (!nome || !(UNIDADES_MATERIAL as readonly string[]).includes(unidade)) {
    return NextResponse.redirect(new URL("/materiais?erro=campos", req.url), 303);
  }

  await prisma.material.update({
    where: { id: material.id },
    data: { nome, unidade },
  });
  return NextResponse.redirect(new URL("/materiais?ok=1", req.url), 303);
}
