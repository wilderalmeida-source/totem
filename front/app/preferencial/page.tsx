import React from 'react'
import Link from 'next/link'
import Base from '../../components/base'
import Image from 'next/image'
import normal from '../../assets/icons/normal.png'
import idoso from '../../assets/icons/idosos.png'
import gestante from '../../assets/icons/gravida.png'
import autismo from '../../assets/icons/autismo.png'
import cadeirante from '../../assets/icons/cadeira.png'
import colo from '../../assets/icons/colo.png'
import atencao from '../../assets/icons//atencao.png'
import voltar from '../../assets/icons/voltar.png'
type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export default async function Home({ searchParams }: PageProps) {
const sp = await searchParams;
const servico = typeof sp.servico === "string" ? sp.servico : sp.servico?.[0] ?? "";
return (<>
      <Base key={''} type={''} props={<div className="flex mx-auto flex-col">
                      <div><h2 className="text-5xl text-center">Prioridade de Atendimento</h2>
                            <h6 className="text-2xl text-center mt-4">Escolha uma opção abaixo</h6>
                      </div>
                      <div className="mt-10 ml-0 grid grid-cols-2 gap-3 xl:grid-cols-4 lg:grid-cols-4 ">
                      <Link href={`/totem?servico=${servico}&preferencial=${0}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={normal} width={100} height={100} alt="Picture of the author" priority={true}/>ATENDIMENTO NORMAL</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${1}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={colo} width={100} height={100} alt="Picture of the author" priority={true}/>CRIANÇA DE COLO</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${1}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={gestante} width={100} height={100} alt="Picture of the author" priority={true}/>GESTANTE</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${1}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={idoso} width={100} height={100} alt="Picture of the author" priority={true}/>IDOSO</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${1}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={cadeirante} width={100} height={100} alt="Picture of the author" priority={true}/>CADEIRANTE</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${1}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={autismo} width={100} height={100} alt="Picture of the author" priority={true}/>AUTISTA</button></Link>
                      <Link href={`/totem?servico=${servico}&preferencial=${2}`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#f10b0b] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={atencao} width={100} height={100} alt="Picture of the author" priority={true}/>ESPECIAL</button></Link>
                      <Link href={`/`}><button className="pt-2 border-2 rounded-lg w-full h-full font-semibold bg-[#6b7280] text-white text-center text-2xl"><Image className="mx-auto invert mb-5"  src={voltar} width={100} height={100} alt="Picture of the author" priority={true}/>VOLTAR</button></Link>
                      </div>
                  </div>}/>

  </>)}
