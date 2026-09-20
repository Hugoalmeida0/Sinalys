import type { ReactNode } from "react";

export function TextoFormatado({ texto }: { texto: string }) {
  const blocos = agruparBlocos(texto);

  return (
    <div className="flex flex-col gap-2">
      {blocos.map((bloco, i) => {
        if (bloco.tipo === "ul") {
          return (
            <ul key={i} className="list-disc space-y-1 pl-4">
              {bloco.itens.map((item, j) => (
                <li key={j}>{formatarInline(item)}</li>
              ))}
            </ul>
          );
        }
        if (bloco.tipo === "ol") {
          return (
            <ol key={i} className="list-decimal space-y-1 pl-4">
              {bloco.itens.map((item, j) => (
                <li key={j}>{formatarInline(item)}</li>
              ))}
            </ol>
          );
        }
        return <p key={i}>{formatarInline(bloco.texto)}</p>;
      })}
    </div>
  );
}

type Bloco =
  | { tipo: "p"; texto: string }
  | { tipo: "ul"; itens: string[] }
  | { tipo: "ol"; itens: string[] };

function agruparBlocos(texto: string): Bloco[] {
  const blocos: Bloco[] = [];
  let paragrafo: string[] = [];

  const fecharParagrafo = () => {
    if (paragrafo.length > 0) {
      blocos.push({ tipo: "p", texto: paragrafo.join(" ") });
      paragrafo = [];
    }
  };

  for (const linhaBruta of texto.split("\n")) {
    const linha = linhaBruta.replace(/^#{1,6}\s+/, "").trimEnd();
    const itemUl = linha.match(/^\s*[-*•]\s+(.*)$/);
    const itemOl = linha.match(/^\s*\d{1,2}[.)]\s+(.*)$/);

    if (itemUl || itemOl) {
      fecharParagrafo();
      const tipo = itemUl ? "ul" : "ol";
      const conteudo = (itemUl ?? itemOl)![1];
      const ultimo = blocos[blocos.length - 1];
      if (ultimo && ultimo.tipo === tipo) ultimo.itens.push(conteudo);
      else blocos.push({ tipo, itens: [conteudo] });
      continue;
    }

    if (linha.trim() === "") {
      fecharParagrafo();
      continue;
    }
    paragrafo.push(linha.trim());
  }
  fecharParagrafo();
  return blocos;
}

function formatarInline(texto: string): ReactNode[] {
  const partes: ReactNode[] = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`/g;
  let ultimoIndice = 0;
  let match: RegExpExecArray | null;
  let chave = 0;

  while ((match = regex.exec(texto)) !== null) {
    if (match.index > ultimoIndice) partes.push(texto.slice(ultimoIndice, match.index));
    if (match[1] !== undefined) {
      partes.push(
        <strong key={chave++} className="font-semibold text-slate-800">
          {match[1]}
        </strong>
      );
    } else {
      partes.push(
        <code key={chave++} className="rounded bg-slate-100 px-1 py-0.5 text-[0.85em] text-slate-700">
          {match[2]}
        </code>
      );
    }
    ultimoIndice = regex.lastIndex;
  }
  if (ultimoIndice < texto.length) partes.push(texto.slice(ultimoIndice));
  return partes;
}
