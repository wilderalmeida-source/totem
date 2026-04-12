'use client'
import { ReactElement, useEffect,useState } from "react"
import { DocumentData} from "../services/fetchData"
import Link from "next/link"
interface documento{
  cd_documento:number|null
  cd_atendimento:number|null
  ds_documento:string|null
  bb_documento:string|null
  dt_documento:string|null
  cd_funcionario:number|null
  ds_arquivo:string|null
  cd_tipo:number|null
  nr_documento:string|null
  cd_paciente:number|null
  dt_scanner:string|null
  sn_convertido:boolean|null
  atendimentos:string|null
  pacientes:string|null
  atendimentos_documentos_tipos?:{ds_tipo:string | null; }
  arquivo:string|null
}
interface numAtendimento{
    numero: number
}
export default function Documentos(numAtendimento:numAtendimento){
    const[p,setP]=useState<Array<ReactElement|null>|string>('Não possui arquivos')
    useEffect(()=>{
    const documentos= async()=>{
        const tableDoc:Array<documento> = []
        const listDoc = await DocumentData(numAtendimento.numero)
        if(listDoc.length>0){
        for (const i of listDoc){
            if(i){
                tableDoc.push(i)
            }
        }
        const reactDoc:Array<ReactElement|null> = tableDoc.map((documento)=>{
        if(documento.atendimentos_documentos_tipos?.ds_tipo){

        return(<Link href={`api/pdf?cd_documento=${documento.cd_documento}#view=FitH`} key={documento.cd_documento+"DIV"} target="_blank" className="w-full">{documento.atendimentos_documentos_tipos.ds_tipo}<hr /></Link>)
        }
        else{
            return null
        }
        })
        setP(reactDoc)
        }
    }
    documentos()
    },[numAtendimento]) 
    return(<>{p}</>
        
    )
}