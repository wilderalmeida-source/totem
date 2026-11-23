'use client'
import type React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Building2, DoorOpen } from 'lucide-react'
import type { PanelCall } from '@/lib/panel-call'
import type { QueuePerson } from '@/components/QueueList'
import { validNoticeSettings, noticeCategories, focusForCall, type ModalityFocus, type NoticeSettings } from '@/lib/panel-notices'
import { ModalityPictogram, NoticePictogram } from './Pictogram'
import { useFitText } from './useFitText'
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
  // Avisos da modalidade ficam fora da playlist: só aparecem quando um paciente da modalidade é chamado.
  const items = config.enabled ? config.items.filter(item => item.active && item.category !== 'modalidade') : []
  const index = items.length ? cycle % items.length : 0
  const [focus, setFocus] = useState<ModalityFocus | null>(null)
  const lastCall = useRef<string | undefined>(current?.id)
  useEffect(() => {
    if (!current || current.id === lastCall.current) return
    lastCall.current = current.id
    if (!config.enabled) return
    setFocus(previous => focusForCall(previous, config.items, current, Date.now()))
  }, [current?.id])
  // Tempo do aviso da modalidade acabou: a playlist volta de onde parou.
  useEffect(() => {
    if (!focus) return
    const timer = setTimeout(() => setFocus(null), Math.max(0, focus.until - Date.now()))
    return () => clearTimeout(timer)
  }, [focus])
  const notice = focus?.notice ?? items[index]
  useEffect(() => {
    if (!notice || focus) return
    const timer = setTimeout(() => setCycle(value => value + 1), notice.durationSeconds * 1000)
    return () => clearTimeout(timer)
  }, [cycle, config, notice?.id, notice?.durationSeconds, focus])
  // Barra do aviso da modalidade: calculada só quando o tempo muda (o relógio redesenha a tela a cada segundo).
  const focusBar = useMemo(() => focus ? { animation: `tv-progress ${(focus.until - focus.start) / 1000}s linear ${-(Date.now() - focus.start) / 1000}s forwards` } : undefined, [focus?.until, focus?.start])
  const noticeKey = focus ? `${focus.notice.id}:${focus.start}` : `${notice?.id}:${cycle}`
  const noticeLabel = focus ? (focus.modalidade ? `Aviso · ${focus.modalidade}` : noticeCategories.modalidade) : noticeCategories[notice?.category ?? 'informativos']
  const name = current?.fullName || current?.name
  // Comunicado só com imagem ocupando todo o quadro (sem rótulo, título e texto).
  const fullImage = !!notice?.fullImage && !!notice.images?.length
  // Comunicado longo: a letra diminui até caber no quadro.
  const fitRef = useRef<HTMLDivElement>(null)
  useFitText(fitRef, `${noticeKey}:${notice?.title}:${notice?.text}:${fullImage}`)
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
        {current && <><div className="tv-destination tv-destination-desk"><span className="tv-desk-icon" aria-hidden="true"><DoorOpen /></span><div><span className="tv-desk-caption">Dirija-se ao</span><strong>{current.guicheNome || 'Guichê'}</strong>{(current.localizacao || current.recepcao) && <p className="tv-desk-place">{current.localizacao || current.recepcao}</p>}{current.modalidade && <small className="tv-desk-modality"><ModalityPictogram name={current.modalidade} />{current.modalidade}</small>}</div></div><time className="tv-called-time">Chamado às {current.calledAt}</time></>}
      </section>
      {notice && <aside className={`tv-notice ${fullImage ? 'tv-notice-full' : ''}`} aria-label={noticeLabel}>{fullImage ? <div key={noticeKey} className={`tv-notice-fullimages ${notice.images!.length > 1 ? 'tv-notice-fullimages-grid' : ''}`}>{notice.images!.map(image => { const src = `/api/media/file?name=${encodeURIComponent(image.file)}`; return <figure key={image.file} style={{ '--tv-full-bg': `url("${src}")` } as React.CSSProperties}><img src={src} alt={image.alt || notice.title} /></figure> })}</div> : <><div className="tv-notice-label"><NoticePictogram icon={notice.icon} /><span className="tv-eyebrow">{noticeLabel}{!focus && (notice.category ?? 'informativos') === 'informativos' && <span className="tv-notice-alert-dot" aria-hidden="true" />}</span></div>
        <div ref={fitRef} className="tv-notice-fit"><div key={noticeKey} className="tv-notice-copy"><h2>{notice.title}</h2><p>{notice.text}</p>
          {!!notice.images?.length && <div className={`tv-notice-images ${notice.images.length > 1 ? 'tv-notice-images-grid' : ''}`}>{notice.images.map(image => <img key={image.file} src={`/api/media/file?name=${encodeURIComponent(image.file)}`} alt={image.alt} />)}</div>}
        </div></div></>}
        {focus ? <div className="tv-progress" aria-label="Aviso da modalidade"><span><i key={focus.until} style={focusBar} /></span></div> : <div className="tv-progress" aria-label={`Informativo ${index + 1} de ${items.length}`}>{items.map((item, i) => <span key={`${item.id}:${cycle}`}><i style={{ width: i < index ? '100%' : '0%', ...(i === index ? { animation: `tv-progress ${notice.durationSeconds}s linear forwards` } : {}) }} /></span>)}</div>}
      </aside>}
    </div>
    <footer className="tv-history"><h2 className="tv-eyebrow">Chamadas anteriores</h2><div className="tv-history-grid">{people.slice(0, 3).map((person, i) => <article key={`${person.id}:${person.name}`} style={{ opacity: 1 - i * .15 }}><ModalityPictogram name={person.modalidade} /><div><div className="tv-history-name"><strong>{shortName(person.name)}</strong><time>{person.calledAt}</time></div><p>{person.instruction && <b className="tv-history-desk">{person.instruction}</b>}{person.instruction && person.modalidade ? ' · ' : ''}{person.modalidade}</p></div></article>)}{people.length === 0 && <p className="tv-empty">As chamadas anteriores aparecerão aqui.</p>}</div></footer>
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
