"use client";

import { useState } from "react";

export type ItemEditor = {
  servicoId: number;
  codigo: string;
  descricao: string;
  unidade: string;
  quantidade: number;
  precoUnitario: number;
  jaMedido: number;
  inicial: number;
};

const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtQtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });

const un = (u: string) => (u === "m2" ? "m²" : u === "m3" ? "m³" : u);

function parseQtd(s: string): number {
  if (!s.trim()) return 0;
  const n = s.includes(",")
    ? parseFloat(s.replace(/\./g, "").replace(",", "."))
    : parseFloat(s);
  return Number.isFinite(n) ? n : NaN;
}

function valorInicial(v: number) {
  return v > 0 ? String(v).replace(".", ",") : "";
}

export default function EditorMedicao({
  medicaoId,
  editavel,
  observacoes,
  itens,
}: {
  medicaoId: number;
  editavel: boolean;
  observacoes: string;
  itens: ItemEditor[];
}) {
  const [valores, setValores] = useState<Record<number, string>>(() =>
    Object.fromEntries(itens.map((i) => [i.servicoId, valorInicial(i.inicial)]))
  );

  let total = 0;
  let temErro = false;
  const linhas = itens.map((i) => {
    const q = parseQtd(valores[i.servicoId] ?? "");
    const saldo = i.quantidade - i.jaMedido;
    const invalido = Number.isNaN(q) || q < 0 || q > saldo + 1e-6;
    if (invalido) temErro = true;
    else total += q * i.precoUnitario;
    return { ...i, q, saldo, invalido };
  });

  return (
    <form
      method="post"
      action={`/api/medicoes/${medicaoId}/itens`}
      className={editavel ? "pb-28" : ""}
    >
      <div className="space-y-3">
        {linhas.map((l) => (
          <div
            key={l.servicoId}
            className={`cartao ${l.invalido ? "border-red-400 ring-1 ring-red-400" : ""}`}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="text-xs font-semibold text-zinc-500">{l.codigo}</div>
                <div className="font-medium leading-snug">{l.descricao}</div>
              </div>
              <div className="whitespace-nowrap text-right text-xs text-zinc-500">
                {fmtMoeda.format(l.precoUnitario)}/{un(l.unidade)}
              </div>
            </div>

            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded-md bg-zinc-100 py-1.5">
                <div className="text-zinc-500">Orçado</div>
                <div className="font-semibold">{fmtQtd.format(l.quantidade)}</div>
              </div>
              <div className="rounded-md bg-zinc-100 py-1.5">
                <div className="text-zinc-500">Já medido</div>
                <div className="font-semibold">{fmtQtd.format(l.jaMedido)}</div>
              </div>
              <div className="rounded-md bg-blue-50 py-1.5">
                <div className="text-blue-700">Saldo</div>
                <div className="font-semibold text-blue-800">{fmtQtd.format(l.saldo)}</div>
              </div>
            </div>

            <div className="mt-3 flex items-center gap-3">
              {editavel ? (
                <input
                  type="text"
                  inputMode="decimal"
                  autoComplete="off"
                  name={`qtd_${l.servicoId}`}
                  value={valores[l.servicoId] ?? ""}
                  placeholder="0"
                  onChange={(e) =>
                    setValores((v) => ({ ...v, [l.servicoId]: e.target.value }))
                  }
                  className={`campo flex-1 text-lg font-semibold ${
                    l.invalido ? "border-red-500" : ""
                  }`}
                />
              ) : (
                <div className="flex-1 text-lg font-semibold">
                  {fmtQtd.format(l.q)} {un(l.unidade)}
                </div>
              )}
              <div className="w-32 text-right">
                <div className="text-xs text-zinc-500">Valor</div>
                <div className="font-semibold">
                  {fmtMoeda.format(l.invalido ? 0 : l.q * l.precoUnitario)}
                </div>
              </div>
            </div>

            {l.invalido && (
              <p className="mt-2 text-sm font-medium text-red-600">
                Quantidade acima do saldo disponível ({fmtQtd.format(l.saldo)}{" "}
                {un(l.unidade)}).
              </p>
            )}
          </div>
        ))}

        <div className="cartao">
          <label className="rotulo" htmlFor="observacoes">
            Observações
          </label>
          {editavel ? (
            <textarea
              id="observacoes"
              name="observacoes"
              defaultValue={observacoes}
              rows={3}
              className="campo"
            />
          ) : (
            <p className="whitespace-pre-wrap text-sm text-zinc-700">
              {observacoes || "—"}
            </p>
          )}
        </div>

        {!editavel && (
          <div className="cartao flex items-center justify-between">
            <span className="font-semibold">Total da medição</span>
            <span className="text-xl font-bold">{fmtMoeda.format(total)}</span>
          </div>
        )}
      </div>

      {editavel && (
        <div className="fixed inset-x-0 bottom-0 z-10 border-t border-zinc-200 bg-white p-3 shadow-[0_-4px_12px_rgba(0,0,0,0.08)]">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-1">
            <div>
              <div className="text-xs text-zinc-500">Total da medição</div>
              <div className="text-xl font-bold">{fmtMoeda.format(total)}</div>
            </div>
            <button type="submit" disabled={temErro} className="botao">
              Salvar medição
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
