import Link from "next/link";
import { exigirSessao } from "@/lib/auth";
import { obterObra, resumoObra } from "@/lib/calc";
import { dataBR, moeda, percentual, STATUS_OBRA } from "@/lib/format";

const ATALHOS = [
  { href: "diario", emoji: "📒", rotulo: "Diário" },
  { href: "fotos", emoji: "📷", rotulo: "Fotos" },
  { href: "medicoes", emoji: "📏", rotulo: "Medições" },
  { href: "orcamento", emoji: "🧾", rotulo: "Orçamento" },
  { href: "recebimentos", emoji: "💰", rotulo: "Recebimentos" },
  { href: "editar", emoji: "✏️", rotulo: "Editar obra" },
];

export default async function PainelObra({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await exigirSessao();
  const { id } = await params;
  const obra = await obterObra(id);
  const r = await resumoObra(obra.id);
  const st = STATUS_OBRA[obra.status] ?? STATUS_OBRA.planejada;

  return (
    <div>
      <Link href="/" className="text-sm font-medium text-blue-700">
        ← Minhas obras
      </Link>
      <div className="mt-1 flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold leading-snug">{obra.nome}</h1>
        <span className={`badge ${st.cor}`}>{st.rotulo}</span>
      </div>
      <p className="mt-1 text-sm text-zinc-500">
        {obra.cliente.nome} · {obra.endereco}
      </p>
      <p className="text-sm text-zinc-500">
        Início {dataBR(obra.dataInicio)} · Prazo {obra.prazoDias} dias
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="cartao">
          <div className="text-xs text-zinc-500">Valor do contrato</div>
          <div className="mt-1 text-lg font-bold">{moeda(obra.valorContrato)}</div>
        </div>
        <div className="cartao">
          <div className="text-xs text-zinc-500">Medido (aprovado)</div>
          <div className="mt-1 text-lg font-bold text-green-700">{moeda(r.medido)}</div>
        </div>
        <div className="cartao">
          <div className="text-xs text-zinc-500">% físico executado</div>
          <div className="mt-1 text-lg font-bold">{percentual(r.perc)}</div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-zinc-200">
            <div
              className="h-full rounded-full bg-green-600"
              style={{ width: `${Math.min(100, r.perc)}%` }}
            />
          </div>
        </div>
        <div className="cartao">
          <div className="text-xs text-zinc-500">Saldo a medir</div>
          <div className="mt-1 text-lg font-bold">{moeda(r.saldo)}</div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3">
        {ATALHOS.map((a) => (
          <Link
            key={a.href}
            href={`/obra/${obra.id}/${a.href}`}
            className="cartao flex h-24 flex-col items-center justify-center gap-1 text-center active:bg-zinc-50"
          >
            <span className="text-3xl">{a.emoji}</span>
            <span className="font-semibold">{a.rotulo}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
