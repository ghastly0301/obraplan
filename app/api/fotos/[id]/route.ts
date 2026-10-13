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
  const foto = await prisma.foto.findUnique({ where: { id: Number(id) } });
  if (!foto) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/obra/${foto.obraId}/fotos?${q}`, req.url), 303);

  const form = await req.formData();
  const data = parseDataISO(form.get("data"));
  if (!data) return voltar("erro=campos");

  let servicoId: number | null = null;
  const servicoBruto = String(form.get("servicoId") ?? "");
  if (servicoBruto) {
    const servico = await prisma.servico.findUnique({
      where: { id: Number(servicoBruto) },
    });
    if (!servico || servico.obraId !== foto.obraId) return voltar("erro=campos");
    servicoId = servico.id;
  }

  await prisma.foto.update({
    where: { id: foto.id },
    data: {
      data,
      servicoId,
      legenda: String(form.get("legenda") ?? "").trim() || null,
    },
  });
  return voltar("ok=salvo");
}
