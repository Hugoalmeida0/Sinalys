import { z } from "zod";

/**
 * Contrato rígido de saída do LLM (docs/instructions.md §1, "Retorno (Output
 * Zod Schema)"). Usado por `generateObject` para forçar o formato — o modelo não
 * pode devolver prosa livre nem campos extras.
 */
export const esquemaDiagnostico = z.object({
  diagnostico_principal: z
    .string()
    .min(1)
    .describe(
      "Descrição breve e direta do principal ofensor do risco, citando o sinal concreto que o sustenta."
    ),
  analise_lookalike: z
    .string()
    .min(1)
    .describe(
      "Comparação com os casos históricos similares fornecidos. Se nenhum caso foi fornecido, declarar explicitamente que não há histórico comparável na base."
    ),
  plano_acao_imediato: z
    .array(z.string().min(1))
    .min(1)
    .max(5)
    .describe(
      "Ações prescritivas, específicas e executáveis pelo analista de CS nos próximos dias. Sem conselhos genéricos. " +
        "Cada item é o texto puro da ação: NÃO prefixar com número, marcador ou '1.', pois a numeração é feita por quem exibe a lista."
    ),
});

export type Diagnostico = z.infer<typeof esquemaDiagnostico>;
