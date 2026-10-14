/**
 * Guarda as fotos das obras.
 *
 * Na Vercel o disco é efêmero: cada requisição pode cair numa instância
 * nova, então um arquivo gravado em `public/uploads` desaparece. Com
 * `BLOB_READ_WRITE_TOKEN` definido, as fotos vão para o Vercel Blob. Sem o
 * token (desenvolvimento local e testes), ficam em `public/uploads`.
 *
 * O banco guarda o retorno de `salvarImagem`: uma URL do blob em produção
 * ou um caminho `/uploads/...` localmente. A tela usa o valor como está.
 */
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

const DIR_LOCAL = path.join(process.cwd(), "public", "uploads");

const EXTENSOES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
};

function extensaoDe(nomeOriginal: string, tipo: string) {
  const ext = path.extname(nomeOriginal).toLowerCase();
  return /^\.[a-z0-9]{2,5}$/.test(ext) ? ext : EXTENSOES[tipo] ?? ".jpg";
}

function usaBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Grava a imagem e devolve o caminho público para guardar no banco. */
export async function salvarImagem(
  nomeOriginal: string,
  conteudo: Buffer,
  tipo: string
) {
  const nome = `${crypto.randomUUID()}${extensaoDe(nomeOriginal, tipo)}`;
  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(`obras/${nome}`, conteudo, {
      access: "public",
      contentType: tipo,
      addRandomSuffix: false,
    });
    return url;
  }
  await fs.mkdir(DIR_LOCAL, { recursive: true });
  await fs.writeFile(path.join(DIR_LOCAL, nome), conteudo);
  return `/uploads/${nome}`;
}

/**
 * Remove a imagem. Erro é ignorado de propósito: o registro já saiu do
 * banco e um arquivo órfão não quebra nenhuma tela.
 */
export async function removerImagem(caminho: string) {
  if (/^https?:\/\//.test(caminho)) {
    const { del } = await import("@vercel/blob");
    await del(caminho).catch(() => {});
    return;
  }
  await fs
    .unlink(path.join(DIR_LOCAL, path.basename(caminho)))
    .catch(() => {});
}
