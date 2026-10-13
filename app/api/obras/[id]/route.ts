import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO, parseNumeroBR, STATUS_OBRA } from "@/lib/format";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const { id } = await params;
  const obra = await prisma.obra.findUnique({ where: { id: Number(id) } });
  if (!obra) return NextResponse.redirect(new URL("/", req.url), 303);

  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const endereco = String(form.get("endereco") ?? "").trim();
  const clienteId = Number(form.get("clienteId"));
  const dataInicio = parseDataISO(form.get("dataInicio"));
  const prazoDias = Number(String(form.get("prazoDias") ?? "").trim());
  const valorContrato = parseNumeroBR(form.get("valorContrato"));
  const status = String(form.get("status") ?? "");

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
    return NextResponse.redirect(
      new URL(`/obra/${obra.id}/editar?erro=campos`, req.url),
      303
    );
  }

  await prisma.obra.update({
    where: { id: obra.id },
    data: { nome, endereco, clienteId: cliente.id, dataInicio, prazoDias, valorContrato, status },
  });
  return NextResponse.redirect(new URL(`/obra/${obra.id}`, req.url), 303);
}
