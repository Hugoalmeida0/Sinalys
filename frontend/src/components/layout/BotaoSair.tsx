import { useRouter } from "@/lib/navegacao";
import { useState } from "react";
import { apiFetch } from "@/lib/api";

export function BotaoSair({ className = "" }: { className?: string }) {
  const router = useRouter();
  const [saindo, setSaindo] = useState(false);

  async function handleClick() {
    setSaindo(true);
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  }

  return (
    <button type="button" onClick={handleClick} disabled={saindo} className={className}>
      {saindo ? "Saindo..." : "Sair"}
    </button>
  );
}
