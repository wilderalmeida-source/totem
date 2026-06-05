import { ReactNode } from "react"

export const dynamic = 'force-dynamic'

interface BaseProps {
  children: ReactNode
  type?: string
}

export default function Base({ children }: BaseProps) {
  return (
    <div className="bg-background w-full h-screen flex flex-col">
      <div className="w-1/4 max-w-48">
        {/* Espaço da logo */}
      </div>
      {children}
    </div>
  )
}
