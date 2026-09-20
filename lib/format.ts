export function formatCurrencyBRL(value: number): string {
  if (value >= 1_000_000) {
    return `R$ ${(value / 1_000_000).toLocaleString("pt-BR", {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    })} mi`;
  }

  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    maximumFractionDigits: 0,
  });
}

export function formatDatePtBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** Ex.: "12 de set. de 2026" — usado nas colunas de data das tabelas. */
export function formatDateLongPtBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Ex.: "14:32" — hora de envio/processamento nas ingestões. */
export function formatTimePtBR(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateShortPtBR(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "short",
  });
}

export function tempoDesde(iso: string): string {
  const inicio = new Date(iso);
  const agora = new Date();

  let meses =
    (agora.getFullYear() - inicio.getFullYear()) * 12 +
    (agora.getMonth() - inicio.getMonth());
  if (agora.getDate() < inicio.getDate()) meses -= 1;

  const anos = Math.floor(meses / 12);
  const mesesRestantes = meses % 12;

  const partes: string[] = [];
  if (anos > 0) partes.push(`${anos} ano${anos > 1 ? "s" : ""}`);
  if (mesesRestantes > 0 || anos === 0)
    partes.push(`${mesesRestantes} ${mesesRestantes === 1 ? "mês" : "meses"}`);

  return partes.join(" e ");
}

export function mesAnoPtBR(iso: string): string {
  return new Date(iso)
    .toLocaleDateString("pt-BR", { month: "short", year: "numeric" })
    .replace(".", "");
}
