import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra, valorMedicao } from "@/lib/calc";
import { dataBR, hojeISO, moeda, STATUS_MEDICAO } from "@/lib/format";

export default async function PaginaMedicoes({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  await exigirSessao();
  const { id } = await params;
  const sp = await searchParams;
  const obra = await obterObra(id);
  const medicoes = await prisma.medicao.findMany({
    where: { obraId: obra.id },
    include: { itens: { include: { servico: true } } },
    orderBy: { numero: "desc" },
  });

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Medições</h1>

      {sp.erro === "periodo" && (
        <p className="aviso-erro">Informe um período válido (início até fim).</p>
      )}

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Nova medição</summary>
        <form method="post" action="/api/medicoes" className="mt-3">
          <input type="hidden" name="obraId" value={obra.id} />
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="rotulo">Início do período</label>
              <input type="date" name="periodoInicio" required className="campo" defaultValue={hojeISO()} />
            </div>
            <div>
              <label className="rotulo">Fim do período</label>
              <input type="date" name="periodoFim" required className="campo" defaultValue={hojeISO()} />
            </div>
          </div>
          <button className="botao mt-3 w-full">Criar medição</button>
        </form>
      </details>

      {medicoes.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhuma medição ainda.</p>
      )}

      <div className="space-y-3">
        {medicoes.map((m) => {
          const st = STATUS_MEDICAO[m.status] ?? STATUS_MEDICAO.rascunho;
          return (
            <Link
              key={m.id}
              href={`/obra/${obra.id}/medicao/${m.id}`}
              className="cartao block active:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">Medição nº {m.numero}</div>
                  <div className="text-sm text-zinc-500">
                    {dataBR(m.periodoInicio)} a {dataBR(m.periodoFim)}
                  </div>
                </div>
                <span className={`badge ${st.cor}`}>{st.rotulo}</span>
              </div>
              <div className="mt-2 text-right text-lg font-bold">
                {moeda(valorMedicao(m.itens))}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
