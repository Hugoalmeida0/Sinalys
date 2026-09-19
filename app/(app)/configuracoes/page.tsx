import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { CheckIcon } from "@/components/icons";
import { usuarioAtual } from "@/lib/mock-data";

const integracoes = [
  { nome: "Supabase (Postgres + pgvector)", status: "conectado" as const },
  { nome: "Google Gemini (IA generativa)", status: "conectado" as const },
  { nome: "Vercel Cron (varredura diária)", status: "pendente" as const },
];

const regrasModelo = [
  { sinal: "Queda severa de uso do sistema", peso: 5 },
  { sinal: "Atraso de pagamento", peso: 4 },
  { sinal: "Queda de SLA", peso: 4 },
  { sinal: "Chamados críticos abertos", peso: 3 },
  { sinal: "Reaberturas de chamados", peso: 2 },
  { sinal: "NPS detrator", peso: 2 },
];

export default function ConfiguracoesPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="mt-1 text-sm text-slate-500">
          Perfil, integrações e parâmetros do modelo de risco.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-navy text-lg font-semibold text-white">
              {usuarioAtual.iniciais}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">{usuarioAtual.nome}</p>
              <p className="text-xs text-slate-500">{usuarioAtual.cargo}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Integrações</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-slate-100">
            {integracoes.map((i) => (
              <li key={i.nome} className="flex items-center justify-between py-3">
                <span className="text-sm text-slate-700">{i.nome}</span>
                {i.status === "conectado" ? (
                  <Badge className="bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200">
                    <CheckIcon className="h-3 w-3" />
                    Conectado
                  </Badge>
                ) : (
                  <Badge className="bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200">
                    Pendente
                  </Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Pesos do modelo de risco</CardTitle>
            <p className="mt-1 text-xs text-slate-500">
              Usados no cálculo do Score de Risco (Task 3.2). Ajuste conforme a
              realidade da sua operação.
            </p>
          </div>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col gap-4">
            {regrasModelo.map((regra) => (
              <li key={regra.sinal}>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-700">{regra.sinal}</span>
                  <span className="font-semibold text-slate-900">{regra.peso}</span>
                </div>
                <div className="mt-1.5 h-1.5 w-full rounded-full bg-slate-100">
                  <div
                    className="h-1.5 rounded-full bg-brand-royal"
                    style={{ width: `${(regra.peso / 5) * 100}%` }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
