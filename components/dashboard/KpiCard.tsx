import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

type Tone = "red" | "amber" | "blue" | "emerald";

const toneClasses: Record<Tone, { text: string; bg: string; icon: string }> = {
  red: { text: "text-red-600", bg: "bg-red-50", icon: "text-red-500" },
  amber: { text: "text-amber-600", bg: "bg-amber-50", icon: "text-amber-500" },
  blue: { text: "text-brand-royal", bg: "bg-blue-50", icon: "text-brand-royal" },
  emerald: { text: "text-emerald-600", bg: "bg-emerald-50", icon: "text-emerald-500" },
};

export function KpiCard({
  label,
  value,
  description,
  tone,
  icon: Icon,
}: {
  label: string;
  value: string;
  description: string;
  tone: Tone;
  icon: ComponentType<IconProps>;
}) {
  const classes = toneClasses[tone];

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${classes.bg}`}>
          <Icon className={`h-4 w-4 ${classes.icon}`} />
        </span>
      </div>
      <p className={`mt-2 text-2xl font-bold ${classes.text}`}>{value}</p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
