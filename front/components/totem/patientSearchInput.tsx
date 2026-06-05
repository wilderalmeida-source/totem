"use client";

import Image from "next/image";
import { IMaskInput } from "react-imask";

import qrcode from "@/assets/icons/qrcode.png";
import { getInputMask, getInputPlaceholder, TipoBusca } from "@/lib/patientUtils";

interface PatientSearchInputProps {
  tipo: TipoBusca;
  value: string;
  inputRef: React.Ref<HTMLInputElement>;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onQRCodeClick: () => void;
}

export function PatientSearchInput({
  tipo,
  value,
  inputRef,
  onChange,
  onQRCodeClick,
}: PatientSearchInputProps) {
  return (
    <div className="flex w-full">
      <IMaskInput
        inputRef={inputRef}
        mask={getInputMask(tipo)}
        unmask={true}
        inputMode={tipo === "NOME" ? undefined : "numeric"}
        autoFocus
        placeholder={getInputPlaceholder(tipo)}
        className="h-16 w-full rounded-lg text-4xl px-4 border-black mr-3 border-solid border-2"
        value={value}
        onChange={onChange}
        onKeyDown={(event) => {
          if (event.key === "Enter") event.preventDefault();
        }}
      />

      <Image
        className="cursor-pointer w-16"
        src={qrcode}
        width={40}
        height={40}
        alt="qrcode"
        onClick={onQRCodeClick}
      />
    </div>
  );
}
