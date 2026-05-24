"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Button } from "../ui/button"
import { SendClinux } from "@/components/functions/sendClinux"
import { buscaPaciente } from "../../services/fetchData"
import moment from "moment"
import OrbitProgress from "react-loading-indicator"

interface paciente {
  ds_paciente?: string,
  ds_telefone?: string | undefined
  ds_celular?: string | undefined
  ds_celular_web?: string | undefined
  cd_paciente?: number | undefined
  dt_nascimento?: string | undefined
  servico: string | null
  preferencial: number | undefined | null
  qr?: boolean | undefined
  ds_cpf?: string | undefined
  ds_observacao?: string | undefined
  tipo?: string | undefined
}

export function DialogPatient({ showModal, setShowModal, dados, setDados }: {
  showModal: boolean,
  setShowModal: Dispatch<SetStateAction<boolean>>,
  setDados: Dispatch<SetStateAction<paciente | null>>,
  dados: paciente | null
}) {
  const [loading, setLoading] = useState(false)
  const [invalido, setIvalido] = useState<string | null>(null)
  const [tentativas, setTentativas] = useState<number>(0)
  useEffect(() => {
    async function rodarBuscaCPF() {
      if (dados?.tipo === "CPF" && dados?.ds_cpf) {
        // Evita buscas desnecessárias se o ID já foi carregado
        if (dados.cd_paciente) { return };
        const listpaciente = await buscaPaciente({
          ds_cpf: dados.ds_cpf,
          dt_nascimento: dados.dt_nascimento,
          tipo: "ID"
        });
        if (listpaciente && listpaciente.length > 0) {
          if (!listpaciente[0].cd_paciente) {
            setIvalido("Dados Invalidos!")
            if (listpaciente[0].tentativas) {
              console.log(listpaciente)
              setTentativas(listpaciente[0].tentativas)
            }
          } else {
            listpaciente[0].dt_nascimento = moment(listpaciente[0].dt_nascimento).add(1, "day").format("DD/MM/YYYY");
            const newDados = {
              ...listpaciente[0],
              dt_nascimento: listpaciente[0].dt_nascimento,
              servico: dados.servico,
              preferencial: dados.preferencial
            };
            setDados(newDados);
          }
        }
      } else {
        if (dados && dados.tipo != 'NEW') {
          if (dados.cd_paciente) { return };
          const listpaciente = await buscaPaciente({
            ds_paciente: dados.ds_paciente,
            dt_nascimento: dados.dt_nascimento,
            tipo: "NOMEDATA"
          });
          if (listpaciente && listpaciente.length > 0) {
            if (!listpaciente[0].cd_paciente) {
              setIvalido("Dados Invalidos!")
              if (listpaciente[0].tentativas) { setTentativas(listpaciente[0].tentativas) }
            }
            else {
              listpaciente[0].dt_nascimento = moment(listpaciente[0].dt_nascimento).add(1, "day").format("DD/MM/YYYY");
              const newDados = {
                ...listpaciente[0],
                dt_nascimento: listpaciente[0].dt_nascimento,
                servico: dados.servico,
                preferencial: dados.preferencial
              };
              setDados(newDados);
            }
          }
        } else {
          if (dados && dados.cd_paciente) { return };
          if (dados) {
            if (dados.dt_nascimento) {
              const data_fmt = dados.dt_nascimento = moment(dados.dt_nascimento).add(1, "day").format("DD/MM/YYYY");
              const newDados = {
                ds_paciente: dados.ds_paciente,
                dt_nascimento: data_fmt,
                servico: dados.servico,
                preferencial: dados.preferencial
              };
              setDados(newDados);
            }
            if (!dados.ds_paciente) {
              setShowModal(false)
            }
          }
        }
      }

    }
    if (showModal) {
      if (dados && dados.qr) {
        return
      } else {
        rodarBuscaCPF();
      }
    }

  }, [dados, showModal, setDados, setShowModal]);
  async function Senha(valor: string | null = null) {
    if (dados?.qr && valor) {
      const listpaciente = await buscaPaciente({ cd_paciente: parseInt(valor) })
      if (listpaciente && listpaciente.length > 0) {
        listpaciente[0].dt_nascimento = moment(listpaciente[0].dt_nascimento).add(1, "day").format("DD/MM/YYYY");
        const newDados = { ...listpaciente[0], servico: dados.servico, preferencial: dados.preferencial };
        setDados(newDados)
      } else {
        window.alert("PACIENTE NÂO ENCONTRADO")
        return
      }
    } else if (dados?.qr && !valor) {
      window.alert("PACIENTE NÂO ENCONTRADO")
      return
    }
    else {
      if (dados) {
        setLoading(true)

        await SendClinux({ cd_paciente: dados.cd_paciente, ds_paciente: dados.ds_paciente, dt_nascimento: dados.dt_nascimento, preferencial: dados.preferencial, servico: dados.servico })
        setTimeout(() => { setLoading(false); window.location.href = "/" }, 600)
      }
    }
  }
  async function reset() {
    setTimeout(() => { setLoading(false); window.location.href = "/" }, 600)
  }
  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent>
        {invalido ? <DialogHeader></DialogHeader> :
          <DialogHeader>
            <DialogTitle className="text-xl font-normal">{dados?.servico == "C" ? "Entrega de Exames" : dados?.servico == "D" ? "Agendamento" : "Atendimento"}</DialogTitle>
            {dados?.qr ? <DialogDescription className="text-3xl font-bold text-black">{dados?.ds_paciente}</DialogDescription> : <DialogDescription className="text-3xl font-bold text-black">NOME: {dados?.ds_paciente}</DialogDescription>}
          </DialogHeader>}
        {invalido ? <div><h2 className="font-bold text-xl">{invalido}</h2><p>Você tem {tentativas} tentativas restantes!</p></div> : <div>
          <h2 className="font-bold text-xl">{dados?.ds_telefone && `Telefone: ${dados?.ds_telefone}`}</h2>
          <h2 className="font-bold text-xl">{dados?.ds_celular && `Celular: ${dados?.ds_celular}`}</h2>
          <h2 className="font-bold text-xl">{dados?.ds_celular_web && `Celular 2: ${dados?.ds_celular_web}`}</h2>
          {dados?.ds_observacao && <div><h2 className="font-bold text-xl">Obs.:</h2><p>{dados?.ds_observacao}</p></div>}
          <h2 className="font-bold text-xl">{dados?.cd_paciente && `ID Paciente: ${dados?.cd_paciente}`}</h2>
          <h2 className="font-bold text-xl">{dados?.dt_nascimento && `Data de Nascimeto: ${dados?.dt_nascimento}`}</h2>
        </div>}
        {dados?.qr && <form className="opacity-0" onSubmit={(e) => {
          e.preventDefault(); // impede reload da página
          const valor = (e.currentTarget.elements.namedItem("ID") as HTMLInputElement).value;
          Senha(valor); // a função que você quer chamar
        }}>
          <input type="text" name="ID" autoFocus={true} />
          <button type="submit">enviar</button>
        </form>}
        {!dados?.qr && dados?.servico != "" && !invalido &&
          <Button
            variant='outline' className="bg-green-400" onClick={() => { Senha() }} disabled={loading}>
            {loading ? <OrbitProgress /> : "OK"}
          </Button>}
        <Button
          variant='outline' className="bg-red-400" onClick={() => { if (tentativas && tentativas > 0) { setShowModal(false) } else if (tentativas <= 0 && !dados?.cd_paciente && !dados?.qr && dados?.tipo != 'NEW') { reset() } else (setShowModal(false)) }}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default function PatientModal() {
  const [showModal, setShowModal] = useState(false)
  const [dados, setDados] = useState<paciente | null>(null);
  const dataDialog = () => {
    return (<DialogPatient
      showModal={showModal}
      setShowModal={setShowModal}
      setDados={setDados}
      dados={dados}
    />)
  }
  return {
    setShowModal,
    DialogPatient: dataDialog,
    setDados,
  }
}