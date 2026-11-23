'use client'
import { useLayoutEffect, type RefObject } from 'react'

// Diminui a letra do comunicado até ele caber no quadro: ajusta a variável --tv-fit (1 = tamanho normal)
// no elemento e o CSS multiplica fontes, espaçamentos e imagens por ela. Recalcula ao trocar o comunicado,
// ao redimensionar a tela e quando as imagens/fontes terminam de carregar.
export const FIT_MIN = 0.3

export function fitScale(fits: (scale: number) => boolean, min = FIT_MIN, steps = 8): number {
  if (fits(1)) return 1
  let lo = min, hi = 1
  for (let i = 0; i < steps; i++) {
    const mid = (lo + hi) / 2
    if (fits(mid)) lo = mid
    else hi = mid
  }
  return Math.floor(lo * 1000) / 1000
}

export function useFitText(ref: RefObject<HTMLElement | null>, key: unknown) {
  useLayoutEffect(() => {
    const box = ref.current
    if (!box) return
    let frame = 0
    const fit = () => {
      const scale = fitScale(s => { box.style.setProperty('--tv-fit', String(s)); return box.scrollHeight <= box.clientHeight + 1 })
      box.style.setProperty('--tv-fit', String(scale))
    }
    const schedule = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fit) }
    fit()
    const observer = new ResizeObserver(schedule)
    observer.observe(box)
    const imgs = Array.from(box.querySelectorAll('img'))
    imgs.forEach(img => img.addEventListener('load', schedule))
    void document.fonts?.ready.then(schedule)
    return () => { cancelAnimationFrame(frame); observer.disconnect(); imgs.forEach(img => img.removeEventListener('load', schedule)) }
  }, [ref, key])
}
