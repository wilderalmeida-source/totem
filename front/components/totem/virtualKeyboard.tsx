"use client";

import { useEffect, useRef, useState } from "react";
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
  const valueRef = useRef(value);
  valueRef.current = value;
  const [modern, setModern] = useState(false);
  useEffect(() => {
    const update = () => setModern(document.documentElement.dataset.visualTheme === 'theme1');
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-visual-theme'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    keyboardRef.current?.destroy();

    keyboardRef.current = new Keyboard({
      onChange: (input) => onChange(input.toUpperCase()),
      onKeyPress: button => { if (button === '{clear}') { keyboardRef.current?.setInput(''); onChange(''); } },
      layout: {
        default:
          modern ? (tipo === 'NOME' ? ['1 2 3 4 5 6 7 8 9 0', 'Q W E R T Y U I O P', 'A S D F G H J K L Ç', 'Z X C V B N M {bksp}', "{clear} {space} '"] : ['1 2 3', '4 5 6', '7 8 9', '{clear} 0 {bksp}']) : tipo === "NOME"
            ? [
              "Q W E R T Y U I O P",
              "A S D F G H J K L",
              "Z X C V B N M {bksp}",
              "{space}",
            ]
            : ["1 2 3 4 5 6 7 8 9 0 {bksp}"],
      },
      display: {
        "{clear}": "Limpar",
        "{bksp}": "Apagar",
        "{space}": "ESPAÇO",
      },
    });
    keyboardRef.current.setInput(valueRef.current);

    return () => {
      keyboardRef.current?.destroy();
      keyboardRef.current = null;
    };
  }, [tipo, onChange, modern]);

  useEffect(() => {
    keyboardRef.current?.setInput(value);
  }, [value]);

  return (
    <div className={`search-keyboard ${tipo === 'NOME' ? 'search-keyboard-alpha' : 'search-keyboard-numeric'} w-full overflow-hidden flex items-end mb-3`}>
      <div className="simple-keyboard w-full" />
    </div>
  );
}
