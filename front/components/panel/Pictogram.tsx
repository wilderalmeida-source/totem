import { Activity, Bone, CircleDot, Magnet, Ribbon, ScanLine, Stethoscope, Info, TriangleAlert, FileCheck2, CalendarPlus, Heart } from 'lucide-react'
export function modalityIcon(name = '') {
  const value = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
  if (value.includes('mamo')) return Ribbon
  if (value.includes('ultra') || value.includes('doppler')) return Activity
  if (value.includes('resson')) return Magnet
  if (value.includes('densito')) return Bone
  if (value.includes('tomogra')) return CircleDot
  if (value.includes('raio') || value.includes('radiogr')) return ScanLine
  return Stethoscope
}
export function ModalityPictogram({ name }: { name?: string }) {
  const Icon = modalityIcon(name)
  return <span className="tv-pictogram" aria-hidden="true"><Icon /></span>
}
export function NoticePictogram({ icon }: { icon: string }) {
  const Icon = ({ info: Info, alert: TriangleAlert, results: FileCheck2, calendar: CalendarPlus, heart: Heart } as const)[icon as 'info'] ?? Info
  return <span className="tv-pictogram" aria-hidden="true"><Icon /></span>
}
