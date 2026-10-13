import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { resumoObra } from "@/lib/calc";
import { moeda, percentual, STATUS_OBRA } from "@/lib/format";

export default async function PaginaInicial() {
  await exigirSessao();
  const obras = await prisma.obra.findMany({
    include: { cliente: true },
    orderBy: { id: "asc" },
  });
  const resumos = await Promise.all(obras.map((o) => resumoObra(o.id)));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">Minhas obras</h1>
        <Link href="/obras/nova" className="botao h-11 px-4 text-sm">
          + Nova obra
        </Link>
      </div>
      {obras.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhuma obra cadastrada.</p>
      )}
      <div className="space-y-3">
        {obras.map((obra, i) => {
          const r = resumos[i];
          const st = STATUS_OBRA[obra.status] ?? STATUS_OBRA.planejada;
          return (
            <Link
              key={obra.id}
              href={`/obra/${obra.id}`}
              className="cartao block active:bg-zinc-50"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-lg font-semibold leading-snug">{obra.nome}</div>
                  <div className="text-sm text-zinc-500">{obra.cliente.nome}</div>
                </div>
                <span className={`badge ${st.cor}`}>{st.rotulo}</span>
              </div>
              <div className="mt-3">
                <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                  <div
                    className="h-full rounded-full bg-green-600"
                    style={{ width: `${Math.min(100, r.perc)}%` }}
                  />
                </div>
                <div className="mt-1 flex justify-between text-xs text-zinc-500">
                  <span>{percentual(r.perc)} executado</span>
                  <span>
                    {moeda(r.medido)} de {moeda(r.orcamento)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
