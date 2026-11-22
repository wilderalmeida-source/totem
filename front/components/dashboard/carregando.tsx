"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

// Aviso de carregamento dos dashboards: aparece ao abrir a tela e ao clicar em Atualizar, para não parecer que a
// página travou. Cobre o conteúdo (abaixo do cabeçalho, que continua visível) com um véu e um cartão central com o
// tempo decorrido; consultas longas ganham uma explicação. Vai direto no <body> (portal) para nenhum elemento pai
// com transform/blur deslocar a camada fixa.
export function AvisoCarregando({ ativo, mensagem = "Carregando dados…" }: { ativo: boolean; mensagem?: string }) {
  const [segundos, setSegundos] = useState(0);
  const [montado, setMontado] = useState(false);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    if (!ativo) return;
    setSegundos(0);
    const inicio = Date.now();
    const id = setInterval(() => setSegundos(Math.floor((Date.now() - inicio) / 1000)), 1000);
    return () => clearInterval(id);
  }, [ativo]);

  if (!ativo || !montado) return null;
  return createPortal(
    <div role="status" aria-live="polite" aria-busy="true"
      className="fixed inset-x-0 bottom-0 top-16 z-40 flex items-center justify-center bg-slate-100/85 px-4 backdrop-blur-sm">
      <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-3xl border border-slate-200 bg-white px-8 py-7 text-center shadow-2xl shadow-slate-900/10">
        <Loader2 size={36} className="animate-spin text-blue-600" />
        <p className="text-base font-bold text-slate-900">{mensagem}</p>
        <p className="text-sm tabular-nums text-slate-500">
          {segundos >= 2 ? `${segundos} s` : "Aguarde um instante"}
        </p>
        {segundos >= 6 && <p className="text-xs text-slate-500">Períodos longos consultam muitos registros e podem levar alguns segundos.</p>}
      </div>
    </div>,
    document.body,
  );
}
