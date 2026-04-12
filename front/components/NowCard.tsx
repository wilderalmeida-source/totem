
import { Clock } from "./Icons";

type Props = {
  name: string;
  calledAt: string;     // "09:25"
  instruction?: string; // texto abaixo
};

export default function NowCard({ name, calledAt, instruction }: Props) {
  return (
    <section className="bg-[#e9f0ff] shadow-2xl shadow-gray-700 px-7 pt-1 flex-1 flex flex-col border-2 rounded-2xl border-gray-500">
      <header className="mb-4 mx-auto flex flex-col items-center">
        <h2 className="uppercase tracking-wide font-extrabold text-3xl mb-2b">CHAMANDO AGORA</h2>
        <div className="h-2 bg-[#e9f0ff] rounded-full overflow-hidden w-24 bg-gradient-to-r from-blue-500 to-green-500">
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center text-center">
        <div className="flex items-center gap-2 text-slate-500 font-medium">
          <Clock className="w-4 h-4 fill-slate-400" />
          <span>Chamado às {calledAt}</span>
        </div>
        <h3 className="w-full text-center font-extrabold mt-2 text-[clamp(28px,5vw,90px)] leading-tight h-[2.8em] overflow-hidden flex items-center justify-center text-balance">
          {name.toUpperCase()}
        </h3>
        {instruction && (
          <p className="mt-6 text-red-600 font-bold text-[clamp(22px,5vw,90px)]">{instruction}</p>
        )}
      </div>
    </section>
  );
}