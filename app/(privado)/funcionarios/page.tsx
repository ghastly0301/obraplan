import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { saldoFuncionario } from "@/lib/calc";
import { dataBR, hojeISO, moeda, numeroParaInput, qtd } from "@/lib/format";
import FormPost from "@/components/FormPost";

export default async function PaginaFuncionarios({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirSessao();
  const sp = await searchParams;
  const funcionarios = await prisma.funcionario.findMany({
    include: { movimentos: { orderBy: [{ data: "desc" }, { id: "desc" }] } },
    orderBy: { nome: "asc" },
  });

  const totalAReceber = funcionarios.reduce(
    (soma, f) => soma + saldoFuncionario(f.movimentos),
    0
  );

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Funcionários</h1>

      {sp.ok && <p className="aviso-ok">Salvo.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <div className="mb-3 grid grid-cols-2 gap-3">
        <div className="cartao">
          <div className="text-xs text-zinc-500">Funcionários</div>
          <div className="mt-1 text-lg font-bold">{funcionarios.length}</div>
        </div>
        <div className="cartao">
          <div className="text-xs text-zinc-500">Total a receber</div>
          <div
            className={`mt-1 text-lg font-bold ${
              totalAReceber > 0 ? "text-amber-700" : "text-green-700"
            }`}
          >
            {moeda(totalAReceber)}
          </div>
        </div>
      </div>

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Novo funcionário</summary>
        <form method="post" action="/api/funcionarios" className="mt-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className="rotulo">Nome</label>
              <input name="nome" required className="campo" />
            </div>
            <div>
              <label className="rotulo">Função</label>
              <input name="funcao" required placeholder="Pedreiro" className="campo" />
            </div>
            <div>
              <label className="rotulo">Diária (R$)</label>
              <input name="diaria" inputMode="decimal" required className="campo" />
            </div>
          </div>
          <button className="botao mt-3 w-full">Adicionar</button>
        </form>
      </details>

      {funcionarios.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhum funcionário cadastrado.</p>
      )}

      <div className="space-y-3">
        {funcionarios.map((f) => {
          const aReceber = saldoFuncionario(f.movimentos);
          return (
            <div key={f.id} className="cartao">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{f.nome}</div>
                  <div className="text-sm text-zinc-500">
                    {f.funcao} · diária {moeda(f.diaria)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500">A receber</div>
                  <div
                    className={`font-bold ${
                      aReceber > 0 ? "text-amber-700" : "text-green-700"
                    }`}
                  >
                    {moeda(aReceber)}
                  </div>
                </div>
              </div>

              <details className="mt-2">
                <summary className="text-sm font-semibold text-blue-700">
                  Lançamentos e edição
                </summary>

                <form
                  method="post"
                  action={`/api/funcionarios/${f.id}/movimentos`}
                  className="mt-3 rounded-lg bg-zinc-50 p-3"
                >
                  <input type="hidden" name="tipo" value="trabalho" />
                  <div className="text-sm font-semibold">Lançar dias trabalhados</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="rotulo">Data</label>
                      <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Dias</label>
                      <input name="dias" inputMode="decimal" required placeholder="1" className="campo" />
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Descrição (opcional)</label>
                      <input name="descricao" className="campo" placeholder="Semana, obra…" />
                    </div>
                  </div>
                  <button className="botao mt-3 w-full">
                    Lançar (dias × {moeda(f.diaria)})
                  </button>
                </form>

                <form
                  method="post"
                  action={`/api/funcionarios/${f.id}/movimentos`}
                  className="mt-3 rounded-lg bg-zinc-50 p-3"
                >
                  <input type="hidden" name="tipo" value="pagamento" />
                  <div className="text-sm font-semibold">Registrar pagamento</div>
                  <div className="mt-2 grid grid-cols-2 gap-3">
                    <div>
                      <label className="rotulo">Data</label>
                      <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
                    </div>
                    <div>
                      <label className="rotulo">Valor (R$)</label>
                      <input name="valor" inputMode="decimal" required className="campo" />
                    </div>
                    <div className="col-span-2">
                      <label className="rotulo">Descrição (opcional)</label>
                      <input name="descricao" className="campo" placeholder="Adiantamento, acerto…" />
                    </div>
                  </div>
                  <button className="botao mt-3 w-full">Registrar pagamento</button>
                </form>

                <details className="mt-3">
                  <summary className="text-sm font-semibold text-blue-700">
                    Editar cadastro
                  </summary>
                  <form method="post" action={`/api/funcionarios/${f.id}`} className="mt-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="rotulo">Nome</label>
                        <input name="nome" defaultValue={f.nome} required className="campo" />
                      </div>
                      <div>
                        <label className="rotulo">Função</label>
                        <input name="funcao" defaultValue={f.funcao} required className="campo" />
                      </div>
                      <div>
                        <label className="rotulo">Diária (R$)</label>
                        <input
                          name="diaria"
                          inputMode="decimal"
                          defaultValue={numeroParaInput(f.diaria)}
                          required
                          className="campo"
                        />
                      </div>
                    </div>
                    <button className="botao mt-3 w-full">Salvar cadastro</button>
                  </form>
                </details>

                {f.movimentos.length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-semibold">Histórico</div>
                    <ul className="mt-1 divide-y divide-zinc-100">
                      {f.movimentos.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 py-2 text-sm">
                          <span className="text-zinc-500">{dataBR(m.data)}</span>
                          <span className="flex-1">
                            {m.tipo === "trabalho"
                              ? `Trabalho — ${qtd(m.dias ?? 0)} dia${(m.dias ?? 0) === 1 ? "" : "s"}`
                              : "Pagamento"}
                            {m.descricao ? ` · ${m.descricao}` : ""}
                          </span>
                          <span
                            className={`font-semibold ${
                              m.tipo === "trabalho" ? "text-zinc-800" : "text-green-700"
                            }`}
                          >
                            {m.tipo === "trabalho" ? "+" : "−"}
                            {moeda(m.valor)}
                          </span>
                          <FormPost
                            action={`/api/movimentos-funcionario/${m.id}/excluir`}
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
