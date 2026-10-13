import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { jaMedidoPorServico, obterObra } from "@/lib/calc";
import { dataBR, STATUS_MEDICAO } from "@/lib/format";
import FormPost from "@/components/FormPost";
import EditorMedicao, { type ItemEditor } from "./EditorMedicao";

const ERROS: Record<string, string> = {
  travada: "Medição aprovada está travada e não pode ser alterada.",
  saldo: "Quantidade acima do saldo disponível",
  valor: "Quantidade inválida",
  transicao: "Ação não permitida para o status atual da medição.",
};

export default async function PaginaMedicao({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; mid: string }>;
  searchParams: Promise<{ ok?: string; erro?: string; s?: string }>;
}) {
  await exigirSessao();
  const { id, mid } = await params;
  const sp = await searchParams;
  const obra = await obterObra(id);

  const medicao = await prisma.medicao.findUnique({
    where: { id: Number(mid) },
    include: { itens: true },
  });
  if (!medicao || medicao.obraId !== obra.id) notFound();

  const servicos = await prisma.servico.findMany({
    where: { obraId: obra.id },
    orderBy: { codigo: "asc" },
  });
  const jaMedido = await jaMedidoPorServico(obra.id, medicao.id);

  const itens: ItemEditor[] = servicos.map((s) => ({
    servicoId: s.id,
    codigo: s.codigo,
    descricao: s.descricao,
    unidade: s.unidade,
    quantidade: s.quantidade,
    precoUnitario: s.precoUnitario,
    jaMedido: jaMedido.get(s.id) ?? 0,
    inicial:
      medicao.itens.find((i) => i.servicoId === s.id)?.quantidadeExecutada ?? 0,
  }));

  const st = STATUS_MEDICAO[medicao.status] ?? STATUS_MEDICAO.rascunho;
  const editavel = medicao.status !== "aprovada";

  return (
    <div>
      <Link
        href={`/obra/${obra.id}/medicoes`}
        className="text-sm font-medium text-blue-700"
      >
        ← Medições · {obra.nome}
      </Link>
      <div className="mt-1 flex items-start justify-between gap-2">
        <h1 className="text-xl font-bold">Medição nº {medicao.numero}</h1>
        <span className={`badge ${st.cor}`}>{st.rotulo}</span>
      </div>
      <p className="mb-3 text-sm text-zinc-500">
        Período: {dataBR(medicao.periodoInicio)} a {dataBR(medicao.periodoFim)}
      </p>

      {sp.ok && <p className="aviso-ok">Medição salva.</p>}
      {sp.erro && ERROS[sp.erro] && (
        <p className="aviso-erro">
          {ERROS[sp.erro]}
          {(sp.erro === "saldo" || sp.erro === "valor") && sp.s
            ? ` no serviço ${sp.s}.`
            : ""}
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        <Link
          href={`/obra/${obra.id}/medicao/${medicao.id}/imprimir`}
          className="botao-claro h-11 px-4 text-sm"
        >
          🖨️ Imprimir
        </Link>
        {medicao.status === "rascunho" && (
          <FormPost action={`/api/medicoes/${medicao.id}/status`}>
            <input type="hidden" name="acao" value="enviar" />
            <button className="botao-claro h-11 px-4 text-sm">
              📤 Enviar para aprovação
            </button>
          </FormPost>
        )}
        {medicao.status === "enviada" && (
          <>
            <FormPost
              action={`/api/medicoes/${medicao.id}/status`}
              confirmar="Aprovar a medição? Depois de aprovada ela não poderá mais ser editada."
            >
              <input type="hidden" name="acao" value="aprovar" />
              <button className="h-11 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white active:bg-green-900">
                ✅ Aprovar
              </button>
            </FormPost>
            <FormPost action={`/api/medicoes/${medicao.id}/status`}>
              <input type="hidden" name="acao" value="reabrir" />
              <button className="botao-claro h-11 px-4 text-sm">
                Voltar a rascunho
              </button>
            </FormPost>
          </>
        )}
      </div>

      {!editavel && (
        <p className="aviso-ok">
          Medição aprovada: os itens estão travados e não podem ser alterados.
        </p>
      )}

      {itens.length === 0 ? (
        <p className="cartao text-sm text-zinc-500">
          Esta obra ainda não tem serviços no orçamento.{" "}
          <Link href={`/obra/${obra.id}/orcamento`} className="font-medium text-blue-700">
            Montar orçamento
          </Link>
        </p>
      ) : (
        <EditorMedicao
          medicaoId={medicao.id}
          editavel={editavel}
          observacoes={medicao.observacoes ?? ""}
          itens={itens}
        />
      )}
    </div>
  );
}
