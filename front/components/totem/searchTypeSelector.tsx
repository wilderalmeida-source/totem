"use client";

import { TipoBusca } from "@/lib/patientUtils";

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
    <div className="flex mb-4">
      {options.map((option) => (
        <label
          key={option.value}
          className="flex items-center pr-5 text-2xl font-extrabold gap-2"
        >
          <input
            className="appearance-none h-3 w-3 border-2 border-gray-400 rounded-full checked:border-red-600 checked:bg-red-600 flex items-center justify-center relative"
            type="radio"
            name="tipo"
            value={option.value}
            checked={tipo === option.value}
            onChange={() => onChange(option.value)}
          />
          {option.label}
        </label>
      ))}
    </div>
  );
}
