'use client'

import { Suspense } from 'react'
import ModalidadesContent from './modalidadesContent'

export default function ModalidadesPage() {
    return (
        <Suspense fallback={<div>Carregando...</div>}>
            <ModalidadesContent />
        </Suspense>
    )
}