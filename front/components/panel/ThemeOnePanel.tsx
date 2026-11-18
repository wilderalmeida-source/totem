'use client'
import type React from 'react'
import { useEffect, useState } from 'react'
import { Building2 } from 'lucide-react'
import type { PanelCall } from '@/lib/panel-call'
import type { QueuePerson } from '@/components/QueueList'
import { validNoticeSettings, noticeCategories, type NoticeSettings } from '@/lib/panel-notices'
import { ModalityPictogram, NoticePictogram } from './Pictogram'
import GoldMark from '@/components/GoldMark'
import BrandLogo from '@/components/brand/BrandLogo'
import { useBrand } from '@/components/brand/useBrand'
import { hasBrandLogo } from '@/lib/brand'

function shortName(name: string) {
  const words = name.trim().split(/\s+/)
  return words.length > 1 ? `${words[0]} ${words[words.length - 1][0]}.` : name
}
function ActivePanel({ current, people, painelId }: { current: PanelCall | null; people: QueuePerson[]; painelId: number }) {
  const [now, setNow] = useState<Date | null>(null)
  const [config, setConfig] = useState<NoticeSettings>({ enabled: true, items: [] })
  const [company, setCompany] = useState('CRI')
  const [cycle, setCycle] = useState(0)
  useEffect(() => { setNow(new Date()); const timer = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(timer) }, [])
  useEffect(() => {
    const controller = new AbortController()
    let refresh: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const response = await fetch('/api/informativos', { cache: 'no-store', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(8000)]) })
        if (!response.ok) return
        const value = await response.json()
        const companyName = value?.company
        if (!controller.signal.aborted && validNoticeSettings(value)) {
          setConfig(previous => JSON.stringify(previous) === JSON.stringify({ enabled: value.enabled, items: value.items }) ? previous : { enabled: value.enabled, items: value.items })
          if (typeof companyName === 'string') setCompany(companyName.slice(0, 150))
        }
      } catch { /* Preserve the last loaded notices while the connection recovers. */ }
      finally { if (!controller.signal.aborted) refresh = setTimeout(load, 60000) }
    }
    void load()
    return () => { controller.abort(); clearTimeout(refresh) }
  }, [])
  const items = config.enabled ? config.items.filter(item => item.active) : []
  const index = items.length ? cycle % items.length : 0
  const notice = items[index]
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setCycle(value => value + 1), notice.durationSeconds * 1000)
    return () => clearTimeout(timer)
  }, [cycle, config, notice?.id, notice?.durationSeconds])
  const name = current?.fullName || current?.name
  // Comunicado só com imagem ocupando todo o quadro (sem rótulo, título e texto).
  const fullImage = !!notice?.fullImage && !!notice.images?.length
  // Logo no canto superior substitui ícone e nome; na posição "saudação" o painel mantém o padrão.
  const brand = useBrand()
  const logoNoTopo = hasBrandLogo(brand) && brand?.placement === 'header'
  return <section className={`tv-panel ${!notice ? 'tv-no-notice' : ''}`} aria-label={`Painel de chamadas ${painelId}`}>
    <header className="tv-header">{logoNoTopo && brand
      ? <div className="tv-brand tv-brand-with-logo"><BrandLogo brand={brand} className="brand-logo-tv" alt={company} /><div><small>Painel de chamadas · Recepção {painelId}</small></div></div>
      : <div className="tv-brand"><span><Building2 className="tv-blue-mark" /><GoldMark className="tv-gold-mark" /></span><div><strong>{company}</strong><small>Painel de chamadas · Recepção {painelId}</small></div></div>}<div className="tv-clock"><time>{now?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) ?? '--:--'}</time><small>{now?.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'short' })}</small></div></header>
    <div className="tv-main">
      <section className="tv-current" aria-label="Chamando agora"><div className="tv-eyebrow"><span className="tv-live" />Chamando agora</div>
        <h1 key={current?.id ?? 'waiting'} className="tv-patient-name">{name || 'Aguardando chamada'}</h1>
        {current && <><div className="tv-destination"><ModalityPictogram name={current.modalidade} /><div><strong>{current.modalidade || current.guicheNome || current.recepcao}</strong><p>{[current.guicheNome, current.localizacao || current.recepcao].filter(Boolean).join(' · ')}</p></div></div><time className="tv-called-time">Chamado às {current.calledAt}</time></>}
      </section>
      {notice && <aside className={`tv-notice ${fullImage ? 'tv-notice-full' : ''}`} aria-label={noticeCategories[notice.category ?? 'informativos']}>{fullImage ? <div key={`${notice.id}:${cycle}`} className={`tv-notice-fullimages ${notice.images!.length > 1 ? 'tv-notice-fullimages-grid' : ''}`}>{notice.images!.map(image => { const src = `/api/media/file?name=${encodeURIComponent(image.file)}`; return <figure key={image.file} style={{ '--tv-full-bg': `url("${src}")` } as React.CSSProperties}><img src={src} alt={image.alt || notice.title} /></figure> })}</div> : <><div className="tv-notice-label"><NoticePictogram icon={notice.icon} /><span className="tv-eyebrow">{noticeCategories[notice.category ?? 'informativos']}{(notice.category ?? 'informativos') === 'informativos' && <span className="tv-notice-alert-dot" aria-hidden="true" />}</span></div>
        <div key={`${notice.id}:${cycle}`} className="tv-notice-copy"><h2>{notice.title}</h2><p>{notice.text}</p>
          {!!notice.images?.length && <div className={`tv-notice-images ${notice.images.length > 1 ? 'tv-notice-images-grid' : ''}`}>{notice.images.map(image => <img key={image.file} src={`/api/media/file?name=${encodeURIComponent(image.file)}`} alt={image.alt} />)}</div>}
        </div></>}
        <div className="tv-progress" aria-label={`Informativo ${index + 1} de ${items.length}`}>{items.map((item, i) => <span key={`${item.id}:${cycle}`}><i style={{ width: i < index ? '100%' : '0%', ...(i === index ? { animation: `tv-progress ${notice.durationSeconds}s linear forwards` } : {}) }} /></span>)}</div>
      </aside>}
    </div>
    <footer className="tv-history"><h2 className="tv-eyebrow">Chamadas anteriores</h2><div className="tv-history-grid">{people.slice(0, 3).map((person, i) => <article key={`${person.id}:${person.name}`} style={{ opacity: 1 - i * .15 }}><ModalityPictogram name={person.modalidade} /><div><div className="tv-history-name"><strong>{shortName(person.name)}</strong><time>{person.calledAt}</time></div><p>{[person.modalidade, person.instruction].filter(Boolean).join(' · ')}</p></div></article>)}{people.length === 0 && <p className="tv-empty">As chamadas anteriores aparecerão aqui.</p>}</div></footer>
  </section>
}

export default function ThemeOnePanel(props: { current: PanelCall | null; people: QueuePerson[]; painelId: number }) {
  const [active, setActive] = useState(false)
  useEffect(() => {
    const update = () => setActive(['theme1', 'theme2'].includes(document.documentElement.dataset.visualTheme ?? ''))
    update(); const observer = new MutationObserver(update)
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-visual-theme'] })
    return () => observer.disconnect()
  }, [])
  return active ? <ActivePanel {...props} /> : null
}
