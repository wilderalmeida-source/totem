"use client";

import { TipoBusca } from "@/lib/patientUtils";
import { CalendarDays, ContactRound, UserRound } from 'lucide-react';

interface SearchTypeSelectorProps {
  tipo: TipoBusca;
  onChange: (tipo: TipoBusca) => void;
}

const options: Array<{ value: TipoBusca; label: string }> = [
  { value: "DATA", label: "Data Nasc." },
  { value: "CPF", label: "CPF" },
  { value: "NOME", label: "NOME" },
];

export function SearchTypeSelector({ tipo, onChange }: SearchTypeSelectorProps) {
  return (
    <div className="search-type-tabs flex mb-4">
      {options.map((option) => (
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
          <span className="search-type-legacy">{option.label}</span><span className="search-type-modern">{option.value === 'DATA' ? <CalendarDays size={17} /> : option.value === 'NOME' ? <UserRound size={17} /> : <ContactRound size={17} />}{option.value === 'DATA' ? 'Data de nascimento' : option.value === 'NOME' ? 'Nome' : 'CPF'}</span>
        </label>
      ))}
    </div>
  );
}
