import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra, valorMedicao } from "@/lib/calc";
import { dataBR, moeda, qtd, STATUS_MEDICAO, unidade } from "@/lib/format";
import { valorPorExtenso } from "@/lib/extenso";
import BotaoImprimir from "@/components/BotaoImprimir";

export default async function FolhaDeMedicao({
  params,
}: {
  params: Promise<{ id: string; mid: string }>;
}) {
  const usuario = await exigirSessao();
  const { id, mid } = await params;
  const obra = await obterObra(id);

  const medicao = await prisma.medicao.findUnique({
    where: { id: Number(mid) },
    include: { itens: { include: { servico: true } } },
  });
  if (!medicao || medicao.obraId !== obra.id) notFound();

  const itens = medicao.itens
    .filter((i) => i.quantidadeExecutada > 0)
    .sort((a, b) => a.servico.codigo.localeCompare(b.servico.codigo));
  const total = valorMedicao(itens);
  const st = STATUS_MEDICAO[medicao.status] ?? STATUS_MEDICAO.rascunho;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2 print:hidden">
        <Link
          href={`/obra/${obra.id}/medicao/${medicao.id}`}
          className="botao-claro"
        >
          ← Voltar
        </Link>
        <BotaoImprimir />
      </div>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm print:rounded-none print:border-0 print:p-0 print:shadow-none">
        <div className="flex items-start justify-between border-b-2 border-zinc-800 pb-3">
          <div>
            <div className="text-xl font-bold">FOLHA DE MEDIÇÃO Nº {medicao.numero}</div>
            <div className="text-sm text-zinc-600">ObraPlan — Gestão de obras</div>
          </div>
          <div className="text-right text-sm">
            <div className="font-semibold">{st.rotulo}</div>
            <div className="text-zinc-600">Emitida em {dataBR(new Date())}</div>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-1 gap-1 text-sm sm:grid-cols-2">
          <div>
            <span className="font-semibold">Obra:</span> {obra.nome}
          </div>
          <div>
            <span className="font-semibold">Contratante:</span> {obra.cliente.nome}
            {obra.cliente.documento ? ` (${obra.cliente.documento})` : ""}
          </div>
          <div>
            <span className="font-semibold">Endereço:</span> {obra.endereco}
          </div>
          <div>
            <span className="font-semibold">Período:</span>{" "}
            {dataBR(medicao.periodoInicio)} a {dataBR(medicao.periodoFim)}
          </div>
        </div>

        {medicao.status !== "aprovada" && (
          <p className="mt-2 text-sm font-medium text-amber-700">
            Documento em {st.rotulo.toLowerCase()} — sujeito a alteração.
          </p>
        )}

        <table className="mt-4 w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-zinc-800 text-left">
              <th className="py-1.5 pr-2">Código</th>
              <th className="py-1.5 pr-2">Descrição do serviço</th>
              <th className="py-1.5 pr-2">Un.</th>
              <th className="py-1.5 pr-2 text-right">Qtd. medida</th>
              <th className="py-1.5 pr-2 text-right">Preço unit.</th>
              <th className="py-1.5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {itens.length === 0 && (
              <tr>
                <td colSpan={6} className="py-3 text-center text-zinc-500">
                  Nenhum item medido neste período.
                </td>
              </tr>
            )}
            {itens.map((i) => (
              <tr key={i.id} className="border-b border-zinc-300 align-top">
                <td className="py-1.5 pr-2 whitespace-nowrap">{i.servico.codigo}</td>
                <td className="py-1.5 pr-2">{i.servico.descricao}</td>
                <td className="py-1.5 pr-2">{unidade(i.servico.unidade)}</td>
                <td className="py-1.5 pr-2 text-right">{qtd(i.quantidadeExecutada)}</td>
                <td className="py-1.5 pr-2 text-right whitespace-nowrap">
                  {moeda(i.servico.precoUnitario)}
                </td>
                <td className="py-1.5 text-right whitespace-nowrap font-medium">
                  {moeda(i.quantidadeExecutada * i.servico.precoUnitario)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-b-2 border-zinc-800">
              <td colSpan={5} className="py-2 pr-2 text-right font-bold">
                TOTAL DA MEDIÇÃO
              </td>
              <td className="py-2 text-right text-base font-bold whitespace-nowrap">
                {moeda(total)}
              </td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-2 text-sm italic text-zinc-700">
          Valor por extenso: {valorPorExtenso(total)}.
        </p>

        {medicao.observacoes && (
          <p className="mt-3 text-sm">
            <span className="font-semibold">Observações:</span> {medicao.observacoes}
          </p>
        )}

        <div className="mt-20 grid grid-cols-2 gap-10 text-center text-sm">
          <div>
            <div className="border-t border-zinc-700 pt-2 font-medium">
              {usuario.nome}
            </div>
            <div className="text-zinc-600">Empreiteiro</div>
          </div>
          <div>
            <div className="border-t border-zinc-700 pt-2 font-medium">
              {obra.cliente.nome}
            </div>
            <div className="text-zinc-600">Contratante</div>
          </div>
        </div>
      </div>
    </div>
  );
}
