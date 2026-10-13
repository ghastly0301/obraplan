import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import FormCliente from "@/components/FormCliente";

export default async function PaginaClientes({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirSessao();
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({
    include: { obras: true },
    orderBy: { nome: "asc" },
  });

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">Clientes</h1>

      {sp.ok && <p className="aviso-ok">Cliente salvo.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Novo cliente</summary>
        <div className="mt-3">
          <FormCliente voltar="/clientes" />
        </div>
      </details>

      {clientes.length === 0 && (
        <p className="cartao text-sm text-zinc-500">Nenhum cliente cadastrado.</p>
      )}

      <div className="space-y-3">
        {clientes.map((c) => (
          <div key={c.id} className="cartao">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="font-semibold">{c.nome}</div>
                <div className="text-sm text-zinc-500">
                  {[c.documento, c.telefone, c.email].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <span className="badge bg-zinc-100 text-zinc-700">
                {c.obras.length} obra{c.obras.length === 1 ? "" : "s"}
              </span>
            </div>
            <details className="mt-2">
              <summary className="text-sm font-semibold text-blue-700">Editar</summary>
              <div className="mt-3">
                <FormCliente voltar="/clientes" cliente={c} />
              </div>
            </details>
          </div>
        ))}
      </div>
    </div>
  );
}
