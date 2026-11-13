"use client";

import { useRouter, usePathname } from "next/navigation";
import { auditTotem } from '@/lib/audit-client';
import { Home, ArrowLeft, ArrowRight } from 'lucide-react';
import GoldMark from '@/components/GoldMark';

interface TotemHeaderProps {
  title: string;
  onAdvance: () => void;
  onBack: () => void;
}

export function TotemHeader({ title, onAdvance, onBack }: TotemHeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const buttonClass =
    "border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl";

  return (<>
    <div className="search-modern-heading">
      <nav><GoldMark className="search-gold-mark" /><button type="button" aria-label="Início" onClick={() => { auditTotem('inicio_clicado', pathname); router.replace('/'); }}><Home size={19} /></button>
        <button type="button" onClick={() => { auditTotem('voltar', pathname); onBack(); }}><ArrowLeft size={19} />Voltar</button>
        <span className="search-steps"><i /><i /><i />Etapa {pathname === '/date' ? '2' : '1'} de 3</span>
      </nav>
      <h1>Identifique-se para <span>{title.toLocaleLowerCase('pt-BR') === 'agendamento' ? 'o agendamento' : title.toLocaleLowerCase('pt-BR') === 'atendimento' ? 'o atendimento' : 'a entrega de exames'}</span></h1>
      <p>{pathname === '/date' ? 'Confirme seus dados selecionando a opção correta na lista.' : 'Busque e toque nos seus dados na lista.'}</p>
    </div>
    <div className="search-modern-footer"><span>Não encontrou seus dados?</span><button type="button" onClick={onAdvance}>Avançar sem cadastro <ArrowRight size={18} /></button></div>
    <div className="search-legacy-heading flex flex-row flex-1 justify-between mt-3 w-full">
      <h2 className="text-2xl p-5 font-extrabold self-start">{title}</h2>

      <div className="top-10 left-3/4 w-60 space-y-2">
        <button className={buttonClass} onClick={onAdvance}>
          AVANÇAR
        </button>

        <button
          className={buttonClass}
          onClick={() => { auditTotem('voltar', pathname); onBack(); }}
        >
          VOLTAR
        </button>

        <button className={buttonClass} onClick={() => { auditTotem('inicio_clicado', pathname); router.replace("/"); }}>
          INICIO
        </button>
      </div>
    </div></>
  );
}
