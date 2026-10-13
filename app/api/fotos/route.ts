import { NextResponse } from "next/server";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";
import { parseDataISO } from "@/lib/format";

const EXTENSOES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
};

export async function POST(req: Request) {
  if (!(await usuarioDaSessao())) {
    return NextResponse.redirect(new URL("/login", req.url), 303);
  }

  const form = await req.formData();
  const obraId = Number(form.get("obraId"));
  const obra = Number.isInteger(obraId)
    ? await prisma.obra.findUnique({ where: { id: obraId } })
    : null;
  if (!obra) return NextResponse.redirect(new URL("/", req.url), 303);

  const voltar = (q: string) =>
    NextResponse.redirect(new URL(`/obra/${obra.id}/fotos?${q}`, req.url), 303);

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

  const dir = path.join(process.cwd(), "public", "uploads");
  await fs.mkdir(dir, { recursive: true });

  let salvas = 0;
  for (const arquivo of arquivos) {
    if (!arquivo.type.startsWith("image/")) continue;
    const extNome = path.extname(arquivo.name).toLowerCase();
    const ext = /^\.[a-z0-9]{2,5}$/.test(extNome)
      ? extNome
      : EXTENSOES[arquivo.type] ?? ".jpg";
    const nome = `${crypto.randomUUID()}${ext}`;
    await fs.writeFile(path.join(dir, nome), Buffer.from(await arquivo.arrayBuffer()));
    await prisma.foto.create({
      data: {
        obraId: obra.id,
        servicoId,
        data,
        legenda: legenda || null,
        caminhoArquivo: `/uploads/${nome}`,
      },
    });
    salvas++;
  }

  if (salvas === 0) return voltar("erro=sem_imagem");
  return voltar(`ok=${salvas}`);
}
