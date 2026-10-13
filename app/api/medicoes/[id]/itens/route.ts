import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseNumeroBR } from "@/lib/format";
import { jaMedidoPorServico } from "@/lib/calc";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(urlDe(req, "/login"), 303);
  }

  const { id } = await params;
  const medicaoId = Number(id);
  const medicao = await prisma.medicao.findUnique({ where: { id: medicaoId } });
  if (!medicao) return NextResponse.redirect(urlDe(req, "/"), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(
      urlDe(req, `/obra/${medicao.obraId}/medicao/${medicao.id}?${q}`),
      303
    );

  // Regra: medição aprovada fica travada.
  if (medicao.status === "aprovada") return voltar("erro=travada");

  const form = await req.formData();
  const servicos = await prisma.servico.findMany({
    where: { obraId: medicao.obraId },
  });
  const jaMedido = await jaMedidoPorServico(medicao.obraId, medicao.id);

  const gravar: { servicoId: number; quantidade: number }[] = [];
  for (const s of servicos) {
    const bruto = form.get(`qtd_${s.id}`);
    if (bruto === null) continue;
    const texto = String(bruto).trim();
    const q = texto === "" ? 0 : parseNumeroBR(texto);
    if (q === null || q < 0) {
      return voltar(`erro=valor&s=${encodeURIComponent(s.codigo)}`);
    }
    // Regra central: já medido + sendo medido nunca passa do orçado.
    const saldo = s.quantidade - (jaMedido.get(s.id) ?? 0);
    if (q > saldo + 1e-6) {
      return voltar(`erro=saldo&s=${encodeURIComponent(s.codigo)}`);
    }
    gravar.push({ servicoId: s.id, quantidade: q });
  }

  const observacoes = form.get("observacoes");
  await prisma.$transaction([
    ...gravar.map((g) =>
      g.quantidade > 0
        ? prisma.medicaoItem.upsert({
            where: {
              medicaoId_servicoId: { medicaoId, servicoId: g.servicoId },
            },
            update: { quantidadeExecutada: g.quantidade },
            create: {
              medicaoId,
              servicoId: g.servicoId,
              quantidadeExecutada: g.quantidade,
            },
          })
        : prisma.medicaoItem.deleteMany({
            where: { medicaoId, servicoId: g.servicoId },
          })
    ),
    ...(typeof observacoes === "string"
      ? [
          prisma.medicao.update({
            where: { id: medicaoId },
            data: { observacoes: observacoes.trim() || null },
          }),
        ]
      : []),
  ]);

  return voltar("ok=1");
}
