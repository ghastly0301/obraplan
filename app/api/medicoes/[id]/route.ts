import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const medicao = await prisma.medicao.findUnique({ where: { id: Number(id) } });
  if (!medicao) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(
      new URL(`/obra/${medicao.obraId}/medicao/${medicao.id}?${q}`, req.url),
      303
    );

  if (medicao.status === "aprovada") return voltar("erro=travada");

  const form = await req.formData();
  const periodoInicio = parseDataISO(form.get("periodoInicio"));
  const periodoFim = parseDataISO(form.get("periodoFim"));
  if (!periodoInicio || !periodoFim || periodoInicio > periodoFim) {
    return voltar("erro=periodo");
  }

  await prisma.medicao.update({
    where: { id: medicao.id },
    data: { periodoInicio, periodoFim },
  });
  return voltar("ok=1");
}
