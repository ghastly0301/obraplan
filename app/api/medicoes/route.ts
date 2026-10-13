import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const obraId = Number(form.get("obraId"));
  const obra = Number.isInteger(obraId)
    ? await prisma.obra.findUnique({ where: { id: obraId } })
    : null;
  if (!obra) return NextResponse.redirect(urlDe(req, "/"), 303);

  const periodoInicio = parseDataISO(form.get("periodoInicio"));
  const periodoFim = parseDataISO(form.get("periodoFim"));
  if (!periodoInicio || !periodoFim || periodoInicio > periodoFim) {
    return NextResponse.redirect(
      urlDe(req, `/obra/${obra.id}/medicoes?erro=periodo`),
      303
    );
  }

  const max = await prisma.medicao.aggregate({
    where: { obraId: obra.id },
    _max: { numero: true },
  });
  const medicao = await prisma.medicao.create({
    data: {
      obraId: obra.id,
      numero: (max._max.numero ?? 0) + 1,
      periodoInicio,
      periodoFim,
      status: "rascunho",
    },
  });

  return NextResponse.redirect(
    urlDe(req, `/obra/${obra.id}/medicao/${medicao.id}`),
    303
  );
}
