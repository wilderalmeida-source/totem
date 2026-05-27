import React, { ReactElement } from "react"

// Força o componente Base a ler o Docker Compose em tempo de execução
export const dynamic = 'force-dynamic';

interface BaseProps {
  props: ReactElement;
  type?: string;
  key?: string;
}

export default function Base({ props }: BaseProps) {

  return (
    <>
      <div className="bg-background w-full h-screen flex flex-col">
        <div className="w-1/4 max-w-48">
          {/* Espaço da logo */}
        </div>
        
        {/* Renderiza a página do cliente normalmente */}
        {props}
      </div>
    </>
  )
}