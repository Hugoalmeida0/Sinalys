import type { ComponentType } from "react";
import type { IconProps } from "@/components/icons";

type Tone = "red" | "amber" | "blue" | "emerald";

const toneClasses: Record<Tone, { text: string; bg: string; icon: string }> = {
  red: { text: "text-red-600", bg: "bg-red-50", icon: "text-red-500" },
  amber: { text: "text-amber-600", bg: "bg-amber-50", icon: "text-amber-500" },
  blue: { text: "text-brand-royal", bg: "bg-brand-pale", icon: "text-brand-royal" },
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
    <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-card sm:p-5">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${classes.bg}`}
        >
          <Icon className={`h-5 w-5 ${classes.icon}`} />
        </span>
      </div>
      <p className={`mt-3 truncate text-xl font-bold sm:text-2xl ${classes.text}`} title={value}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{description}</p>
    </div>
  );
}
