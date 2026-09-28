import { useEffect, useState } from "react";
import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { aoExpirarSessao, apiJson } from "@/lib/api";
import { ContextoUsuario, type UsuarioSessao } from "@/lib/auth/sessao";
import { CarregandoPainel } from "@/components/carregando/Carregando";

/**
 * Tudo que exige login passa por aqui: sem sessão válida, vai para /login.
 * A API também recusa (401) qualquer chamada sem sessão — esta guarda é só a
 * face visível dessa regra.
 */
export function AreaAutenticada() {
  const navigate = useNavigate();
  const [estado, setEstado] = useState<{ usuario: UsuarioSessao | null; verificado: boolean }>({
    usuario: null,
    verificado: false,
  });

  useEffect(() => {
    let ativo = true;
    apiJson<{ usuario: UsuarioSessao }>("/api/auth/me")
      .then(({ usuario }) => ativo && setEstado({ usuario, verificado: true }))
      .catch(() => ativo && setEstado({ usuario: null, verificado: true }));
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => aoExpirarSessao(() => navigate("/login", { replace: true })), [navigate]);

  if (!estado.verificado) return <CarregandoPainel />;
  if (!estado.usuario) return <Navigate to="/login" replace />;

  return (
    <ContextoUsuario.Provider value={estado.usuario}>
      <AppShell usuario={estado.usuario}>
        <Outlet />
      </AppShell>
    </ContextoUsuario.Provider>
  );
}
