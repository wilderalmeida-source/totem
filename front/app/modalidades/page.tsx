'use client'

import { Suspense } from 'react'
import ModalidadesContent from './modalidadesContent'
import ModalProviders from '@/components/modals/providers'

export default function ModalidadesPage() {
    return (
        <ModalProviders>
        <Suspense fallback={<div>Carregando...</div>}>
            <ModalidadesContent />
        </Suspense>
        </ModalProviders>
    )
}