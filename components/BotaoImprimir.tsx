"use client";

export default function BotaoImprimir() {
  return (
    <button type="button" onClick={() => window.print()} className="botao">
      🖨️ Imprimir / salvar PDF
    </button>
  );
}
