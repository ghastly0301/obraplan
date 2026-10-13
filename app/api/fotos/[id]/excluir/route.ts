import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import { usuarioDaSessao } from "@/lib/auth";

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

  await prisma.foto.delete({ where: { id: foto.id } });

  // Remove o arquivo do disco (apenas dentro de public/uploads)
  const nome = path.basename(foto.caminhoArquivo);
  await fs
    .unlink(path.join(process.cwd(), "public", "uploads", nome))
    .catch(() => {});

  return NextResponse.redirect(
    new URL(`/obra/${foto.obraId}/fotos?ok=salvo`, req.url),
    303
  );
}
