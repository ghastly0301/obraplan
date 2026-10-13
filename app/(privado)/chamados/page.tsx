import type { Chamado, Usuario } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ehAdmin, exigirSessao } from "@/lib/auth";
import { dataBR, PRIORIDADES, STATUS_CHAMADO, TELAS_SISTEMA } from "@/lib/format";
import FormPost from "@/components/FormPost";

type ChamadoComAutor = Chamado & { usuario: Usuario };

const ERROS: Record<string, string> = {
  campos: "Preencha o título, a descrição e a prioridade.",
  permissao: "Você não tem permissão para esta ação.",
  transicao: "Ação não permitida para o status atual do chamado.",
};

function CamposChamado({ chamado }: { chamado?: Chamado }) {
  return (
    <div className="grid grid-cols-1 gap-3">
      <div>
        <label className="rotulo">O que aconteceu? (título)</label>
        <input
          name="titulo"
          defaultValue={chamado?.titulo}
          required
          placeholder="Ex.: Total da medição some ao salvar"
          className="campo"
        />
      </div>
      <div>
        <label className="rotulo">Descrição do chamado</label>
        <textarea
          name="descricao"
          defaultValue={chamado?.descricao}
          required
          rows={4}
          placeholder="Conte o que você fez, o que esperava e o que aconteceu."
          className="campo"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="rotulo">Tela onde ocorreu</label>
          <select name="tela" defaultValue={chamado?.tela ?? ""} className="campo">
            <option value="">— Não informar —</option>
            {TELAS_SISTEMA.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="rotulo">Prioridade</label>
          <select
            name="prioridade"
            defaultValue={chamado?.prioridade ?? "media"}
            className="campo"
          >
            {Object.entries(PRIORIDADES).map(([valor, p]) => (
              <option key={valor} value={valor}>
                {p.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function CartaoChamado({
  chamado,
  admin,
  usuarioId,
}: {
  chamado: ChamadoComAutor;
  admin: boolean;
  usuarioId: number;
}) {
  const st = STATUS_CHAMADO[chamado.status] ?? STATUS_CHAMADO.aberto;
  const pr = PRIORIDADES[chamado.prioridade] ?? PRIORIDADES.media;
  const souAutor = chamado.usuarioId === usuarioId;
  const podeEditar = admin || (souAutor && chamado.status !== "resolvido");
  const podeExcluir = admin || (souAutor && chamado.status === "aberto");

  return (
    <div
      className={`cartao ${
        chamado.status === "aberto"
          ? "border-amber-300"
          : chamado.status === "resolvido"
            ? "opacity-75"
            : "border-blue-300"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold leading-snug">{chamado.titulo}</div>
          <div className="mt-0.5 text-xs text-zinc-500">
            #{chamado.id} · {dataBR(chamado.criadoEm)}
            {admin ? ` · ${chamado.usuario.nome}` : ""}
            {chamado.tela ? ` · ${chamado.tela}` : ""}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`badge ${st.cor}`}>{st.rotulo}</span>
          <span className={`badge ${pr.cor}`}>{pr.rotulo}</span>
        </div>
      </div>

      <p className="mt-2 whitespace-pre-wrap text-sm">{chamado.descricao}</p>

      {chamado.resposta && (
        <div className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">
          <div className="font-semibold">Resposta do suporte</div>
          <p className="mt-0.5 whitespace-pre-wrap">{chamado.resposta}</p>
          {chamado.resolvidoEm && (
            <div className="mt-1 text-xs text-blue-700">
              Resolvido em {dataBR(chamado.resolvidoEm)}
            </div>
          )}
        </div>
      )}

      {admin && (
        <form
          method="post"
          action={`/api/chamados/${chamado.id}/status`}
          className="mt-3 rounded-lg bg-zinc-50 p-3"
        >
          <label className="rotulo">Resposta ao empreiteiro</label>
          <textarea
            name="resposta"
            defaultValue={chamado.resposta ?? ""}
            rows={2}
            placeholder="O que foi feito ou o que falta…"
            className="campo"
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {chamado.status === "aberto" && (
              <button name="acao" value="analisar" className="botao-claro h-11 px-4 text-sm">
                🔎 Pôr em análise
              </button>
            )}
            {chamado.status !== "resolvido" && (
              <button
                name="acao"
                value="resolver"
                className="h-11 rounded-lg bg-green-700 px-4 text-sm font-semibold text-white active:bg-green-900"
              >
                ✅ Resolver
              </button>
            )}
            {chamado.status !== "aberto" && (
              <button name="acao" value="reabrir" className="botao-claro h-11 px-4 text-sm">
                Reabrir
              </button>
            )}
          </div>
        </form>
      )}

      {(podeEditar || podeExcluir) && (
        <details className="mt-2">
          <summary className="text-sm font-semibold text-blue-700">
            {podeEditar ? "Editar chamado" : "Opções"}
          </summary>
          {podeEditar && (
            <form method="post" action={`/api/chamados/${chamado.id}`} className="mt-3">
              <CamposChamado chamado={chamado} />
              <button className="botao mt-3 w-full">Salvar alterações</button>
            </form>
          )}
          {podeExcluir && (
            <FormPost
              action={`/api/chamados/${chamado.id}/excluir`}
              confirmar="Excluir este chamado?"
              className="mt-2"
            >
              <button className="botao-claro w-full text-red-600">
                {admin ? "Excluir chamado" : "Cancelar meu chamado"}
              </button>
            </FormPost>
          )}
        </details>
      )}
    </div>
  );
}

function Grupo({
  titulo,
  lista,
  admin,
  usuarioId,
  vazio,
}: {
  titulo: string;
  lista: ChamadoComAutor[];
  admin: boolean;
  usuarioId: number;
  vazio?: string;
}) {
  return (
    <section className="mb-5">
      <h2 className="mb-2 text-base font-semibold text-zinc-700">
        {titulo} ({lista.length})
      </h2>
      {lista.length === 0 ? (
        <p className="cartao text-sm text-zinc-500">{vazio ?? "Nada aqui."}</p>
      ) : (
        <div className="space-y-3">
          {lista.map((c) => (
            <CartaoChamado key={c.id} chamado={c} admin={admin} usuarioId={usuarioId} />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function PaginaChamados({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  const usuario = await exigirSessao();
  const admin = ehAdmin(usuario);
  const sp = await searchParams;

  // O administrador vê todos os chamados; o empreiteiro, apenas os seus.
  const chamados = await prisma.chamado.findMany({
    where: admin ? {} : { usuarioId: usuario.id },
    include: { usuario: true },
    orderBy: [{ criadoEm: "desc" }],
  });

  const abertos = chamados.filter((c) => c.status === "aberto");
  const emAnalise = chamados.filter((c) => c.status === "em_analise");
  const resolvidos = chamados.filter((c) => c.status === "resolvido");

  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2">
        <h1 className="text-xl font-bold">
          {admin ? "Chamados de suporte" : "Suporte"}
        </h1>
        {admin && <span className="badge bg-blue-100 text-blue-800">Administrador</span>}
      </div>
      <p className="mb-3 text-sm text-zinc-500">
        {admin
          ? "Problemas do sistema relatados pelos empreiteiros. Responda e marque como resolvido."
          : "Encontrou um erro ou dificuldade no ObraPlan? Abra um chamado que o suporte resolve."}
      </p>

      {sp.ok === "aberto" && (
        <p className="aviso-ok">
          Chamado aberto. O suporte vai analisar e responder por aqui.
        </p>
      )}
      {sp.ok && sp.ok !== "aberto" && <p className="aviso-ok">Salvo.</p>}
      {sp.erro && ERROS[sp.erro] && <p className="aviso-erro">{ERROS[sp.erro]}</p>}

      <details className="cartao mb-4" open={chamados.length === 0}>
        <summary className="font-semibold text-blue-700">
          + Abrir chamado {admin ? "(em nome próprio)" : ""}
        </summary>
        <form method="post" action="/api/chamados" className="mt-3">
          <CamposChamado />
          <button className="botao mt-3 w-full">Abrir chamado</button>
        </form>
      </details>

      <Grupo
        titulo="Abertos"
        lista={abertos}
        admin={admin}
        usuarioId={usuario.id}
        vazio={admin ? "Nenhum chamado aberto. 👍" : "Você não tem chamados abertos."}
      />
      {(emAnalise.length > 0 || admin) && (
        <Grupo
          titulo="Em análise"
          lista={emAnalise}
          admin={admin}
          usuarioId={usuario.id}
          vazio="Nenhum chamado em análise."
        />
      )}
      {resolvidos.length > 0 && (
        <Grupo
          titulo="Resolvidos"
          lista={resolvidos}
          admin={admin}
          usuarioId={usuario.id}
        />
      )}
    </div>
  );
}
