const UNIDADES = [
  "", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove",
  "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis",
  "dezessete", "dezoito", "dezenove",
];
const DEZENAS = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CENTENAS = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
const ESCALAS: [string, string][] = [["", ""], ["mil", "mil"], ["milhão", "milhões"], ["bilhão", "bilhões"]];

function grupoPorExtenso(n: number): string {
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100);
  const r = n % 100;
  const partes: string[] = [];
  if (c > 0) partes.push(CENTENAS[c]);
  if (r > 0) {
    if (r < 20) partes.push(UNIDADES[r]);
    else {
      const d = Math.floor(r / 10);
      const u = r % 10;
      partes.push(u > 0 ? `${DEZENAS[d]} e ${UNIDADES[u]}` : DEZENAS[d]);
    }
  }
  return partes.join(" e ");
}

export function inteiroPorExtenso(n: number): string {
  n = Math.floor(Math.abs(n));
  if (n === 0) return "zero";
  const grupos: number[] = [];
  let resto = n;
  while (resto > 0) {
    grupos.push(resto % 1000);
    resto = Math.floor(resto / 1000);
  }
  const partes: { texto: string; valor: number }[] = [];
  for (let i = grupos.length - 1; i >= 0; i--) {
    const g = grupos[i];
    if (g === 0) continue;
    let texto: string;
    if (i === 0) texto = grupoPorExtenso(g);
    else if (i === 1) texto = g === 1 ? "mil" : `${grupoPorExtenso(g)} mil`;
    else texto = `${grupoPorExtenso(g)} ${g === 1 ? ESCALAS[i][0] : ESCALAS[i][1]}`;
    partes.push({ texto, valor: g });
  }
  if (partes.length === 1) return partes[0].texto;
  const ultima = partes[partes.length - 1];
  const separador = ultima.valor < 100 || ultima.valor % 100 === 0 ? " e " : ", ";
  return partes.slice(0, -1).map((p) => p.texto).join(", ") + separador + ultima.texto;
}

export function valorPorExtenso(v: number): string {
  const centavosTotais = Math.round(Math.abs(v) * 100);
  const reais = Math.floor(centavosTotais / 100);
  const centavos = centavosTotais % 100;
  const partes: string[] = [];
  if (reais > 0) {
    const de = reais >= 1_000_000 && reais % 1_000_000 === 0 ? " de" : "";
    partes.push(`${inteiroPorExtenso(reais)}${de} ${reais === 1 ? "real" : "reais"}`);
  }
  if (centavos > 0) {
    partes.push(`${inteiroPorExtenso(centavos)} ${centavos === 1 ? "centavo" : "centavos"}`);
  }
  if (partes.length === 0) return "zero real";
  return partes.join(" e ");
}
