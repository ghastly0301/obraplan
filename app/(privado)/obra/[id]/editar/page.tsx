import Link from "next/link";
import { prisma } from "@/lib/db";
import { exigirSessao } from "@/lib/auth";
import { obterObra } from "@/lib/calc";
import FormObra from "@/components/FormObra";
import FormCliente from "@/components/FormCliente";

export default async function PaginaEditarObra({
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
  const clientes = await prisma.cliente.findMany({ orderBy: { nome: "asc" } });

  return (
    <div>
      <Link href={`/obra/${obra.id}`} className="text-sm font-medium text-blue-700">
        ← {obra.nome}
      </Link>
      <h1 className="mb-3 mt-1 text-xl font-bold">Editar obra</h1>

      {sp.ok && <p className="aviso-ok">Cliente adicionado.</p>}
      {sp.erro === "campos" && <p className="aviso-erro">Preencha os campos corretamente.</p>}

      <details className="cartao mb-3">
        <summary className="font-semibold text-blue-700">+ Novo cliente</summary>
        <div className="mt-3">
          <FormCliente voltar={`/obra/${obra.id}/editar`} />
        </div>
      </details>

      <FormObra action={`/api/obras/${obra.id}`} obra={obra} clientes={clientes} />
    </div>
  );
}
