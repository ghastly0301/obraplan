import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { destinoSeguro } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const cliente = await prisma.cliente.findUnique({ where: { id: Number(id) } });
  if (!cliente) return NextResponse.redirect(new URL("/clientes", req.url), 303);

  const form = await req.formData();
  const voltar = destinoSeguro(form.get("voltar"), "/clientes");
  const nome = String(form.get("nome") ?? "").trim();
  if (!nome) {
    return NextResponse.redirect(new URL(`${voltar}?erro=campos`, req.url), 303);
  }

  await prisma.cliente.update({
    where: { id: cliente.id },
    data: {
      nome,
      documento: String(form.get("documento") ?? "").trim(),
      telefone: String(form.get("telefone") ?? "").trim(),
      email: String(form.get("email") ?? "").trim(),
    },
  });
  return NextResponse.redirect(new URL(`${voltar}?ok=1`, req.url), 303);
}
