import { CalendarDays, ChevronRight, UserRound } from 'lucide-react'
export default function PatientChoice({ label, isDate = false }: { label: string; isDate?: boolean }) {
  const initials = label.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('')
  return <span className="patient-choice"><span className="patient-choice-avatar" aria-hidden="true">{isDate ? <CalendarDays size={21} /> : initials || <UserRound size={21} />}</span><span className="patient-choice-label">{label}</span><ChevronRight className="patient-choice-arrow" size={20} aria-hidden="true" /></span>
}
