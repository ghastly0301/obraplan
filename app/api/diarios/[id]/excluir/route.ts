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
  const diario = await prisma.diario.findUnique({ where: { id: Number(id) } });
  if (!diario) return NextResponse.redirect(urlDe(req, "/"), 303);

  await prisma.diario.delete({ where: { id: diario.id } });
  return NextResponse.redirect(
    urlDe(req, `/obra/${diario.obraId}/diario?ok=1`),
    303
  );
}
