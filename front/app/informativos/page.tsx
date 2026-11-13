'use client'
import { useEffect, useState } from 'react'
import { Plus, ArrowUp, ArrowDown, Trash2, Save } from 'lucide-react'
import { validNoticeSettings, noticeCategories, type Notice, type NoticeSettings } from '@/lib/panel-notices'
import { NoticePictogram } from '@/components/panel/Pictogram'

const iconOptions = [['info', 'Informação'], ['alert', 'Aviso'], ['results', 'Resultados'], ['calendar', 'Agendamento'], ['heart', 'Saúde']]
function newId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16)); bytes[6] = (bytes[6] & 15) | 64; bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
}
export default function NoticesPage() {
  const [config, setConfig] = useState<NoticeSettings | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    fetch('/api/informativos', { cache: 'no-store', signal: controller.signal }).then(async response => {
      const value = await response.json()
      if (!response.ok || !validNoticeSettings(value)) throw Error('Não foi possível carregar os informativos. Confira a atualização do banco.')
      setConfig({ enabled: value.enabled, items: value.items })
    }).catch(e => { if (!controller.signal.aborted) setError(e.message) })
    return () => controller.abort()
  }, [])
  function update(id: string, value: Partial<Notice>) {
    setNotice(''); setConfig(current => current ? { ...current, items: current.items.map(item => item.id === id ? { ...item, ...value } : item) } : current)
  }
  function move(index: number, direction: number) {
    setNotice(''); setConfig(current => {
      if (!current || index + direction < 0 || index + direction >= current.items.length) return current
      const items = [...current.items]; [items[index], items[index + direction]] = [items[index + direction], items[index]]
      return { ...current, items }
    })
  }
  async function save() {
    if (!validNoticeSettings(config)) { setError('Preencha título e texto de todos os itens. A duração deve ser de 5 a 300 segundos.'); return }
    setBusy(true); setError(''); setNotice('')
    try {
      const response = await fetch('/api/informativos', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(config) })
      if (!response.ok) throw Error('Não foi possível salvar os informativos.')
      setNotice('Informativos salvos. Os painéis dos Temas 1 e 2 atualizam a playlist em até um minuto.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao salvar.') }
    finally { setBusy(false) }
  }
  async function uploadImages(item: Notice, files: File[]) {
    if (!files.length) return
    if ((item.images?.length ?? 0) + files.length > 4 || files.some(file => file.size > 5 * 1024 * 1024 || !['image/jpeg', 'image/png', 'image/webp'].includes(file.type))) {
      setError('Cada aviso aceita até quatro imagens PNG, JPEG ou WebP, de até 5 MB cada.'); return
    }
    setBusy(true); setError(''); setNotice('')
    try {
      const form = new FormData(); files.forEach(file => form.append('files', file))
      const response = await fetch('/api/informativos/images', { method: 'POST', body: form })
      const value = await response.json()
      if (!response.ok || !Array.isArray(value.images)) throw Error(value.error || 'Não foi possível enviar as imagens.')
      update(item.id, { images: [...(item.images ?? []), ...value.images] })
      setNotice('Imagens enviadas. Clique em Salvar playlist para publicar o aviso com elas.')
    } catch (e) { setError(e instanceof Error ? e.message : 'Erro ao enviar imagens.') }
    finally { setBusy(false) }
  }
  return <main className="min-h-screen bg-slate-100 p-5 md:p-10"><div className="mx-auto max-w-5xl">
    <h1 className="text-3xl font-bold">Informativos do painel</h1><p className="mt-2 text-slate-600">Playlist de avisos com textos e imagens exibidos nos painéis dos Temas 1 e 2. Os itens ativos são repetidos na ordem abaixo.</p>
    {error && <p role="alert" className="my-4 rounded-xl bg-red-50 p-4 text-red-700">{error}</p>}
    {notice && <p role="status" className="my-4 rounded-xl bg-green-50 p-4 text-green-800">{notice}</p>}
    {!config ? <p className="mt-6">{error ? 'Recarregue a página para tentar novamente.' : 'Carregando…'}</p> : <fieldset disabled={busy} className="mt-6 space-y-5 disabled:opacity-60">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-white p-4"><label className="flex items-center gap-3 font-semibold"><input type="checkbox" checked={config.enabled} onChange={e => { setNotice(''); setConfig({ ...config, enabled: e.target.checked }) }} />Exibir informativos</label><div className="flex gap-3"><button type="button" disabled={config.items.length >= 50} onClick={() => { setNotice(''); setConfig({ ...config, items: [...config.items, { id: newId(), title: '', text: '', icon: 'info', durationSeconds: 15, active: true }] }) }} className="flex items-center gap-2 rounded-xl border px-4 py-2 disabled:opacity-40"><Plus size={18} />Adicionar</button><button type="button" onClick={save} className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 font-bold text-white"><Save size={18} />{busy ? 'Salvando…' : 'Salvar playlist'}</button></div></div>
      {!config.items.length && <p className="rounded-2xl border border-dashed p-8 text-center text-slate-500">Nenhum informativo cadastrado. Adicione o primeiro item.</p>}
      {config.items.map((item, index) => <article key={item.id} className="rounded-2xl border bg-white p-5">
        <div className="mb-4"><label>Categoria<select className="ml-3 rounded-xl border p-2" value={item.category ?? 'informativos'} onChange={e => update(item.id, { category: e.target.value as Notice['category'] })}>{Object.entries(noticeCategories).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p className="mt-1 text-xs text-slate-500">A categoria Informativo exibe um indicador vermelho piscante no painel.</p></div>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><h2 className="font-bold">{index + 1}. {item.title || 'Novo informativo'}</h2><div className="flex items-center gap-2"><label className="mr-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={item.active} onChange={e => update(item.id, { active: e.target.checked })} />Ativo</label><button type="button" disabled={index === 0} aria-label={`Subir informativo ${index + 1}`} onClick={() => move(index, -1)} className="rounded border p-2 disabled:opacity-30"><ArrowUp size={18} /></button><button type="button" disabled={index === config.items.length - 1} aria-label={`Descer informativo ${index + 1}`} onClick={() => move(index, 1)} className="rounded border p-2 disabled:opacity-30"><ArrowDown size={18} /></button><button type="button" aria-label={`Remover informativo ${index + 1}`} onClick={() => { setNotice(''); setConfig({ ...config, items: config.items.filter(value => value.id !== item.id) }) }} className="rounded border p-2 text-red-600"><Trash2 size={18} /></button></div></div>
        <div className="grid gap-4 md:grid-cols-3"><label className="md:col-span-2">Título<input className="mt-1 w-full rounded-xl border p-3" maxLength={120} value={item.title} onChange={e => update(item.id, { title: e.target.value })} /></label><label>Duração em segundos<input className="mt-1 w-full rounded-xl border p-3" type="number" min={5} max={300} value={item.durationSeconds} onChange={e => update(item.id, { durationSeconds: Number(e.target.value) })} /></label><label className="md:col-span-2">Texto<textarea className="mt-1 w-full rounded-xl border p-3" rows={4} maxLength={700} value={item.text} onChange={e => update(item.id, { text: e.target.value })} /></label><label>Ícone<select className="mt-1 w-full rounded-xl border p-3" value={item.icon} onChange={e => update(item.id, { icon: e.target.value as Notice['icon'] })}>{iconOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select><span className="mt-3 block text-blue-700"><NoticePictogram icon={item.icon} /></span></label></div>
        <div className="mt-4 rounded-xl border p-4"><label className="block font-semibold">Imagens opcionais (até 4)<input className="mt-2 block w-full text-sm" type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={(item.images?.length ?? 0) >= 4} onChange={e => { const files = Array.from(e.currentTarget.files ?? []); e.currentTarget.value = ''; void uploadImages(item, files) }} /></label>
          <p className="mt-1 text-xs text-slate-500">Até 5 MB por imagem. As imagens aparecem junto ao título e ao texto do aviso.</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">{item.images?.map((image, imageIndex) => <div key={image.file} className="rounded-xl border p-3">
            <img className="mb-2 h-36 w-full rounded-lg object-contain" src={`/api/media/file?name=${encodeURIComponent(image.file)}`} alt={image.alt || 'Prévia da imagem do aviso'} />
            <label className="text-sm">Descrição da imagem<input className="mt-1 w-full rounded border p-2" maxLength={160} value={image.alt} onChange={e => update(item.id, { images: item.images?.map((value, i) => i === imageIndex ? { ...value, alt: e.target.value } : value) })} /></label>
            <button type="button" className="mt-2 text-sm font-semibold text-red-600" onClick={() => update(item.id, { images: item.images?.filter((_, i) => i !== imageIndex) })}>Remover imagem deste aviso</button>
          </div>)}</div>
        </div>
      </article>)}
      <p className="text-sm text-slate-500">Até 50 informativos. Remoções e mudanças de ordem entram em vigor ao salvar a playlist. Sem itens ativos, o painel amplia a área da chamada atual.</p>
    </fieldset>}
  </div></main>
}
