import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { estoqueMaterial } from "@/lib/calc";
import {
  dataBR,
  hojeISO,
  moeda,
  qtd,
  unidade,
  UNIDADES_MATERIAL,
} from "@/lib/format";
import FormPost from "@/components/FormPost";

const ERROS: Record<string, string> = {
  campos: "Preencha os campos corretamente.",
  estoque: "Quantidade maior que o estoque disponível",
  estoque_excluir: "Não dá para excluir esta compra: o estoque ficaria negativo",
};

export default async function PaginaMateriais({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string; m?: string }>;
}) {
  await exigirSessao();
  const sp = await searchParams;
  const [materiais, obras] = await Promise.all([
    prisma.material.findMany({
      include: {
        movimentos: {
          include: { obra: true },
          orderBy: [{ data: "desc" }, { id: "desc" }],
        },
      },
      orderBy: { nome: "asc" },
    }),
    prisma.obra.findMany({ orderBy: { nome: "asc" } }),
  ]);

  const gastoTotal = materiais.reduce(
    (soma, mat) =>
      soma +
      mat.movimentos.reduce(
        (s, m) =>
          s + (m.tipo === "compra" ? m.quantidade * (m.precoUnitario ?? 0) : 0),
        0
      ),
    0
  );

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Materiais</h1>

      {sp.ok && <p className="aviso-ok">Salvo.</p>}
      {sp.erro && ERROS[sp.erro] && (
        <p className="aviso-erro">
          {ERROS[sp.erro]}
          {sp.m ? ` (${sp.m})` : ""}.
        </p>
      )}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="cartao">
          <div className="text-xs text-zinc-500">Materiais cadastrados</div>
          <div className="mt-1 text-lg font-bold">{materiais.length}</div>
        </div>
        <div className="cartao">
          <div className="text-xs text-zinc-500">Gasto em compras</div>
          <div className="mt-1 text-lg font-bold">{moeda(gastoTotal)}</div>
        </div>
      </div>

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Novo material</summary>
        <form method="post" action="/api/materiais" className="mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Nome</label>
              <input name="nome" required placeholder="Cimento CP-II 50kg" className="campo" />
            </div>
            <div>
              <label className="rotulo">Unidade</label>
              <select name="unidade" defaultValue="un" className="campo">
                {UNIDADES_MATERIAL.map((u) => (
                  <option key={u} value={u}>
                    {unidade(u)}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button className="botao mt-3 w-full">Adicionar</button>
        </form>
      </details>

      {materiais.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhum material cadastrado.</p>
      )}

      <div className="space-y-3">
        {materiais.map((mat) => {
          const estoque = estoqueMaterial(mat.movimentos);
          const comprado = mat.movimentos
            .filter((m) => m.tipo === "compra")
            .reduce((s, m) => s + m.quantidade, 0);
          const usado = comprado - estoque;
          const gasto = mat.movimentos.reduce(
            (s, m) =>
              s + (m.tipo === "compra" ? m.quantidade * (m.precoUnitario ?? 0) : 0),
            0
          );
          return (
            <div key={mat.id} className="cartao">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{mat.nome}</div>
                  <div className="text-sm text-zinc-500">
                    Comprado {qtd(comprado)} · Usado {qtd(usado)} · Gasto {moeda(gasto)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">Estoque</div>
                  <div
                    className={`font-bold ${
                      estoque <= 0 ? "text-red-600" : "text-green-700"
                    }`}
                  >
                    {qtd(estoque)} {unidade(mat.unidade)}
                  </div>
                </div>
              </div>

              <details className="mt-2">
                <summary className="text-sm font-semibold text-blue-700">
                  Lançamentos e edição
                </summary>

                <form
                  method="post"
                  action={`/api/materiais/${mat.id}/movimentos`}
                  className="mt-3 rounded-lg bg-zinc-50 p-3"
                >
                  <input type="hidden" name="tipo" value="compra" />
                  <div className="text-sm font-semibold">Lançar compra</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="rotulo">Data</label>
                      <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Quantidade ({unidade(mat.unidade)})</label>
                      <input name="quantidade" inputMode="decimal" required className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Preço unitário (R$)</label>
                      <input name="precoUnitario" inputMode="decimal" required className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Fornecedor (opcional)</label>
                      <input name="descricao" className="campo" />
                    </div>
                  </div>
                  <button className="botao mt-3 w-full">Lançar compra</button>
                </form>

                <form
                  method="post"
                  action={`/api/materiais/${mat.id}/movimentos`}
                  className="mt-3 rounded-lg bg-zinc-50 p-3"
                >
                  <input type="hidden" name="tipo" value="uso" />
                  <div className="text-sm font-semibold">
                    Lançar uso (estoque: {qtd(estoque)} {unidade(mat.unidade)})
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="rotulo">Data</label>
                      <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Quantidade ({unidade(mat.unidade)})</label>
                      <input name="quantidade" inputMode="decimal" required className="campo" />
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Obra (opcional)</label>
                      <select name="obraId" defaultValue="" className="campo">
                        <option value="">— Nenhuma —</option>
                        {obras.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.nome}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Descrição (opcional)</label>
                      <input name="descricao" className="campo" />
                    </div>
                  </div>
                  <button className="botao mt-3 w-full">Lançar uso</button>
                </form>

                <details className="mt-3">
                  <summary className="text-sm font-semibold text-blue-700">
                    Editar material
                  </summary>
                  <form method="post" action={`/api/materiais/${mat.id}`} className="mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="rotulo">Nome</label>
                        <input name="nome" defaultValue={mat.nome} required className="campo" />
                      </div>
                      <div>
                        <label className="rotulo">Unidade</label>
                        <select name="unidade" defaultValue={mat.unidade} className="campo">
                          {UNIDADES_MATERIAL.map((u) => (
                            <option key={u} value={u}>
                              {unidade(u)}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <button className="botao mt-3 w-full">Salvar material</button>
                  </form>
                </details>

                {mat.movimentos.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">Histórico</div>
                    <ul className="mt-1 divide-y divide-zinc-100">
                      {mat.movimentos.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 py-2 text-sm">
                          <span className="text-zinc-500">{dataBR(m.data)}</span>
                          <span className="flex-1">
                            {m.tipo === "compra"
                              ? `Compra ${qtd(m.quantidade)} ${unidade(mat.unidade)} × ${moeda(m.precoUnitario ?? 0)}`
                              : `Uso ${qtd(m.quantidade)} ${unidade(mat.unidade)}${m.obra ? ` — ${m.obra.nome}` : ""}`}
                            {m.descricao ? ` · ${m.descricao}` : ""}
                          </span>
                          {m.tipo === "compra" && (
                            <span className="font-semibold">
                              {moeda(m.quantidade * (m.precoUnitario ?? 0))}
                            </span>
                          )}
                          <FormPost
                            action={`/api/movimentos-material/${m.id}/excluir`}
                            confirmar="Excluir este lançamento?"
                          >
                            <button
                              className="rounded-md px-2 py-1 text-red-600"
                              aria-label="Excluir lançamento"
                            >
                              ✕
                            </button>
                          </FormPost>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
