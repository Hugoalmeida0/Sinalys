export const TIPOS_CONTATO = {
  ligacao: "Ligação",
  reuniao_presencial: "Reunião presencial",
  videochamada: "Videochamada",
  email: "E-mail",
  whatsapp: "WhatsApp",
  outro: "Outro",
} as const;

export type TipoContato = keyof typeof TIPOS_CONTATO;

export function normalizarTipoContato(valor: unknown): TipoContato | null {
  if (typeof valor !== "string") return null;
  const v = valor.trim();
  if (v in TIPOS_CONTATO) return v as TipoContato;
  const porRotulo = (Object.keys(TIPOS_CONTATO) as TipoContato[]).find(
    (k) => TIPOS_CONTATO[k].toLowerCase() === v.toLowerCase()
  );
  return porRotulo ?? null;
}

export const PADRAO_DIAS_SILENCIAMENTO = 30;
export const MAX_DIAS_SILENCIAMENTO = 365;
