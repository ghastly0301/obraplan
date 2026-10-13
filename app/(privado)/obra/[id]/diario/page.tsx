import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra } from "@/lib/calc";
import { CLIMAS, EMOJI_CLIMA, hojeISO } from "@/lib/format";

function SelectClima({ nome, rotulo }: { nome: string; rotulo: string }) {
  return (
    <div>
      <label className="rotulo">{rotulo}</label>
      <select name={nome} className="campo" defaultValue="Sol">
        {CLIMAS.map((c) => (
          <option key={c} value={c}>
            {EMOJI_CLIMA[c]} {c}
          </option>
        ))}
      </select>
    </div>
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

      {sp.ok && <p className="aviso-ok">Diário salvo.</p>}
      {sp.erro === "duplicado" && (
        <p className="aviso-erro">Já existe um diário desta obra nessa data.</p>
      )}
      {sp.erro === "campos" && (
        <p className="aviso-erro">Preencha os campos corretamente.</p>
      )}

      <form method="post" action="/api/diarios" className="cartao mb-4">
        <input type="hidden" name="obraId" value={obra.id} />
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="rotulo">Data</label>
            <input type="date" name="data" required defaultValue={hojeISO()} className="campo" />
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
              className="campo"
            />
          </div>
          <SelectClima nome="climaManha" rotulo="Clima manhã" />
          <SelectClima nome="climaTarde" rotulo="Clima tarde" />
          <div className="col-span-2">
            <label className="rotulo">Atividades do dia</label>
            <textarea
              name="atividades"
              rows={3}
              required
              placeholder="O que foi feito hoje?"
              className="campo"
            />
          </div>
          <div className="col-span-2">
            <label className="rotulo">Ocorrências (opcional)</label>
            <textarea
              name="ocorrencias"
              rows={2}
              placeholder="Chuva, falta de material, acidente…"
              className="campo"
            />
          </div>
        </div>
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
          </div>
        ))}
      </div>
    </div>
  );
}
