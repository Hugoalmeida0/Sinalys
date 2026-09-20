import * as XLSX from "xlsx";

export interface AbaInspecionada {
  aba_origem: string;
  colunas: string[];
  total_linhas: number;
}

function nomeInternoParaAbaOrigem(nomeSheet: string, isCsv: boolean): string {
  return isCsv ? "" : nomeSheet;
}

export function lerWorkbook(buffer: Buffer): XLSX.WorkBook {
  return XLSX.read(buffer, { type: "buffer", cellDates: true, raw: false });
}

export function inspecionarAbas(workbook: XLSX.WorkBook, isCsv: boolean): AbaInspecionada[] {
  return workbook.SheetNames.map((nomeSheet) => {
    const sheet = workbook.Sheets[nomeSheet];
    const linhas = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: null,
    });
    const colunas =
      linhas.length > 0
        ? Object.keys(linhas[0])
        : (XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 })[0] ?? []).map((c) =>
            String(c)
          );
    return {
      aba_origem: nomeInternoParaAbaOrigem(nomeSheet, isCsv),
      colunas,
      total_linhas: linhas.length,
    };
  });
}

export function lerLinhasDaAba(
  workbook: XLSX.WorkBook,
  abaOrigem: string,
  isCsv: boolean
): Record<string, unknown>[] {
  const nomeSheet = isCsv
    ? workbook.SheetNames[0]
    : workbook.SheetNames.find((n) => n === abaOrigem);

  if (!nomeSheet) {
    throw new Error(`Aba "${abaOrigem}" não encontrada no arquivo.`);
  }

  const sheet = workbook.Sheets[nomeSheet];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null });
}

export function detectarTipoOrigem(nomeArquivo: string): "excel" | "csv" {
  const nome = nomeArquivo.toLowerCase();
  if (nome.endsWith(".csv")) return "csv";
  if (nome.endsWith(".xlsx") || nome.endsWith(".xls")) return "excel";
  throw new Error("Extensão de arquivo não suportada. Use .xlsx, .xls ou .csv.");
}
