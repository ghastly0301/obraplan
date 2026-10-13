import Link from "next/link";
import type { Diario } from "@prisma/client";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra } from "@/lib/calc";
import { CLIMAS, EMOJI_CLIMA, hojeISO } from "@/lib/format";
import FormPost from "@/components/FormPost";

function SelectClima({
  nome,
  rotulo,
  valor,
}: {
  nome: string;
  rotulo: string;
  valor?: string;
}) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <select name={nome} className="campo" defaultValue={valor ?? "Sol"}>
        {CLIMAS.map((c) => (
          <option key={c} value={c}>
            {EMOJI_CLIMA[c]} {c}
          </option>
        ))}
      </select>
    </div>
  );
}

function CamposDiario({ d, obraId }: { d?: Diario; obraId: number }) {
  return (
    <>
      <input type="hidden" name="obraId" value={obraId} />
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Data</label>
          <input
            type="date"
            name="data"
            required
            defaultValue={d ? d.data.toISOString().slice(0, 10) : hojeISO()}
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Efetivo (pessoas)</label>
          <input
            type="number"
            name="efetivo"
            inputMode="numeric"
            min={0}
            step={1}
            required
            defaultValue={d?.efetivo}
            className="campo"
          />
        </div>
        <SelectClima nome="climaManha" rotulo="Clima manhã" valor={d?.climaManha} />
        <SelectClima nome="climaTarde" rotulo="Clima tarde" valor={d?.climaTarde} />
        <div className="col-span-2">
          <label className="rotulo">Atividades do dia</label>
          <textarea
            name="atividades"
            rows={3}
            required
            defaultValue={d?.atividades}
            placeholder="O que foi feito hoje?"
            className="campo"
          />
        </div>
        <div className="col-span-2">
          <label className="rotulo">Ocorrências (opcional)</label>
          <textarea
            name="ocorrencias"
            rows={2}
            defaultValue={d?.ocorrencias ?? ""}
            placeholder="Chuva, falta de material, acidente…"
            className="campo"
          />
        </div>
      </div>
    </>
  );
}

function dataLonga(d: Date) {
  const texto = d.toLocaleDateString("pt-BR", {
    timeZone: "UTC",
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

export default async function PaginaDiario({
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
  const diarios = await prisma.diario.findMany({
    where: { obraId: obra.id },
    orderBy: { data: "desc" },
  });

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Diário de obra</h1>

      {sp.ok && <p className="aviso-ok">Salvo.</p>}
      {sp.erro === "duplicado" && (
        <p className="aviso-erro">Já existe um diário desta obra nessa data.</p>
      )}
      {sp.erro === "campos" && (
        <p className="aviso-erro">Preencha os campos corretamente.</p>
      )}

      <form method="post" action="/api/diarios" className="cartao mb-4">
        <CamposDiario obraId={obra.id} />
        <button className="botao mt-3 w-full">Salvar diário</button>
      </form>

      <h2 className="mb-2 text-base font-semibold text-zinc-700">
        Diários anteriores
      </h2>
      {diarios.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhum diário lançado ainda.</p>
      )}
      <div className="space-y-3">
        {diarios.map((d) => (
          <div key={d.id} className="cartao">
            <div className="flex items-center justify-between gap-2">
              <div className="font-semibold">{dataLonga(d.data)}</div>
              <span className="badge bg-zinc-100 text-zinc-700">
                👷 {d.efetivo} {d.efetivo === 1 ? "pessoa" : "pessoas"}
              </span>
            </div>
            <div className="mt-1 text-sm text-zinc-600">
              Manhã {EMOJI_CLIMA[d.climaManha] ?? ""} {d.climaManha} · Tarde{" "}
              {EMOJI_CLIMA[d.climaTarde] ?? ""} {d.climaTarde}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm">{d.atividades}</p>
            {d.ocorrencias && (
              <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                ⚠️ {d.ocorrencias}
              </p>
            )}
            <details className="mt-2">
              <summary className="text-sm font-semibold text-blue-700">Editar</summary>
              <form method="post" action={`/api/diarios/${d.id}`} className="mt-3">
                <CamposDiario d={d} obraId={obra.id} />
                <button className="botao mt-3 w-full">Salvar alterações</button>
              </form>
              <FormPost
                action={`/api/diarios/${d.id}/excluir`}
                confirmar="Excluir este diário?"
                className="mt-2"
              >
                <button className="botao-claro w-full text-red-600">Excluir diário</button>
              </FormPost>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
