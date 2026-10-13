const fmtMoeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const fmtQtd = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 });
const fmtPerc = new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 1 });

export function moeda(v: number) {
  return fmtMoeda.format(v);
}

export function qtd(v: number) {
  return fmtQtd.format(v);
}

export function percentual(v: number) {
  return `${fmtPerc.format(v)}%`;
}

export function dataBR(d: Date) {
  return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
}

export function hojeISO() {
  return new Intl.DateTimeFormat("en-CA").format(new Date());
}

export function numeroParaInput(v: number) {
  return String(v).replace(".", ",");
}

/** Aceita "1,5", "1.5" e "1.234,56". Retorna null se inválido. */
export function parseNumeroBR(valor: unknown): number | null {
  if (typeof valor !== "string" || !valor.trim()) return null;
  const s = valor.trim();
  const n = s.includes(",")
    ? parseFloat(s.replace(/\./g, "").replace(",", "."))
    : parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Aceita "AAAA-MM-DD" (input type=date) e devolve Date em UTC. */
export function parseDataISO(valor: unknown): Date | null {
  if (typeof valor !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;
  const d = new Date(`${valor}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
}

export const UNIDADES = ["m2", "m3", "ml", "un", "vb", "kg"] as const;

export function unidade(u: string) {
  if (u === "m2") return "m²";
  if (u === "m3") return "m³";
  return u;
}

export const STATUS_OBRA: Record<string, { rotulo: string; cor: string }> = {
  planejada: { rotulo: "Planejada", cor: "bg-zinc-200 text-zinc-700" },
  em_andamento: { rotulo: "Em andamento", cor: "bg-blue-100 text-blue-800" },
  paralisada: { rotulo: "Paralisada", cor: "bg-amber-100 text-amber-800" },
  concluida: { rotulo: "Concluída", cor: "bg-green-100 text-green-800" },
};

export const STATUS_MEDICAO: Record<string, { rotulo: string; cor: string }> = {
  rascunho: { rotulo: "Rascunho", cor: "bg-zinc-200 text-zinc-700" },
  enviada: { rotulo: "Enviada", cor: "bg-amber-100 text-amber-800" },
  aprovada: { rotulo: "Aprovada", cor: "bg-green-100 text-green-800" },
};

export const CLIMAS = ["Sol", "Parcial", "Nublado", "Chuva"] as const;

export const EMOJI_CLIMA: Record<string, string> = {
  Sol: "☀️",
  Parcial: "⛅",
  Nublado: "☁️",
  Chuva: "🌧️",
};
