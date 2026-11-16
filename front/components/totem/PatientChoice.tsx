import { CalendarDays, ChevronRight, ClipboardList, KeyRound, UserRound } from 'lucide-react'
export default function PatientChoice({ label, isDate = false, isSenha = false, isProtocolo = false }: { label: string; isDate?: boolean; isSenha?: boolean; isProtocolo?: boolean }) {
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('')
  return <span className="patient-choice"><span className="patient-choice-avatar" aria-hidden="true">{isProtocolo ? <ClipboardList size={21} /> : isSenha ? <KeyRound size={21} /> : isDate ? <CalendarDays size={21} /> : initials || <UserRound size={21} />}</span><span className="patient-choice-label">{label}</span><ChevronRight className="patient-choice-arrow" size={20} aria-hidden="true" /></span>
}
