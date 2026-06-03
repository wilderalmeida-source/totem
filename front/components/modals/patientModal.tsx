"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog"
import { Dispatch, SetStateAction, useState } from "react"
import { Button } from "../ui/button"
import { SendClinux } from "@/components/functions/sendClinux"
import { buscaPaciente, type Atendimento } from "../../services/fetchData"
import Image from 'next/image';
import ok from "../../assets/icons/ok.png"
import atention from "../../assets/icons/atention.png"
import moment from "moment"
import { EntregaDeExames } from "../functions/lastExames"
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


export function DialogPatient({ showModal, setShowModal, dados, setDados, setExames, exames, setLoading,loading,tentativas,invalido }: {
  setExames: Dispatch<SetStateAction<Atendimento[] | null>>,
  exames: Atendimento[] | null,
  setShowModal: Dispatch<SetStateAction<boolean>>,
  setDados: Dispatch<SetStateAction<paciente | null>>,
  dados: paciente | null
  showModal: boolean
  loading: boolean
  setLoading:Dispatch<SetStateAction<boolean>>,
  setTentativas:Dispatch<SetStateAction<number | null>>,
  tentativas:number | null
  setInvalido:Dispatch<SetStateAction<string | null>>
  invalido:string | null
  
}) {
  const imageOK = <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
  const imageAtention = <Image className="mx-auto" width={20} height={20} src={atention} alt="Caution" />
  async function Senha(valor: string | null = null) {
    if (dados?.qr && valor) {
      const listpaciente = await buscaPaciente({ cd_paciente: parseInt(valor) })
      if (listpaciente && listpaciente.length > 0) {
        const newDados = { ...listpaciente[0], servico: dados.servico, preferencial: dados.preferencial };
        if (dados.servico === "C" && listpaciente[0].cd_paciente) {
          const entrega = await EntregaDeExames(listpaciente[0].cd_paciente);
          const relatEntrega = entrega.filter((i) => [5].includes(i.status ?? -999)).slice(0, 10);
          setExames(relatEntrega)
          
        }
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


  const element = []
  let key = 1
  if (exames) {
    for (const i of exames) {
      if (i.exames) {
        for (const j of i.exames) {
          element.push(<tr key={key}><td>{j.procedimentos_exames_cd_procedimentoToprocedimentos?.ds_procedimento}</td><td>{j.dt_assinado ? imageOK : imageAtention}</td></tr>)
          key++
        }
      }
    }
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
          <h2 className="font-bold text-xl">{dados?.dt_nascimento && `Data de Nascimeto: ${moment(dados.dt_nascimento).utc().format("DD/MM/YYYY")}`}</h2>
        </div>}
        {invalido?<div></div>:exames&&exames.length>0&&<div>
          <table className="w-full text-sm text-left rtl:text-right text-gray-500 dark:text-gray-400 h-4">
            <thead className="text-xs text-gray-700 uppercase bg-gray-300 dark:bg-gray-700 dark:text-gray-400 sticky top-0 bg-primary">
              <tr>
                <th scope="col" className="px-6 py-3 w-64 bg-slate-300">Exame</th>
                <th scope="col" className="px-6 py-3 w-1/5 bg-slate-300">Laudado</th>
              </tr>
            </thead>
            <tbody className="h-4 bg-ternary">
              {element}
            </tbody>
          </table>
        </div>
        }
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
          variant='outline' className="bg-red-400" onClick={() => { if (tentativas && tentativas > 0) { setShowModal(false) } else if (tentativas&&tentativas <= 0 && !dados?.cd_paciente && !dados?.qr && dados?.tipo != 'NEW') { reset() } else (setShowModal(false)) }}>
          Cancelar
        </Button>
      </DialogContent>
    </Dialog>
  )
}

export default function PatientModal() {
  const [showModal, setShowModal] = useState(false)
  const [dados, setDados] = useState<paciente | null>(null);
  const [exames, setExames] = useState<Atendimento[] | null>(null);
  const [tentativas, setTentativas] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [invalido, setInvalido] = useState<string | null>(null);

  const dataDialog = () => {
    return (<DialogPatient
      showModal={showModal}
      setShowModal={setShowModal}
      setDados={setDados}
      dados={dados}
      setExames={setExames}
      exames={exames}
      setLoading={setLoading}
      loading={loading}
      setTentativas={setTentativas}
      tentativas={tentativas}
      setInvalido={setInvalido}
      invalido={invalido}
    />)
  }
  return {
    setShowModal,
    DialogPatient: dataDialog,
    setDados,
    setExames,
    setLoading,
    setTentativas,
    setInvalido,
  }
}