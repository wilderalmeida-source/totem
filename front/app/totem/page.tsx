import Totem from './pageClient'
import React, {Suspense} from 'react'
import ModalProviders from "@/components/modals/providers"
export default function Home(){
  return(
     <ModalProviders><Suspense><Totem/></Suspense></ModalProviders>
    
  )
}