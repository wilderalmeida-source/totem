import { Users } from "./Icons";

export type QueuePerson = {
  id: number;
  name: string;
  active?: boolean; // destacado
  instruction?:string;
};

export default function QueueList({ people }: { people: QueuePerson[] }) {
  return (
    <div className="bg-[#e9f0ff] rounded-2xl shadow-2xl shadow-gray-700 px-6 pt-4 h-full min-h-0 flex flex-col">
      <header className="shrink-0">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 fill-slate-900" />
          <h2 className="text-xl font-bold">Chamados Anteriores.</h2>
        </div>
      </header>

      {/* lista ocupa o espaço e rola se precisar */}
      <ol className="mt-2 space-y-3 overflow-y-hidden min-h-0">
        {people.map((p) => (
          <li
            key={p.id}
            className={[
              "flex items-center gap-3 border-2 rounded-xl p-3 bg-white",
              p.active ? "border-[#bfd4ff] shadow-inner bg-gradient-to-b from-[#eaf6e9] to-white" : "border-[#e7eefb]"
            ].join(" ")}
          >
            <span className={["grid place-items-center w-[34px] h-[34px] rounded-full font-extrabold",
              p.active ? "bg-[#3b82f6] text-white" : "bg-gray-200 text-gray-900"].join(" ")}>
              {p.id}
            </span>

            <div className="flex flex-1 flex-row justify-between"> 
              <div className="font-bold text-3xl">{p.name.toUpperCase()}</div>
              {p.instruction && (
                <div className="text-red-700 font-bold mt-0.5 text-2xl">
                  <span>{p.instruction}</span>
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}