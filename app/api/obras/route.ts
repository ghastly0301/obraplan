import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO, parseNumeroBR, STATUS_OBRA } from "@/lib/format";

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const endereco = String(form.get("endereco") ?? "").trim();
  const clienteId = Number(form.get("clienteId"));
  const dataInicio = parseDataISO(form.get("dataInicio"));
  const prazoDias = Number(String(form.get("prazoDias") ?? "").trim());
  const valorContrato = parseNumeroBR(form.get("valorContrato"));
  const status = String(form.get("status") ?? "planejada");

  const cliente = Number.isInteger(clienteId)
    ? await prisma.cliente.findUnique({ where: { id: clienteId } })
    : null;

  if (
    !nome ||
    !endereco ||
    !cliente ||
    !dataInicio ||
    !Number.isInteger(prazoDias) ||
    prazoDias <= 0 ||
    valorContrato === null ||
    valorContrato < 0 ||
    !(status in STATUS_OBRA)
  ) {
    return NextResponse.redirect(urlDe(req, "/obras/nova?erro=campos"), 303);
  }

  const obra = await prisma.obra.create({
    data: { nome, endereco, clienteId: cliente.id, dataInicio, prazoDias, valorContrato, status },
  });
  return NextResponse.redirect(urlDe(req, `/obra/${obra.id}`), 303);
}
