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
  const medicao = await prisma.medicao.findUnique({ where: { id: Number(id) } });
  if (!medicao) return NextResponse.redirect(urlDe(req, "/"), 303);

  // Medição aprovada é travada: não pode ser excluída.
  if (medicao.status === "aprovada") {
    return NextResponse.redirect(
      urlDe(req, `/obra/${medicao.obraId}/medicao/${medicao.id}?erro=travada`),
      303
    );
  }

  await prisma.medicao.delete({ where: { id: medicao.id } });
  return NextResponse.redirect(
    urlDe(req, `/obra/${medicao.obraId}/medicoes?ok=excluida`),
    303
  );
}
