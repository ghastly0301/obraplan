import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import FormObra from "@/components/FormObra";
import FormCliente from "@/components/FormCliente";

export default async function PaginaNovaObra({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; erro?: string }>;
}) {
  await exigirSessao();
  const sp = await searchParams;
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });

  return (
    <div>
      <Link href="/" className="text-sm font-medium text-blue-700">
        ← Minhas obras
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Nova obra</h1>

      {sp.ok && <p className="aviso-ok">Cliente adicionado. Agora selecione na lista.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <details className="cartao mb-3" open={clientes.length === 0}>
        <summary className="font-semibold text-blue-700">+ Novo cliente</summary>
        <div className="mt-3">
          <FormCliente voltar="/obras/nova" />
        </div>
      </details>

      <FormObra action="/api/obras" clientes={clientes} />
    </div>
  );
}
