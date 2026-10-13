import type { Cliente, Obra } from "@prisma/client";
import { numeroParaInput, hojeISO, STATUS_OBRA } from "@/lib/format";

export default function FormObra({
  action,
  obra,
  clientes,
}: {
  action: string;
  obra?: Obra;
  clientes: Cliente[];
}) {
  return (
    <form method="post" action={action} className="cartao">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="rotulo">Nome da obra</label>
          <input name="nome" defaultValue={obra?.nome} required className="campo" />
        </div>
        <div className="col-span-2">
          <label className="rotulo">Cliente</label>
          <select
            name="clienteId"
            defaultValue={obra?.clienteId ?? ""}
            required
            className="campo"
          >
            <option value="" disabled>
              Selecione…
            </option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div className="col-span-2">
          <label className="rotulo">Endereço</label>
          <input name="endereco" defaultValue={obra?.endereco} required className="campo" />
        </div>
        <div>
          <label className="rotulo">Data de início</label>
          <input
            type="date"
            name="dataInicio"
            required
            defaultValue={
              obra ? obra.dataInicio.toISOString().slice(0, 10) : hojeISO()
            }
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Prazo (dias)</label>
          <input
            type="number"
            name="prazoDias"
            inputMode="numeric"
            min={1}
            step={1}
            required
            defaultValue={obra?.prazoDias}
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Valor do contrato (R$)</label>
          <input
            name="valorContrato"
            inputMode="decimal"
            required
            defaultValue={obra ? numeroParaInput(obra.valorContrato) : ""}
            className="campo"
          />
        </div>
        <div>
          <label className="rotulo">Status</label>
          <select name="status" defaultValue={obra?.status ?? "planejada"} className="campo">
            {Object.entries(STATUS_OBRA).map(([valor, s]) => (
              <option key={valor} value={valor}>
                {s.rotulo}
              </option>
            ))}
          </select>
        </div>
      </div>
      <button className="botao mt-4 w-full">
        {obra ? "Salvar alterações" : "Criar obra"}
      </button>
    </form>
  );
}
