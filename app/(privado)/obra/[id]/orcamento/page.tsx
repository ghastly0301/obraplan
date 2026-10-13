import Link from "next/link";
import type { Servico } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra, totalOrcamento } from "@/lib/calc";
import { moeda, numeroParaInput, qtd, unidade, UNIDADES } from "@/lib/format";
import FormPost from "@/components/FormPost";

function CamposServico({ s }: { s?: Servico }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <label className="rotulo">Código</label>
        <input
          name="codigo"
          defaultValue={s?.codigo}
          required
          placeholder="SRV-09"
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo">Unidade</label>
        <select name="unidade" defaultValue={s?.unidade ?? "m2"} className="campo">
          {UNIDADES.map((u) => (
            <option key={u} value={u}>
              {unidade(u)}
            </option>
          ))}
        </select>
      </div>
      <div className="col-span-2">
        <label className="rotulo">Descrição</label>
        <input name="descricao" defaultValue={s?.descricao} required className="campo" />
      </div>
      <div>
        <label className="rotulo">Quantidade</label>
        <input
          name="quantidade"
          inputMode="decimal"
          defaultValue={s ? numeroParaInput(s.quantidade) : ""}
          required
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo">Preço unitário (R$)</label>
        <input
          name="precoUnitario"
          inputMode="decimal"
          defaultValue={s ? numeroParaInput(s.precoUnitario) : ""}
          required
          className="campo"
        />
      </div>
    </div>
  );
}

const ERROS: Record<string, string> = {
  campos: "Preencha os campos corretamente.",
  qtd_medida: "A quantidade não pode ficar menor do que o total já medido.",
  excluir_medido: "Este serviço já tem medição lançada e não pode ser excluído.",
};

export default async function PaginaOrcamento({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; s?: string }>;
}) {
  await exigirSessao();
  const { id } = await params;
  const sp = await searchParams;
  const obra = await obterObra(id);
  const servicos = await prisma.servico.findMany({
    where: { obraId: obra.id },
    orderBy: { codigo: "asc" },
  });
  const total = totalOrcamento(servicos);

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Orçamento</h1>

      {sp.ok && <p className="aviso-ok">Orçamento atualizado.</p>}
      {sp.erro && ERROS[sp.erro] && (
        <p className="aviso-erro">
          {ERROS[sp.erro]}
          {sp.s ? ` (${sp.s})` : ""}
        </p>
      )}

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Adicionar serviço</summary>
        <form method="post" action="/api/servicos" className="mt-3">
          <input type="hidden" name="obraId" value={obra.id} />
          <CamposServico />
          <button className="botao mt-3 w-full">Adicionar</button>
        </form>
      </details>

      {servicos.length === 0 && (
        <p className="cartao text-sm text-zinc-500">
          Nenhum serviço no orçamento ainda.
        </p>
      )}

      <div className="space-y-3">
        {servicos.map((s) => (
          <div key={s.id} className="cartao">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs font-semibold text-zinc-500">{s.codigo}</div>
                <div className="font-medium leading-snug">{s.descricao}</div>
                <div className="mt-1 text-sm text-zinc-500">
                  {qtd(s.quantidade)} {unidade(s.unidade)} × {moeda(s.precoUnitario)}
                </div>
              </div>
              <div className="whitespace-nowrap text-right font-bold">
                {moeda(s.quantidade * s.precoUnitario)}
              </div>
            </div>
            <details className="mt-2">
              <summary className="text-sm font-semibold text-blue-700">Editar</summary>
              <form method="post" action={`/api/servicos/${s.id}`} className="mt-3">
                <CamposServico s={s} />
                <button className="botao mt-3 w-full">Salvar alterações</button>
              </form>
              <FormPost
                action={`/api/servicos/${s.id}/excluir`}
                confirmar={`Excluir o serviço ${s.codigo}?`}
                className="mt-2"
              >
                <button className="botao-claro w-full text-red-600">
                  Excluir serviço
                </button>
              </FormPost>
            </details>
          </div>
        ))}
      </div>

      <div className="cartao mt-3 flex items-center justify-between">
        <span className="font-semibold">Total do orçamento</span>
        <span className="text-xl font-bold">{moeda(total)}</span>
      </div>
    </div>
  );
}
