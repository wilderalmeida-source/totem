"use client";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import moment from "moment";
import { IMaskInput } from "react-imask";
import React, {
  ReactElement,
  useEffect,
  useState,
  useRef,
  useContext,
  useMemo,
  useCallback,
} from "react";
import Keyboard from "simple-keyboard";
import "simple-keyboard/build/css/index.css";
import Base from "../../components/base";
import { modalContext } from "@/components/modals/providers";
import qrcode from "../../assets/icons/qrcode.png";
import { buscaPaciente, BuscaAtendimentos, Atendimento } from "../../services/fetchData";

// ------------------ Tipagens ------------------
interface Paciente {
  dt_nascimento?: string | undefined;
  ds_paciente?: string;
  cd_paciente?: number | undefined;
}

// ------------------ Componente ------------------
export default function DataNasc() {
  const url = useSearchParams();
  const { setShowModal, setDados } = useContext(modalContext);

  // congela valores da URL
  const nome = useMemo(() => url.get("nome") ?? "", [url]);
  const servico = useMemo(() => url.get("servico") ?? "", [url]);
  const tipo = useMemo(() => url.get("tipo") ?? "", [url]);
  const preferencial = useMemo(
    () => parseInt(url.get("preferencial") ?? "0", 10) || 0,
    [url]
  );

  const [text, setText] = useState("");
  const [info, setInfo] = useState<Paciente[]>([]);
  const [atend, setAtend] = useState<Atendimento[]>([])
  const [list, setList] = useState<ReactElement[]>([]);
  const [listEx, setListEx] = useState<ReactElement[]>([]);
  const keyboardRef = useRef<InstanceType<typeof Keyboard> | null>(null);

  // ------------------ Funções ------------------

  const getData = useCallback(async () => {
    // 1) Primeiro carregamento
    if (info.length === 0) {
      try {
        if (tipo == "DATA") {
          const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)
          const response = await buscaPaciente({ dt_nascimento: nome, tipo })
          const listExames = await BuscaAtendimentos({ dt_nascimento: nome, date: { from: hoje } })
          if (listExames) {
            const listar = [2, 3, 7]
            const examesProcedimentos = listExames.filter((i) => { if (i.exames && i.exames.length > 0 && i.ds_status && listar.includes(i.ds_status)) { return i } })
            const unicos: Array<number> = []
            const lista = examesProcedimentos.map((i) => {
              if (i.pacientes_atendimentos_cd_pacienteTopacientes && !unicos.includes(i.pacientes_atendimentos_cd_pacienteTopacientes.cd_paciente)) {
                unicos.push(i.pacientes_atendimentos_cd_pacienteTopacientes.cd_paciente)
                return i
              }
            })
            setAtend(examesProcedimentos);
            const itens: ReactElement[] = lista.map((p) => {
              return (
                <li
                  className="cursor-pointer text-4xl mb-3 text-red-500 font-bold"
                  key={p?.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente}
                  onClick={() => {
                    setDados({
                      ds_paciente: p?.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente,
                      cd_paciente: p?.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente,
                      dt_nascimento: p?.pacientes_atendimentos_cd_pacienteTopacientes?.dt_nascimento,
                      servico,
                      preferencial,
                    }); setShowModal(true);
                  }}
                >
                  {p?.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente}
                </li>
              )
            })
            setListEx(itens)
          }
          const lista: Paciente[] = Array.isArray(response) ? response : [];
          setInfo(lista);
          let key = 0
          const itens: ReactElement[] = lista.map((p) => {
            key += 1
            return (
              <li
                className="cursor-pointer text-4xl mb-3"
                key={key}
                onClick={() => {
                  setDados({
                    ds_paciente: p.ds_paciente,
                    dt_nascimento: p.dt_nascimento,
                    servico,
                    preferencial,
                  });
                  setShowModal(true)
                }}
              >
                {p.ds_paciente}
              </li>
            )
          })
          setList(itens);
        } else {
          const response = await buscaPaciente({ ds_paciente: nome, tipo: "NOME" });
          const lista: Paciente[] = Array.isArray(response) ? response : [];
          setInfo(...[lista]);
          let key = 0
          const itens: ReactElement[] = lista.map((p) => {
            const dataFmt = moment(p.dt_nascimento)
              .utc()
              .format("DD/MM/YYYY");
            key += 1
            return (
              <li
                className="cursor-pointer text-4xl mb-3"
                key={key}
                onClick={() => {
                  setDados({
                    ds_paciente: nome,
                    dt_nascimento: p.dt_nascimento,
                    servico,
                    preferencial,
                  }); setShowModal(true)
                }}
              >
                {dataFmt}
              </li>
            );
          });

          setList(...[itens]);
        }
      } catch (e) {
        console.error(e);
      }
      return;
    }

    if (tipo == "DATA") {
      const digits = text
      const examesFiltrados: ReactElement[] = atend.map((p) => {
        if (!digits || !p.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente || p.pacientes_atendimentos_cd_pacienteTopacientes.ds_paciente.includes(digits)) {
          return (
            <li
              className="cursor-pointer text-4xl mb-3 text-red-500 font-bold"
              key={p.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente}
              onClick={() => {
                setDados({
                  ds_paciente: p.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente,
                  cd_paciente: p.pacientes_atendimentos_cd_pacienteTopacientes?.cd_paciente,
                  dt_nascimento: p.pacientes_atendimentos_cd_pacienteTopacientes?.dt_nascimento,
                  servico,
                  preferencial,
                }); setShowModal(true)
              }}
            >
              {p.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente}
            </li>
          );
        }
        return null;
      })
        .filter(Boolean) as ReactElement[];

      setListEx(examesFiltrados);
      let key = 0
      const itensFiltrados: ReactElement[] = info.map((p) => {
        key += 1
        if (!digits || !p.ds_paciente || p.ds_paciente.includes(digits)) {
          return (
            <li
              className="cursor-pointer text-4xl mb-3"
              key={key}
              onClick={() => {
                setDados({
                  ds_paciente: p.ds_paciente,
                  dt_nascimento: p.dt_nascimento,
                  servico,
                  preferencial,
                }); setShowModal(true)
              }}
            >
              {p.ds_paciente}
            </li>
          );
        }
        return null;
      })
        .filter(Boolean) as ReactElement[];

      setList(itensFiltrados);
    } else {
      let key = 0
      const digits = text.replace(/\D/g, "");
      const itensFiltrados: ReactElement[] = info
        .map((p) => {
          const dataFmt = moment(p.dt_nascimento)
            .utc()
            .format("DD/MM/YYYY");
          key += 1
          if (!digits || dataFmt.replace(/\D/g, "").includes(digits)) {
            return (
              <li
                className="cursor-pointer text-4xl mb-3"
                key={key}
                onClick={() => {
                  setDados({
                    ds_paciente: nome,
                    dt_nascimento: p.dt_nascimento,
                    servico,
                    preferencial,
                  }); setShowModal(true)
                }}
              >
                {dataFmt}
              </li>
            );
          }
          return null;
        })
        .filter(Boolean) as ReactElement[];

      setList(itensFiltrados);
    }
  }, [info, nome, text, servico, preferencial, setDados, atend, tipo, setShowModal]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value.toUpperCase();
    setText(v);
    keyboardRef.current?.setInput(v);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.preventDefault();
  };

  const avancar = () => {
    if (!text) {
      if (tipo == "DATA") { window.alert("Digite o nome do paciente") } else { window.alert("Digite a data de Nascimento") };
      return;
    }
    if (tipo == "DATA") {
      setDados({
        ds_paciente: text,
        dt_nascimento: nome,
        tipo: 'NEW',
        servico,
        preferencial,
      })
    } else {
      setDados({
        ds_paciente: nome,
        dt_nascimento: text,
        tipo: 'NEW',
        servico,
        preferencial,
      });
    }
    setShowModal(true);
  };

  const Qrcode = () => {
    setDados({
      qr: true,
      ds_paciente: "Escaneie o QRCode.",
      servico,
      preferencial,
    });
    setShowModal(true);
  };

  // ------------------ Effects ------------------

  // carrega/filtra lista
  useEffect(() => {
    void getData();
  }, [getData]);

  // teclado virtual
  useEffect(() => {
    if (tipo == "DATA") {
      keyboardRef.current = new Keyboard({
        onChange: (input) => setText(input),
        physicalKeyboardHighlight: true,
        physicalKeyboardHighlightPress: true,
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
    } else {
      keyboardRef.current = new Keyboard({
        onChange: (input) => setText(input),
        physicalKeyboardHighlight: true,
        physicalKeyboardHighlightPress: true,
        layout: { default: ["1 2 3 4 5 6 7 8 9 0 {bksp}"] },
        display: { "{bksp}": "Apagar" },
      });
    }
    return () => keyboardRef.current?.destroy();
  }, [tipo]);

  // ------------------ Render ------------------
  return (
    <div className="overflow-hidden h-screen">
      <div className="flex flex-row flex-1 justify-between mt-3 w-full">
        <h2 className="text-2xl p-5 font-extrabold self-start">{url.get('servico') == "C" ? "Entrega de Exames" : url.get('servico') == "D" ? "Agendamento" : "Atendimento"}</h2>
        <div className="top-10 left-3/4 w-60">
          <button
            className="border-2 rounded-lg w-52 h-10 font-semibold bg-[#6b7280] text-white text-center text-2xl"
            onClick={avancar}
          >
            AVANÇAR
          </button>
          <button
            onClick={() =>
              (window.location.href = `totem?servico=${servico}&preferencial=${preferencial}`)
            }
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
          <>
            <div className="px-3 flex w-full h-full flex-col justify-start">
              <h2 className="mb-3 content-center text-4xl">{tipo == "DATA" ? moment(nome).utc().format("DD/MM/YYYY") : nome}</h2>
              <div className="flex">
                <IMaskInput
                  mask={tipo == "DATA" ? "" : "00/00/0000"}
                  unmask={true}
                  inputMode={tipo == "DATA" ? "text" : "numeric"}
                  autoFocus
                  className="h-16 w-full rounded-lg text-4xl px-4 border-black mr-3 border-solid border-2"
                  placeholder={tipo == "DATA" ? "Nome" : "Data de Nascimento"}
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
                  {listEx}{list}
                </ul>
              </div>

              <div className="w-full h-auto overflow-hidden">
                <div className="simple-keyboard w-full max-w-3xl" />
              </div>
            </div>
          </>
        }
      />
    </div>
  );
}
