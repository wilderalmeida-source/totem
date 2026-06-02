"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "@/components/ui/dialog"
import { Dispatch, SetStateAction, useEffect, useState } from "react"
import { Button } from "../ui/button"
import { SendClinux } from "@/components/functions/sendClinux"
import { buscaPaciente, type Atendimento, BuscaAtendimentos } from "../../services/fetchData"
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


export function DialogPatient({ showModal, setShowModal, dados, setDados, setExames, exames }: {
  setExames: Dispatch<SetStateAction<Atendimento[] | null>>,
  exames: Atendimento[] | null,
  setShowModal: Dispatch<SetStateAction<boolean>>,
  setDados: Dispatch<SetStateAction<paciente | null>>,
  dados: paciente | null
  showModal: boolean
  
}) {
  const [loading, setLoading] = useState(false)
  const imageOK = <Image className="mx-auto" width={20} height={20} src={ok} alt="OK" />
  const imageAtention = <Image className="mx-auto" width={20} height={20} src={atention} alt="Caution" />
  const [invalido, setIvalido] = useState<string | null>(null)
  const [tentativas, setTentativas] = useState<number>(0)
  useEffect(() => {
    async function rodarBuscaCPF() {
      if (dados?.tipo === "CPF" && dados?.ds_cpf) {
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
              setTentativas(listpaciente[0].tentativas)
            }
          } else {
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
          if (dados.cd_paciente) {return};
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
          if (dados) {
            if (dados.dt_nascimento) {
              const newDados = {
                ds_paciente: dados.ds_paciente,
                dt_nascimento: dados.dt_nascimento,
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
    const listarExames= async (cd_paciente:number)=>{
      if(exames){
        return
      }
       const hoje = new Date()
          hoje.setHours(0, 0, 0, 0)
          if (dados?.servico === "C") {
          const entrega = await EntregaDeExames(cd_paciente);
          console.log("entrega: "+entrega)
          if(entrega && entrega.length>0){
          const relatEntrega = entrega.slice(0, 10);
            setExames(relatEntrega)
          }else{
            setExames([])
          }
          }else{
              const atendimentos = await BuscaAtendimentos({cd_paciente:cd_paciente,date:{from:hoje}})
              if(atendimentos && atendimentos.length>0){
              const listar = [2, 3, 7]
              const examesProcedimentos = atendimentos.filter((i) => { if (i.exames && i.exames.length > 0 && i.ds_status && listar.includes(i.ds_status)) { return i } })
              setExames(examesProcedimentos)}
              else(setExames([]))
          }
    }
    if (dados && dados.qr) {
      return
    } else if(dados && dados.cd_paciente && dados.cd_paciente){
      listarExames(dados.cd_paciente);
    }
    else {
      rodarBuscaCPF();
    }
  }, [dados, showModal, setDados, setShowModal,setExames,exames]);


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
  const [exames, setExames] = useState<Atendimento[] | null>(null);
  const dataDialog = () => {
    return (<DialogPatient
      showModal={showModal}
      setShowModal={setShowModal}
      setDados={setDados}
      dados={dados}
      setExames={setExames}
      exames={exames}
    />)
  }
  return {
    setShowModal,
    DialogPatient: dataDialog,
    setDados,
    setExames,
  }
}