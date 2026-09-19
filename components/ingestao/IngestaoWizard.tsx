"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/Card";
import { MapeamentoStep } from "./MapeamentoStep";
import { ProcessamentoStep } from "./ProcessamentoStep";
import { StepIndicator } from "./StepIndicator";
import { UploadStep } from "./UploadStep";
import type { UploadIngestaoResponse } from "@/lib/ingestao-client";

export function IngestaoWizard() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [uploadResultado, setUploadResultado] = useState<UploadIngestaoResponse | null>(null);
  const [execucaoIngestaoId, setExecucaoIngestaoId] = useState<string | null>(null);

  function reiniciar() {
    setStep(1);
    setUploadResultado(null);
    setExecucaoIngestaoId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <StepIndicator atual={step} />

      <Card>
        <CardContent className="pt-5">
          {step === 1 && (
            <UploadStep
              onEnviado={(resultado) => {
                setUploadResultado(resultado);
                setStep(2);
              }}
            />
          )}

          {step === 2 && uploadResultado && (
            <MapeamentoStep
              uploadResultado={uploadResultado}
              onVoltar={() => setStep(1)}
              onSalvo={(id) => {
                setExecucaoIngestaoId(id);
                setStep(3);
              }}
            />
          )}

          {step === 3 && execucaoIngestaoId && (
            <ProcessamentoStep
              execucaoIngestaoId={execucaoIngestaoId}
              onVoltar={() => setStep(2)}
              onNovaIngestao={reiniciar}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
