import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { dataBR } from "@/lib/format";
import FormPost from "@/components/FormPost";
import type { Chamado, Obra } from "@prisma/client";

function FormChamado({
  chamado,
  obras,
}: {
  chamado?: Chamado;
  obras: Obra[];
}) {
  const action = chamado ? `/api/chamados/${chamado.id}` : "/api/chamados";
  return (
    <form method="post" action={action}>
      <div className="grid grid-cols-1 gap-3">
        <div>
          <label className="rotulo">Título</label>
          <input
            name="titulo"
            defaultValue={chamado?.titulo}
            required
            placeholder="Ex.: Vazamento no banheiro do 2º andar"
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Descrição do chamado</label>
          <textarea
            name="descricao"
            defaultValue={chamado?.descricao}
            required
            rows={3}
            placeholder="Descreva o problema ou a solicitação…"
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Obra (opcional)</label>
          <select name="obraId" defaultValue={chamado?.obraId ?? ""} className="campo">
            <option value="">— Nenhuma —</option>
            {obras.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nome}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="botao mt-3 w-full">
        {chamado ? "Salvar alterações" : "Abrir chamado"}
      </button>
    </form>
  );
}

function CartaoChamado({
  chamado,
  obras,
}: {
  chamado: Chamado & { obra: Obra | null };
  obras: Obra[];
}) {
  const aberto = chamado.status === "aberto";
  return (
    <div className={`cartao ${aberto ? "border-amber-300" : "opacity-70"}`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold leading-snug">{chamado.titulo}</div>
          <div className="text-xs text-zinc-500">
            Aberto em {dataBR(chamado.criadoEm)}
            {chamado.obra ? ` · ${chamado.obra.nome}` : ""}
          </div>
        </div>
        <span
          className={`badge ${
            aberto ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"
          }`}
        >
          {aberto ? "Aberto" : "Resolvido"}
        </span>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm">{chamado.descricao}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <FormPost action={`/api/chamados/${chamado.id}/status`}>
          <input type="hidden" name="acao" value={aberto ? "resolver" : "reabrir"} />
          <button
            className={
              aberto
                ? "h-11 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white active:bg-green-900"
                : "botao-claro h-11 px-4 text-sm"
            }
          >
            {aberto ? "✅ Marcar resolvido" : "Reabrir"}
          </button>
        </FormPost>
        <FormPost
          action={`/api/chamados/${chamado.id}/excluir`}
          confirmar="Excluir este chamado?"
        >
          <button className="botao-claro h-11 px-4 text-sm text-red-600">Excluir</button>
        </FormPost>
      </div>
      <details className="mt-2">
        <summary className="text-sm font-semibold text-blue-700">Editar</summary>
        <div className="mt-3">
          <FormChamado chamado={chamado} obras={obras} />
        </div>
      </details>
    </div>
  );
}

export default async function PaginaChamados({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirSessao();
  const sp = await searchParams;
  const [chamados, obras] = await Promise.all([
    prisma.chamado.findMany({
      include: { obra: true },
      orderBy: { criadoEm: "desc" },
    }),
    prisma.obra.findMany({ orderBy: { nome: "asc" } }),
  ]);
  const abertos = chamados.filter((c) => c.status === "aberto");
  const resolvidos = chamados.filter((c) => c.status === "resolvido");

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Chamados</h1>

      {sp.ok && <p className="aviso-ok">Salvo.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Abrir chamado</summary>
        <div className="mt-3">
          <FormChamado obras={obras} />
        </div>
      </details>

      <h2 className="mb-2 text-base font-semibold text-zinc-700">
        Abertos ({abertos.length})
      </h2>
      {abertos.length === 0 && (
        <p className="cartao mb-3 text-sm text-zinc-500">Nenhum chamado aberto. 👍</p>
      )}
      <div className="space-y-3">
        {abertos.map((c) => (
          <CartaoChamado key={c.id} chamado={c} obras={obras} />
        ))}
      </div>

      {resolvidos.length > 0 && (
        <>
          <h2 className="mb-2 mt-5 text-base font-semibold text-zinc-700">
            Resolvidos ({resolvidos.length})
          </h2>
          <div className="space-y-3">
            {resolvidos.map((c) => (
              <CartaoChamado key={c.id} chamado={c} obras={obras} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
