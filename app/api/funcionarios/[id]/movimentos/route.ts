import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO, parseNumeroBR } from "@/lib/format";

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

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/funcionarios?${q}`, req.url), 303);

  const form = await req.formData();
  const tipo = String(form.get("tipo") ?? "");
  const data = parseDataISO(form.get("data"));
  const descricao = String(form.get("descricao") ?? "").trim() || null;
  if (!data) return voltar("erro=campos");

  if (tipo === "trabalho") {
    const dias = parseNumeroBR(form.get("dias"));
    if (dias === null || dias <= 0) return voltar("erro=campos");
    await prisma.movimentoFuncionario.create({
      data: {
        funcionarioId: funcionario.id,
        data,
        tipo,
        dias,
        valor: dias * funcionario.diaria,
        descricao,
      },
    });
  } else if (tipo === "pagamento") {
    const valor = parseNumeroBR(form.get("valor"));
    if (valor === null || valor <= 0) return voltar("erro=campos");
    await prisma.movimentoFuncionario.create({
      data: { funcionarioId: funcionario.id, data, tipo, valor, descricao },
    });
  } else {
    return voltar("erro=campos");
  }

  return voltar("ok=1");
}
