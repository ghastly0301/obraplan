import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra } from "@/lib/calc";
import { dataBR, hojeISO } from "@/lib/format";

export default async function PaginaFotos({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirSessao();
  const { id } = await params;
  const sp = await searchParams;
  const obra = await obterObra(id);
  const [servicos, fotos] = await Promise.all([
    prisma.servico.findMany({ where: { obraId: obra.id }, orderBy: { codigo: "asc" } }),
    prisma.foto.findMany({
      where: { obraId: obra.id },
      include: { servico: true },
      orderBy: [{ data: "desc" }, { criadoEm: "desc" }],
    }),
  ]);

  const grupos = new Map<string, typeof fotos>();
  for (const f of fotos) {
    const chave = dataBR(f.data);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave)!.push(f);
  }

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Fotos da obra</h1>

      {sp.ok && (
        <p className="aviso-ok">
          {sp.ok} foto{Number(sp.ok) > 1 ? "s" : ""} enviada
          {Number(sp.ok) > 1 ? "s" : ""}.
        </p>
      )}
      {sp.erro === "sem_arquivo" && (
        <p className="aviso-erro">Selecione pelo menos uma foto.</p>
      )}
      {sp.erro === "sem_imagem" && (
        <p className="aviso-erro">Os arquivos selecionados não são imagens.</p>
      )}
      {sp.erro === "campos" && (
        <p className="aviso-erro">Preencha os campos corretamente.</p>
      )}

      <form
        method="post"
        action="/api/fotos"
        encType="multipart/form-data"
        className="cartao mb-4"
      >
        <input type="hidden" name="obraId" value={obra.id} />
        <label className="rotulo">Fotos (pode selecionar várias)</label>
        <input
          type="file"
          name="arquivos"
          accept="image/*"
          multiple
          required
          className="block w-full text-sm file:mr-3 file:h-11 file:cursor-pointer file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:font-semibold file:text-blue-700"
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo">Data</label>
            <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
          </div>
          <div>
            <label className="rotulo">Serviço (opcional)</label>
            <select name="servicoId" className="campo" defaultValue="">
              <option value="">— Nenhum —</option>
              {servicos.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigo} · {s.descricao}
                </option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className="rotulo">Legenda (opcional)</label>
            <input name="legenda" className="campo" placeholder="Ex.: Laje do mezanino" />
          </div>
        </div>
        <button className="botao mt-3 w-full">Enviar fotos</button>
      </form>

      {fotos.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhuma foto enviada ainda.</p>
      )}

      {[...grupos.entries()].map(([data, lista]) => (
        <section key={data} className="mb-4">
          <h2 className="mb-2 text-base font-semibold text-zinc-700">📅 {data}</h2>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
            {lista.map((f) => (
              <a
                key={f.id}
                href={f.caminhoArquivo}
                target="_blank"
                rel="noopener"
                className="block"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.caminhoArquivo}
                  alt={f.legenda ?? "Foto da obra"}
                  loading="lazy"
                  className="aspect-square w-full rounded-lg bg-zinc-200 object-cover"
                />
                {(f.legenda || f.servico) && (
                  <div className="mt-0.5 truncate text-xs text-zinc-600">
                    {f.servico ? `${f.servico.codigo} · ` : ""}
                    {f.legenda ?? ""}
                  </div>
                )}
              </a>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
