"use client";

import { TipoBusca } from "@/lib/patientUtils";
import { CalendarDays, ClipboardList, ContactRound, UserRound } from 'lucide-react';

interface SearchTypeSelectorProps {
  tipo: TipoBusca;
  onChange: (tipo: TipoBusca) => void;
  /** Protocolo só aparece na Entrega de exames (C). */
  servico?: string;
}

const options: Array<{ value: TipoBusca; label: string }> = [
  { value: "DATA", label: "Data Nasc." },
  { value: "CPF", label: "CPF" },
  { value: "NOME", label: "NOME" },
  { value: "PROTOCOLO", label: "PROTOCOLO" },
];
const icons = { DATA: CalendarDays, CPF: ContactRound, NOME: UserRound, PROTOCOLO: ClipboardList };
const labels = { DATA: 'Data de nascimento', CPF: 'CPF', NOME: 'Nome', PROTOCOLO: 'Protocolo' };

export function SearchTypeSelector({ tipo, onChange, servico }: SearchTypeSelectorProps) {
  const visiveis = options.filter((option) => option.value !== "PROTOCOLO" || servico === "C");
  return (
    <div className="search-type-tabs flex mb-4" data-options={visiveis.length}>
      {visiveis.map((option) => { const Icon = icons[option.value]; return (
        <label
          key={option.value}
          className={`flex items-center pr-5 text-2xl font-extrabold gap-2 ${tipo === option.value ? 'search-type-active' : ''}`}
        >
          <input
            className="appearance-none h-3 w-3 border-2 border-gray-400 rounded-full checked:border-red-600 checked:bg-red-600 flex items-center justify-center relative"
            type="radio"
            name="tipo"
            value={option.value}
            checked={tipo === option.value}
            onChange={() => onChange(option.value)}
          />
          <span className="search-type-legacy">{option.label}</span><span className="search-type-modern"><Icon size={17} />{labels[option.value]}</span>
        </label>
      ); })}
    </div>
  );
}
