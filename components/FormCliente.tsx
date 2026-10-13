import type { Cliente } from "@prisma/client";

export default function FormCliente({
  voltar,
  cliente,
}: {
  voltar: string;
  cliente?: Cliente;
}) {
  const action = cliente ? `/api/clientes/${cliente.id}` : "/api/clientes";
  return (
    <form method="post" action={action}>
      <input type="hidden" name="voltar" value={voltar} />
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="rotulo">Nome</label>
          <input name="nome" defaultValue={cliente?.nome} required className="campo" />
        </div>
        <div>
          <label className="rotulo">CPF/CNPJ</label>
          <input name="documento" defaultValue={cliente?.documento} className="campo" />
        </div>
        <div>
          <label className="rotulo">Telefone</label>
          <input
            name="telefone"
            type="tel"
            defaultValue={cliente?.telefone}
            className="campo"
          />
        </div>
        <div className="col-span-2">
          <label className="rotulo">E-mail</label>
          <input name="email" type="email" defaultValue={cliente?.email} className="campo" />
        </div>
      </div>
      <button className="botao mt-3 w-full">
        {cliente ? "Salvar alterações" : "Adicionar cliente"}
      </button>
    </form>
  );
}
