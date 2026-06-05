import Link from 'next/link'
import Image, { StaticImageData } from 'next/image'
import Base from '@/components/ui/base'
import normal from '@/assets/icons/normal.png'
import idoso from '@/assets/icons/idosos.png'
import gestante from '@/assets/icons/gravida.png'
import autismo from '@/assets/icons/autismo.png'
import cadeirante from '@/assets/icons/cadeira.png'
import colo from '@/assets/icons/colo.png'
import atencao from '@/assets/icons/atencao.png'
import voltar from '@/assets/icons/voltar.png'

// ─── Tipos ────────────────────────────────────────────────────────────────────
type PageProps = {
      searchParams: Promise<Record<string, string | string[] | undefined>>
}

type OpcaoPreferencial = {
      label: string
      icone: StaticImageData
      preferencial: number
      href?: string        // override de rota (ex: voltar)
      cor?: string         // override de cor de fundo
}

// ─── Configuração dos botões ──────────────────────────────────────────────────
const OPCOES: OpcaoPreferencial[] = [
      { label: 'ATENDIMENTO NORMAL', icone: normal, preferencial: 0 },
      { label: 'CRIANÇA DE COLO', icone: colo, preferencial: 1 },
      { label: 'GESTANTE', icone: gestante, preferencial: 1 },
      { label: 'IDOSO', icone: idoso, preferencial: 1 },
      { label: 'CADEIRANTE', icone: cadeirante, preferencial: 1 },
      { label: 'AUTISTA', icone: autismo, preferencial: 1 },
      { label: 'ESPECIAL', icone: atencao, preferencial: 2, cor: 'bg-red-600' },
      { label: 'VOLTAR', icone: voltar, preferencial: 0, href: '/' },
]

// ─── Página ───────────────────────────────────────────────────────────────────
export default async function Preferencial({ searchParams }: PageProps) {
      const sp = await searchParams
      const servico = typeof sp.servico === 'string' ? sp.servico : sp.servico?.[0] ?? ''

      return (
            <Base type="preferencial">
                  <div className="flex mx-auto flex-col">
                        <div>
                              <h2 className="text-5xl text-center">Prioridade de Atendimento</h2>
                              <h6 className="text-2xl text-center mt-4">Escolha uma opção abaixo</h6>
                        </div>

                        <div className="mt-10 grid grid-cols-2 gap-3 xl:grid-cols-4 lg:grid-cols-4">
                              {OPCOES.map(({ label, icone, preferencial, href, cor }) => (
                                    <Link key={label} href={href ?? `/totem?servico=${servico}&preferencial=${preferencial}`}>
                                          <button className={`pt-2 border-2 rounded-lg w-full h-full font-semibold text-white text-center text-2xl ${cor ?? 'bg-gray-500'}`}>
                                                <Image
                                                      className="mx-auto invert mb-5"
                                                      src={icone}
                                                      width={100}
                                                      height={100}
                                                      alt={label}
                                                      priority
                                                />
                                                {label}
                                          </button>
                                    </Link>
                              ))}
                        </div>
                  </div>
            </Base>
      )
}