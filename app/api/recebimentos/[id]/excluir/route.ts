import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const { id } = await params;
  const recebimento = await prisma.recebimento.findUnique({
    where: { id: Number(id) },
  });
  if (!recebimento) return NextResponse.redirect(urlDe(req, "/"), 303);

  await prisma.recebimento.delete({ where: { id: recebimento.id } });
  return NextResponse.redirect(
    urlDe(req, `/obra/${recebimento.obraId}/recebimentos?ok=1`),
    303
  );
}
