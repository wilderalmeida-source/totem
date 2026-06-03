'use client'
import moment from "moment"
import Image from 'next/image'
import docsIcon from "../../assets/img/docs.svg"
import ShortUniqueId from "short-unique-id"
import { ReactElement, useCallback, useContext, useEffect, useState } from "react"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import Documentos from "../../components/document"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ptBR } from "date-fns/locale"
import { BuscaAtendimentos, type Atendimento, type AtendimentoFiltro } from "../../services/fetchData"
import { modalContext } from "@/components/modals/providers"

interface SelectProps {
  listMedicos: Array<ReactElement>
  ListSalas: Array<ReactElement>
}

export function Table({ listMedicos, ListSalas }: SelectProps) {
  const { setShowModal, setDados } = useContext(modalContext)

  const [tr, setTr] = useState<Array<undefined | ReactElement>>([])
  const today = new Date(); today.setHours(today.getHours() - 3)
  const [date, setDate] = useState<DateRange | undefined>({ from: today, to: today })

  const [buscaMedic, setBuscaMed] = useState<string | undefined>(undefined)
  const [buscaSala, setBuscaSala] = useState<string | undefined>(undefined)
  const [buscaPaciente, setBuscaPac] = useState<string | undefined>(undefined)
  const [buscaStatus, setBuscaStatus] = useState<string | undefined>(undefined)

  const [updateTable, setUpdate] = useState(false)
  const [semAgenda, setSem] = useState<string | null>(null)
  const [countCancelados, setCountCancelados] = useState<number>(0)
  const [countFinalizados, setCountFinalizados] = useState<number>(0)
  const [countAgendados, setCountAgendados] = useState<number>(0)

  // -------- Agenda MEMOIZADA (depende de filtros e data) --------
  const Agenda = useCallback(async () => {
    setSem(null)

    const filtros: AtendimentoFiltro = { buscaMedic, buscaSala, buscaPaciente, buscaStatus, date }
    const dados: Atendimento[] = await BuscaAtendimentos(filtros)

    if (!dados || dados.length < 1) {
      setSem('Não possui agenda')
      setCountCancelados(0)
      setCountFinalizados(0)
      setCountAgendados(0)
      setTr([])
      return
    }

    let countC = 0, countA = 0, countF = 0
    const linha: Array<ReactElement | undefined> = dados.map((procedimeto: Atendimento) => {
      if (!procedimeto.pacientes_atendimentos_cd_pacienteTopacientes) return undefined

      let status = "", color = ""
      switch (procedimeto.ds_status) {
        case 1: status = 'Cancelado'; color = "text-[color:gray]"; countC++; break
        case 2: status = 'Reservado'; color = "text-[color:red]"; countA++; break
        case 3: status = 'Confirmado'; color = "text-[color:blue]"; countA++; break
        case 5: status = 'Finalizado'; color = "text-[color:black]"; countF++; break
        case 6: status = 'Entrege';   color = "text-green-500";    countF++; break
        case 11: status = 'Recepcao'; color = "text-[color:purple]"; countA++; break
      }

      const examesString = (procedimeto.exames ?? []).map((ex) => {
        if (!ex.procedimentos_exames_cd_procedimentoToprocedimentos) return undefined
        const generate = new ShortUniqueId({ length: 6 })
        return <p key={generate.rnd()}>{ex.procedimentos_exames_cd_procedimentoToprocedimentos.ds_procedimento}</p>
      })

      const dateStr = moment(procedimeto.dt_data).add(1, 'day').format("DD/MM/YYYY")

      return (
        <tr key={procedimeto.cd_atendimento} className={`${color} border-b-2 border-b-black bg-gray-200/[0.6] dark:bg-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-100`}>
          <td className="px-3 w-8">{dateStr}</td>
          <td className="px-3 py-2 w-8 text-center">{procedimeto.dt_hora?.slice(11, 16)}</td>
          <td
            className="px-3 py-2 truncate overflow-hidden max-w-44 cursor-pointer"
            onClick={() => {
              setShowModal(true)
              setDados({
                ds_paciente: procedimeto.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente ?? "",
                ds_telefone: procedimeto.pacientes_atendimentos_cd_pacienteTopacientes?.ds_telefone ?? "",
                ds_celular: procedimeto.pacientes_atendimentos_cd_pacienteTopacientes?.ds_celular ?? "",
                ds_celular_web:procedimeto.pacientes_atendimentos_cd_pacienteTopacientes?.ds_celular_web??"",
                ds_observacao: procedimeto?.ds_observacao??"",
                servico: "", preferencial: 0,
                
              })
            }}
          >
            {procedimeto.pacientes_atendimentos_cd_pacienteTopacientes?.ds_paciente}
          </td>
          <td className="px-3 py-2 w-1/12">{procedimeto.medicos_atendimentos_cd_medicoTomedicos?.ds_medico.split(" ")[0]}</td>
          <td className="px-3 truncate overflow-hidden max-w-36">{examesString}</td>
          <td className="px-3 py-2 w-2/12">{procedimeto.salas?.ds_sala}</td>
          <td className="px-3 py-2 max-w-24">{status}</td>
          <td className="px-3 py-2 max-w-24">{procedimeto.ds_senha}</td>
          <td className="px-3 py-2 max-w-24">{procedimeto.dt_hora_senha?.slice(11, 16)}</td>
          <td className="px-3 py-2 max-w-24">
            <Popover>
              <PopoverTrigger><Image src={docsIcon} alt="Scanner" /></PopoverTrigger>
              <PopoverContent className="flex flex-1 flex-col">
                <Documentos numero={procedimeto.cd_atendimento} />
              </PopoverContent>
            </Popover>
          </td>
        </tr>
      )
    })

    setTr(linha)
    setCountAgendados(countA)
    setCountFinalizados(countF)
    setCountCancelados(countC)
  }, [buscaMedic, buscaSala, buscaPaciente, buscaStatus, date, setDados, setShowModal])

  // -------- Effect: roda quando clica ATUALIZAR ou quando filtros mudam --------
  useEffect(() => {
    setUpdate(false)
    void Agenda()
  }, [updateTable, Agenda])

  return (
    <>
      <div className="grid grid-cols-4 gap-4 ml-3">
        <h1 className="col-span-4">AGENDA DE PACIENTES CRI</h1>
        <div className="col-span-3 flex flex-1 mt-3 items-center">
          <input
            type="text"
            placeholder="Nome do Paciente"
            className="border-1 border-gray-400 h-10 rounded-md w-2/5"
            onChange={(e) => { setBuscaPac(e.target.value.toUpperCase()) }}
          />
          <div className={cn("grid gap-2")}>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="date"
                  variant={"outline"}
                  className={cn(
                    "w-[300px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon />
                  {date?.from ? (
                    date.to ? (
                      <>
                        {format(date.from, "dd LLL, y")} -{" "}
                        {format(date.to, "dd LLL, y")}
                      </>
                    ) : (
                      format(date.from, "dd LLL, y")
                    )
                  ) : (
                    <span>Escolha uma data</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={date?.from}
                  selected={date}
                  onSelect={setDate}
                  numberOfMonths={2}
                  locale={ptBR}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="flex flex-1 gap-3 mb-5 items-center row-start-3 col-span-3">
          <div>
            <label htmlFor="medicos">MEDICOS: </label>
            <select
              name="medicos"
              id="medicos"
              className="border-1 border-gray-400 max-w-32 text-black"
              onChange={(e) => { setBuscaMed(e.target.value) }}
            >
              <option key='0' value={undefined}>TODOS</option>
              {listMedicos}
            </select>
          </div>
          <div>
            <label htmlFor="status">STATUS: </label>
            <select
              name="status"
              id="status"
              className="border-1 border-gray-400 max-w-32"
              onChange={(e) => { setBuscaStatus(e.target.value) }}
            >
              <option value={undefined}>TODOS</option>
              <option value='1'>CANCELADO</option>
              <option value='2'>RESERVADO</option>
              <option value='3'>CONFIRMADO</option>
              <option value='5'>FINALIZADO</option>
              <option value='6'>ENTREGE</option>
              <option value='11'>RECEPÇÃO</option>
            </select>
          </div>
          <div>
            <label htmlFor="modalidade">MODALIDADE: </label>
            <select
              name="modalidade"
              id="modalidade"
              className="border-1 border-gray-400"
              onChange={(e) => { setBuscaSala(e.target.value)}}
            >
              <option key='0' value={undefined}>TODOS</option>
              {ListSalas}
            </select>
          </div>
          <button
            className='bg-yes px-3 font-bold rounded-md py-2 border border-spacing-1 hover:bg-hover'
            type="submit"
            onClick={() => { setUpdate(true) }}
          >
            ATUALIZAR
          </button>
        </div>

        <div>
          <p>Agenda: {countAgendados}</p>
          <p>Finalizados: {countFinalizados}</p>
          <p>Cancelados: {countCancelados}</p>
        </div>
      </div>

      {semAgenda
        ? <div>{semAgenda}</div>
        : <div>
            <table className="w-full text-sm text-left rtl:text-right h-4">
              <thead className="text-xs uppercase bg-gray-300 dark:bg-gray-100 sticky top-0">
                <tr>
                  <th className="pl-3 py-3">Data</th>
                  <th className="pl-3 py-3">Hora</th>
                  <th className="pl-3 py-3">Paciente</th>
                  <th className="pl-3 py-3">Medico</th>
                  <th className="pl-3 py-3">Procedimento</th>
                  <th className="pl-3 py-3">Sala</th>
                  <th className="pl-3 py-3">Status</th>
                  <th className="pl-3 py-3">Senha</th>
                  <th className="pl-3 py-3">Hora Senha</th>
                  <th className="pl-3 py-3">Açoes</th>
                </tr>
              </thead>
              <tbody className="h-4 bg-gray-200">
                {tr}
              </tbody>
            </table>
          </div>
      }
    </>
  )
}
