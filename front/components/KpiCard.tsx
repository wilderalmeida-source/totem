import { ReactNode } from "react";

type Props = {
  title: string;
  value: string | number;
  color: "blue" | "green" | "purple";
  icon: ReactNode;
};

const colorMap = {
  blue: "bg-[#e9f0ff] text-blue-600",
  green: "bg-[#e9fbf4] text-emerald-600",
  purple: "bg-[#f3ecff] text-violet-500",
};

export default function KpiCard({ title, value, color, icon }: Props) {
  return (
    <article className="flex items-center gap-4 bg-white rounded-xl2 p-6 shadow-soft">
      <div className={`w-12 h-12 rounded-xl grid place-items-center ${colorMap[color]}`}>
        {icon}
      </div>
      <div>
        <span className="block text-slate-500 font-semibold text-sm">{title}</span>
        <span className="block text-3xl font-bold leading-none mt-0.5">{value}</span>
      </div>
    </article>
  );
}