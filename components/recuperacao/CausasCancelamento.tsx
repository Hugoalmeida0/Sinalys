import { formatCurrencyBRL } from "@/lib/format";
import { MOTIVOS_CANCELAMENTO, type MotivoCancelamento } from "@/lib/cancelamento/constantes";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import type { ClientePainel } from "@/lib/painel/tipos";

interface LinhaCausa {
  categoria: MotivoCancelamento | "sem_motivo";
  clientes: number;
  receitaAnualPerdida: number;
}

function agregarCausas(cancelados: ClientePainel[]): LinhaCausa[] {
  const porCategoria = new Map<LinhaCausa["categoria"], LinhaCausa>();

  for (const cliente of cancelados) {
    const categoria = cliente.motivoCancelamento?.categoria ?? "sem_motivo";
    const linha = porCategoria.get(categoria) ?? { categoria, clientes: 0, receitaAnualPerdida: 0 };
    linha.clientes += 1;
    linha.receitaAnualPerdida += (cliente.mrr ?? 0) * 12;
    porCategoria.set(categoria, linha);
  }

  return Array.from(porCategoria.values()).sort((a, b) => b.receitaAnualPerdida - a.receitaAnualPerdida);
}

/**
 * Causa-raiz agregada dos cancelamentos: fecha o loop com o cliente final
 * transformando "por que ele saiu" (capturado em `eventos_desfecho.motivo_categoria`
 * ao marcar um cliente como cancelado) num retrato acionável para a diretoria —
 * não só um dashboard de quem cancelou, mas de *por quê* a carteira perde receita.
 */
export function CausasCancelamento({ cancelados }: { cancelados: ClientePainel[] }) {
  if (cancelados.length === 0) return null;

  const linhas = agregarCausas(cancelados);
  const max = Math.max(...linhas.map((l) => l.receitaAnualPerdida), 1);
  const semMotivo = linhas.find((l) => l.categoria === "sem_motivo")?.clientes ?? 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Principais causas de cancelamento</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {linhas.map((linha) => (
          <div key={linha.categoria} className="flex items-center gap-3">
            <span className="w-32 shrink-0 text-xs font-medium text-slate-600">
              {linha.categoria === "sem_motivo" ? "Sem motivo registrado" : MOTIVOS_CANCELAMENTO[linha.categoria]}
            </span>
            <div className="h-4 flex-1 rounded-full bg-slate-100">
              <div
                className="h-4 rounded-full bg-red-500"
                style={{ width: `${(linha.receitaAnualPerdida / max) * 100}%` }}
              />
            </div>
            <span className="w-16 shrink-0 text-right text-xs font-semibold text-slate-700 tabular-nums">
              {linha.clientes} {linha.clientes === 1 ? "cliente" : "clientes"}
            </span>
            <span className="w-28 shrink-0 text-right text-xs font-semibold text-red-600 tabular-nums">
              {formatCurrencyBRL(linha.receitaAnualPerdida)}
            </span>
          </div>
        ))}

        {semMotivo > 0 && (
          <p className="text-xs text-slate-400">
            {semMotivo} cancelamento(s) sem motivo estruturado (importados antes desta funcionalidade
            ou registrados sem motivo). Use &ldquo;Marcar como cancelado&rdquo; para capturar o motivo nos próximos.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
