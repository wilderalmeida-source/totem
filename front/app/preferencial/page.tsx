import type { StaticImageData } from 'next/image'
import Base from '@/components/ui/base'
import normal from '@/assets/icons/normal.png'
import idoso from '@/assets/icons/idosos.png'
import gestante from '@/assets/icons/gravida.png'
import autismo from '@/assets/icons/autismo.png'
import cadeirante from '@/assets/icons/cadeira.png'
import colo from '@/assets/icons/colo.png'
import atencao from '@/assets/icons/atencao.png'
import voltar from '@/assets/icons/voltar.png'
import PriorityOptions from '@/components/PriorityOptions'

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

                        <PriorityOptions options={OPCOES} servico={servico} />
                  </div>
            </Base>
      )
}
