import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra, valorMedidoAprovado } from "@/lib/calc";
import { dataBR, hojeISO, moeda } from "@/lib/format";
import FormPost from "@/components/FormPost";

export default async function PaginaRecebimentos({
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
  const [recebimentos, medido] = await Promise.all([
    prisma.recebimento.findMany({
      where: { obraId: obra.id },
      orderBy: [{ data: "desc" }, { id: "desc" }],
    }),
    valorMedidoAprovado(obra.id),
  ]);
  const recebido = recebimentos.reduce((s, r) => s + r.valor, 0);
  const aReceber = medido - recebido;

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Recebimentos do cliente</h1>

      {sp.ok && <p className="aviso-ok">Salvo.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <div className="mb-3 grid grid-cols-3 gap-2">
        <div className="cartao p-3">
          <div className="text-xs text-zinc-500">Medido (aprovado)</div>
          <div className="mt-1 text-sm font-bold">{moeda(medido)}</div>
        </div>
        <div className="cartao p-3">
          <div className="text-xs text-zinc-500">Recebido</div>
          <div className="mt-1 text-sm font-bold text-green-700">{moeda(recebido)}</div>
        </div>
        <div className="cartao p-3">
          <div className="text-xs text-zinc-500">A receber</div>
          <div
            className={`mt-1 text-sm font-bold ${
              aReceber > 0 ? "text-amber-700" : "text-green-700"
            }`}
          >
            {moeda(aReceber)}
          </div>
        </div>
      </div>

      <form method="post" action="/api/recebimentos" className="cartao mb-4">
        <input type="hidden" name="obraId" value={obra.id} />
        <div className="text-sm font-semibold">Registrar recebimento</div>
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
            <input
              name="descricao"
              className="campo"
              placeholder="Ex.: Pagamento da medição nº 1"
            />
          </div>
        </div>
        <button className="botao mt-3 w-full">Registrar</button>
      </form>

      {recebimentos.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhum recebimento registrado.</p>
      )}

      <div className="space-y-3">
        {recebimentos.map((r) => (
          <div key={r.id} className="cartao flex items-center gap-3">
            <div className="flex-1">
              <div className="font-semibold">{moeda(r.valor)}</div>
              <div className="text-sm text-zinc-500">
                {dataBR(r.data)}
                {r.descricao ? ` · ${r.descricao}` : ""}
              </div>
            </div>
            <FormPost
              action={`/api/recebimentos/${r.id}/excluir`}
              confirmar="Excluir este recebimento?"
            >
              <button className="rounded-md px-2 py-1 text-red-600" aria-label="Excluir">
                ✕
              </button>
            </FormPost>
          </div>
        ))}
      </div>
    </div>
  );
}
