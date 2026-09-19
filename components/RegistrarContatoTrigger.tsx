"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { RegistrarContatoModal } from "@/components/RegistrarContatoModal";

export function RegistrarContatoTrigger({
  clienteId,
  clienteLabel,
  className,
  fullWidth,
}: {
  clienteId: string;
  clienteLabel: string;
  className?: string;
  fullWidth?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        className={`${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      >
        Registrar contato
      </Button>

      <RegistrarContatoModal
        open={open}
        onOpenChange={setOpen}
        clienteId={clienteId}
        clienteLabel={clienteLabel}
      />
    </>
  );
}
