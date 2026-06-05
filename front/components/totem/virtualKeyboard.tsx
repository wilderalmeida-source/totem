"use client";

import { useEffect, useRef } from "react";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";

import { TipoBusca } from "@/lib/patientUtils";

interface VirtualKeyboardProps {
  tipo: TipoBusca;
  value: string;
  onChange: (value: string) => void;
}

export function VirtualKeyboard({ tipo, value, onChange }: VirtualKeyboardProps) {
  const keyboardRef = useRef<InstanceType<typeof Keyboard> | null>(null);

  useEffect(() => {
    keyboardRef.current?.destroy();

    keyboardRef.current = new Keyboard({
      onChange: (input) => onChange(input.toUpperCase()),
      layout: {
        default:
          tipo === "NOME"
            ? [
              "Q W E R T Y U I O P",
              "A S D F G H J K L",
              "Z X C V B N M {bksp}",
              "{space}",
            ]
            : ["1 2 3 4 5 6 7 8 9 0 {bksp}"],
      },
      display: {
        "{bksp}": "Apagar",
        "{space}": "ESPAÇO",
      },
    });

    return () => {
      keyboardRef.current?.destroy();
      keyboardRef.current = null;
    };
  }, [tipo, onChange]);

  useEffect(() => {
    keyboardRef.current?.setInput(value);
  }, [value]);

  return (
    <div className="w-full overflow-hidden flex items-end mb-3">
      <div className="simple-keyboard w-full" />
    </div>
  );
}
