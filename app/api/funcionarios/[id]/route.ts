import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseNumeroBR } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const funcionario = await prisma.funcionario.findUnique({
    where: { id: Number(id) },
  });
  if (!funcionario) {
    return NextResponse.redirect(new URL("/funcionarios", req.url), 303);
  }

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const funcao = String(form.get("funcao") ?? "").trim();
  const diaria = parseNumeroBR(form.get("diaria"));

  if (!nome || !funcao || diaria === null || diaria <= 0) {
    return NextResponse.redirect(new URL("/funcionarios?erro=campos", req.url), 303);
  }

  await prisma.funcionario.update({
    where: { id: funcionario.id },
    data: { nome, funcao, diaria },
  });
  return NextResponse.redirect(new URL("/funcionarios?ok=1", req.url), 303);
}
