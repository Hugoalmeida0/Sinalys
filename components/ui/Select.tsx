"use client";

import { useState } from "react";
import { CheckIcon, ChevronDownIcon } from "@/components/ui/icons";

export function Select<T extends string>({
  value,
  options,
  onChange,
  className = "",
  icone,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
  className?: string;
  icone?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const atual = options.find((o) => o.value === value);

  return (
    <div
      className={`relative ${className}`}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setOpen(false);
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-slate-300 focus:outline-none focus-visible:border-brand-royal"
      >
        <span className="flex min-w-0 items-center gap-2">
          {icone}
          <span className="truncate">{atual?.label ?? ""}</span>
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 left-0 z-30 mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-float">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => {
                onChange(o.value);
                setOpen(false);
              }}
              className={`flex w-full items-center justify-between gap-2 px-3.5 py-2 text-left text-sm transition-colors hover:bg-slate-50 ${
                o.value === value ? "font-semibold text-brand-royal" : "text-slate-600"
              }`}
            >
              <span className="truncate">{o.label}</span>
              {o.value === value && <CheckIcon className="h-3.5 w-3.5 shrink-0" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
