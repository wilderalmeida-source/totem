'use client'
import {ReactElement } from 'react'
import { AtentionSound } from '@/services/fetchData'
import Link from 'next/link'
type servico={
  servico:string,
  ID:string
}
type props={
  servicos: servico[]
}
export default function Servicos({servicos}:props) {
  const buttons:Array<ReactElement> =[]
  for(let i=0; i<servicos.length;i++){
     buttons.push(<Link className="flex justify-center" key={servicos[i].ID} href={`/preferencial?servico=${servicos[i].ID}`}><button key={servicos[i].ID} className="border-2 rounded-lg w-1/2 h-16 bg-[#6b7280] font-semibold bg-gray-500 text-white text-2xl">{servicos[i].servico}</button></Link>)
  }
return (<>
                      <div className="self-center mt-10 gap-5 flex w-full flex-col content-center">
                            {buttons}
                      </div>
                      <div onClick={()=>{AtentionSound("play")}} className="cursor-pointer font-extrabold text-white self-start mr-10 bg-red-400 rounded-lg px-5 py-7 hover:bg-slate-400 hover:text-black">
                        Silêncio
                      </div>
  </>)}
