export const dynamic = 'force-dynamic';
import { Table } from "./tabela";
import { medFetch, salasFetch } from "../../services/fetchData";
import { ReactElement, Suspense } from "react";
import ModalProviders from "@/components/modals/providers";


interface Medico {
  cd_medico: number;
  ds_guerra: string;
}
interface Sala {
  cd_sala: number;
  ds_sala: string;
}

export default async function Home() {
  // As APIs retornam unknown[], então fazemos o narrowing aqui
  const medicosData = (await medFetch()) as Medico[];
  const salasData = (await salasFetch()) as Sala[];

  const selectMedic: ReactElement[] = medicosData.map((medico) => (
    <option key={medico.cd_medico} value={medico.cd_medico}>
      {medico.ds_guerra}
    </option>
  ));

  const selectSalas: ReactElement[] = salasData.map((sala) => (
    <option key={sala.cd_sala} value={sala.cd_sala}>
      {sala.ds_sala}
    </option>
  ));

  return (
    <>
      <Suspense>
        <ModalProviders>
          <Table listMedicos={selectMedic} ListSalas={selectSalas} />
        </ModalProviders>
      </Suspense>
    </>
  );
}
