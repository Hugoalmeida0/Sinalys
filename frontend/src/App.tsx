import { BrowserRouter, Route, Routes } from "react-router-dom";
import { RegistrarServiceWorker } from "@/components/pwa/RegistrarServiceWorker";
import { EmBreveProvider } from "@/components/ui/EmBreve";
import { TelaDeAbertura } from "@/components/ui/TelaDeAbertura";
import { AreaAutenticada } from "@/pages/AreaAutenticada";
import { ClienteDetalhePage } from "@/pages/ClienteDetalhe";
import { ClientesPage } from "@/pages/Clientes";
import { ConfiguracoesPage } from "@/pages/Configuracoes";
import { HealthPublicoPage } from "@/pages/HealthPublico";
import { InicioPage } from "@/pages/Inicio";
import { LoginPage } from "@/pages/Login";
import { NaoEncontradoPage } from "@/pages/NaoEncontrado";
import { IngestaoPage, PlaybookPage, RelatoriosPage } from "@/pages/Ocultas";
import { RecuperacaoPage } from "@/pages/Recuperacao";

export function App() {
  return (
    <BrowserRouter>
      <TelaDeAbertura />
      <RegistrarServiceWorker />
      <EmBreveProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* Pública: o link é enviado ao cliente e abre sem sessão. */}
          <Route path="/health/:token" element={<HealthPublicoPage />} />

          <Route element={<AreaAutenticada />}>
            <Route index element={<InicioPage />} />
            <Route path="/clientes" element={<ClientesPage />} />
            <Route path="/clientes/:id" element={<ClienteDetalhePage />} />
            <Route path="/recuperacao" element={<RecuperacaoPage />} />
            <Route path="/configuracoes" element={<ConfiguracoesPage />} />
            <Route path="/ingestao" element={<IngestaoPage />} />
            <Route path="/playbook" element={<PlaybookPage />} />
            <Route path="/relatorios" element={<RelatoriosPage />} />
            <Route path="*" element={<NaoEncontradoPage />} />
          </Route>
        </Routes>
      </EmBreveProvider>
    </BrowserRouter>
  );
}
