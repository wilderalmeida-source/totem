import Datanasc from "./date"
import { Suspense } from "react"
import ModalProviders from "@/components/modals/providers"

export default async function Home(){
  return(<>
      <ModalProviders>
        <Suspense><Datanasc/></Suspense>
      </ModalProviders>
  </>
  )
}