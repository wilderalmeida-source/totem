"use client";

import { useRouter, useSearchParams } from "next/navigation";
import React, {
  ReactElement,
  useState,
  useEffect,
  useRef,
  useContext,
  useCallback,
} from "react";
import Base from "../../components/base";
import Link from "next/link";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css"
import Image from "next/image";
import qrcode from "../../assets/icons/qrcode.png";
import { buscaPaciente, Paciente } from "../../services/fetchData";
import { modalContext } from "@/components/modals/providers";
import { IMaskInput } from "react-imask";
import moment from "moment";

export default function Totem() {
  const url = useSearchParams();
  const router = useRouter();
  const hasInit = React.useRef(null);
  const [text, setText] = useState("");
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [lista, setLista] = useState<ReactElement[]>([]);
  const [tipo, setTipo] = useState("DATA");
  const { setShowModal, setDados } = useContext(modalContext);
  const InputRef = useRef<HTMLInputElement | null>(null);
  const keyboardRef = useRef<InstanceType<typeof Keyboard> | null>(null)
  // --------- PESQUISAR (useCallback para deps estáveis) ----------
  const pesquisar = useCallback(
    async (digitos: string) => {
      const term = (digitos ?? "").toUpperCase().trim();
      const number = digitos.replace(/\D/g, "");
      // Busca curta por nome (<= 4 caracteres) não é feita
      if (number.length == 0 && term.length <= 4) {
        setPacientes([]);
        setLista([]);
        return;
      }

      // 1) Busca inicial
      if (pacientes.length < 1) {
        let result: Paciente[] | undefined = [];

        if (number.length == 0 && term.length > 4) {
          // Busca por NOME
          const isComum =
            term.includes("MARIA") || term.includes("JOAO") || term.includes("JOSE");
          if (!isComum || term.length > 7) {
            result = await buscaPaciente({ ds_paciente: term });
          } else {
            setLista([]);
            return;
          }
        } else {
          if (number.length > 8 && tipo == "CPF") {
            result = await buscaPaciente({ ds_cpf: number, tipo:"MASK" });
          }
          if (number.length == 8 && tipo == "DATA") {
            const day = parseInt(number.substring(0, 2));
            const month = parseInt(number.substring(2, 4));
            const year = parseInt(number.substring(4, 8));
            const date = new Date(year, month - 1, day);
            const seachDate: Paciente[] = await buscaPaciente({ dt_nascimento: date.toISOString() })
            if (seachDate) { result.push(seachDate[0]); } else { result = undefined; }
          }
        }

        const normalizados: Paciente[] = (result ?? []).map((r) => ({
          cd_paciente: r.cd_paciente ?? undefined,
          ds_nome: r.ds_nome ?? r.ds_paciente ?? "",
          dt_nascimento: r.dt_nascimento ?? "",
          ds_cpf: r.ds_cpf ?? ""
        }));
        setPacientes(normalizados);
        const itens = normalizados.map((p, idx) => (
          <li className="text-4xl mb-3" key={`pac-${idx}`} onClick={()=>{
            if(tipo=="CPF"){setDados({
              ds_cpf: number,
              dt_nascimento: p.dt_nascimento,
              servico: url.get("servico") ?? "",
              preferencial: parseInt(url.get("preferencial") ?? "0", 10),
              tipo: "CPF",
              });setShowModal(true)}
          }}>
          {tipo!="CPF"?
          <Link
              href={{
                pathname: "/date",
                query: {
                  servico: url.get("servico") ?? "",
                  preferencial: url.get("preferencial") ?? "",
                  nome: tipo == "DATA" ? p.dt_nascimento : tipo==="CPF"?p.cd_paciente:tipo==="NOME"?p.ds_nome:"SEM NOME",
                  tipo: tipo
                },
              }}
            >
              {tipo == "DATA" ? moment(p.dt_nascimento).add(1, "day").format("DD/MM/YYYY") : tipo==="CPF"?moment(p.dt_nascimento).add(1, "day").format("DD/MM/YYYY"):tipo==="NOME"?p.ds_nome:"SEM NOME"}
            </Link>:moment(p.dt_nascimento).add(1, "day").format("DD/MM/YYYY")}
          </li>
        ));

        setLista(itens);
        return;
      }

      // 2) Já tem cache: filtrar
      const itens = pacientes
        .filter((p) => (p.ds_nome ?? "").toUpperCase().includes(term))
        .map((p, idx) => (
          <li className="text-4xl mb-3" key={`pac-${idx}`} onClick={()=>{
            if(tipo=="CPF"){setDados({
              ds_cpf: number,
              dt_nascimento: p.dt_nascimento,
              servico: url.get("servico") ?? "",
              preferencial: parseInt(url.get("preferencial") ?? "0", 10),
              tipo: "CPF",
              });setShowModal(true)}
          }}>
            {tipo!="CPF"?
            <Link
              href={{
                pathname: "/date",
                query: {
                  servico: url.get("servico") ?? "",
                  preferencial: url.get("preferencial") ?? "",
                  nome: p.ds_nome ?? "",
                },
              }}
            >
              {p.ds_nome ?? "SEM NOME"}
            </Link>:
            p.ds_nome ?? "SEM NOME"}
          </li>
        ));

      setLista(itens);
    },
    [pacientes, url, tipo, setDados, setShowModal] // deps reais
  );
  const pesquisarRef = React.useRef(pesquisar);
  useEffect(() => {
    pesquisarRef.current = pesquisar;
  }, [pesquisar]);
  const handleChangeTipo = (value: string) => {
    setTipo(value);
    InputRef.current?.focus();
  };
  // --------- KEYBOARD VIRTUAL ----------
  useEffect(() => {
    if (hasInit.current) return;// impede a 2ª execução do StrictMode
    setText("")
    setPacientes([])
    setLista([])
    if (tipo == "DATA" || tipo == "CPF") {
      keyboardRef.current = new Keyboard({
        onChange: (input) => { setText(input.toUpperCase()); pesquisarRef.current(input.toUpperCase()) },
        layout: {
          default: [
            "1 2 3 4 5 6 7 8 9 0 {bksp}",
          ],
        },
        display: {
          "{bksp}": "Apagar",
          "{space}": "ESPAÇO",
        },
      });

      return () => {
        keyboardRef.current?.destroy();
        keyboardRef.current = null;
      }
    } else {
      keyboardRef.current = new Keyboard({
        onChange: (input) => { setText(input.toUpperCase()); pesquisarRef.current(input.toUpperCase()) },
        layout: {
          default: [
            "Q W E R T Y U I O P",
            "A S D F G H J K L",
            "Z X C V B N M {bksp}",
            "{space}",
          ],
        },
        display: {
          "{bksp}": "Apagar",
          "{space}": "ESPAÇO",
        },
      });

      return () => {
        keyboardRef.current?.destroy();
        keyboardRef.current = null;
      }
    };
  }, [tipo]);

  // --------- INPUT FÍSICO ----------
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = (e.target.value ?? "").toUpperCase();
    setText(v);
    pesquisar(v);
    keyboardRef.current?.setInput(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  // --------- AÇÕES ---------
  function avancar() {
    if (text === "") {
      window.alert("Digite o nome do paciente");
      return;
    }
    if (!isNaN(parseInt(text, 10))) {
      window.alert("Digite um nome para poder avançar.");
      return;
    }
    const preferencial = url.get("preferencial");
    if (preferencial) {
      setDados({
        ds_paciente: text,
        dt_nascimento: undefined,
        cd_paciente: undefined,
        servico: url.get("servico"),
        preferencial: parseInt(preferencial, 10),
      });
    }
    setShowModal(true);
  }

  function Qrcode() {
    const preferencial = url.get("preferencial");
    if (preferencial) {
      setDados({
        qr: true,
        ds_paciente: "Escaneie o QRCode.",
        servico: url.get("servico"),
        preferencial: parseInt(preferencial, 10),
      });
    }
    setShowModal(true);
  }

  // --------- RENDER ---------
  return (
    <div className="overflow-hidden h-screen">
      <div className="flex flex-row flex-1 justify-between mt-3 w-full">
        <h2 className="text-2xl p-5 font-extrabold self-start">{url.get('servico') == "C" ? "Entrega de Exames" : url.get('servico') == "D" ? "Agendamento" : "Atendimento"}</h2>
        <div className="top-10 left-3/4 w-60 space-y-2">
          <button
            className="border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl"
            onClick={avancar}
          >
            AVANÇAR
          </button>
          <button
            onClick={() => router.replace(`/preferencial?servico=${url.get("servico")}`)}
            className="border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl"
          >
            VOLTAR
          </button>
          <button
            onClick={() => (window.location.href = `/`)}
            className="border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl"
          >
            INICIO
          </button>
        </div>
      </div>

      <Base
        key=""
        type="totem"
        props={
          <div className="flex h-full flex-col justify-start mt-8 px-2">
            <div className="flex mb-4">
              <label className="flex items-center pr-5 text-2xl font-extrabold gap-2">
                <input
                  className="appearance-none h-3 w-3 border-2 border-gray-400 rounded-full checked:border-red-600 checked:bg-red-600 flex items-center justify-center relative"
                  type="radio"
                  name="tipo"
                  value="DATA"
                  checked={tipo === "DATA"}
                  onChange={(e) => { handleChangeTipo(e.target.value) }}
                />
                Data Nasc.
              </label>
              <label className="flex items-center pr-5 text-2xl font-extrabold gap-2">
                <input
                  className="appearance-none h-3 w-3 border-2 border-gray-400 rounded-full checked:border-red-600 checked:bg-red-600 flex items-center justify-center relative"
                  type="radio"
                  name="tipo"
                  value="CPF"
                  checked={tipo === "CPF"}
                  onChange={(e) => { handleChangeTipo(e.target.value) }}
                />
                CPF
              </label>
              <label className="flex items-center justify-center pr-5 text-2xl font-extrabold gap-2">
                <input
                  className="appearance-none h-3 w-3 border-2 border-gray-400 rounded-full checked:border-red-600 checked:bg-red-600 flex items-center justify-center relative"
                  type="radio"
                  name="tipo"
                  value="NOME"
                  checked={tipo === "NOME"}
                  onChange={(e) => { handleChangeTipo(e.target.value) }}
                />
                NOME
              </label>
            </div>
            <div className="flex w-full">
              <IMaskInput
                inputRef={InputRef}
                mask={tipo === "DATA" ? "00/00/0000" : tipo === "CPF" ? "000.000.000-00" : ""}
                unmask={true}
                inputMode={tipo === "DATA" ? "numeric" : tipo === "CPF" ? "numeric":undefined}
                autoFocus
                placeholder={tipo === "DATA" ? "Digite a Data de Nascimento" : tipo === "CPF" ? "Digite seu CPF" : "Digite seu Nome"}
                className="h-16 w-full rounded-lg text-4xl px-4 border-black mr-3 border-solid border-2"
                value={text}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
              />
              <Image
                className="cursor-pointer w-16"
                src={qrcode}
                width={40}
                height={40}
                alt="qrcode"
                onClick={Qrcode}
              />
            </div>

            <div className="flex mt-2">
              <ul className="px-3 h-48 w-full overflow-y-auto mb-5 rounded-lg border-2 border-gray-500">
                {lista}
              </ul>
            </div>

            <div className="w-full overflow-hidden flex items-end mb-3">
              <div className="simple-keyboard w-full" />
            </div>
          </div>
        }
      />
    </div>
  );
}
