"use client";

import { useRouter } from "next/navigation";

interface TotemHeaderProps {
  title: string;
  onAdvance: () => void;
  onBack: () => void;
}

export function TotemHeader({ title, onAdvance, onBack }: TotemHeaderProps) {
  const router = useRouter();

  const buttonClass =
    "border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl";

  return (
    <div className="flex flex-row flex-1 justify-between mt-3 w-full">
      <h2 className="text-2xl p-5 font-extrabold self-start">{title}</h2>

      <div className="top-10 left-3/4 w-60 space-y-2">
        <button className={buttonClass} onClick={onAdvance}>
          AVANÇAR
        </button>

        <button
          className={buttonClass}
          onClick={onBack}
        >
          VOLTAR
        </button>

        <button className={buttonClass} onClick={() => router.replace("/")}>
          INICIO
        </button>
      </div>
    </div>
  );
}
