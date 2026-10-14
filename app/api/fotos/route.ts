import { NextResponse } from "next/server";
import { urlDe } from "@/lib/url";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO } from "@/lib/format";
import { salvarImagem } from "@/lib/armazenamento";

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

  const voltar = (q: string) =>
    NextResponse.redirect(urlDe(req, `/obra/${obra.id}/fotos?${q}`), 303);

  const data = parseDataISO(form.get("data"));
  if (!data) return voltar("erro=campos");

  const legenda = String(form.get("legenda") ?? "").trim();

  let servicoId: number | null = null;
  const servicoBruto = String(form.get("servicoId") ?? "");
  if (servicoBruto) {
    const servico = await prisma.servico.findUnique({
      where: { id: Number(servicoBruto) },
    });
    if (!servico || servico.obraId !== obra.id) return voltar("erro=campos");
    servicoId = servico.id;
  }

  const arquivos = form
    .getAll("arquivos")
    .filter((a): a is File => a instanceof File && a.size > 0);
  if (arquivos.length === 0) return voltar("erro=sem_arquivo");

  let salvas = 0;
  for (const arquivo of arquivos) {
    if (!arquivo.type.startsWith("image/")) continue;
    const caminhoArquivo = await salvarImagem(
      arquivo.name,
      Buffer.from(await arquivo.arrayBuffer()),
      arquivo.type
    );
    await prisma.foto.create({
      data: {
        obraId: obra.id,
        servicoId,
        data,
        legenda: legenda || null,
        caminhoArquivo,
      },
    });
    salvas++;
  }

  if (salvas === 0) return voltar("erro=sem_imagem");
  return voltar(`ok=${salvas}`);
}
