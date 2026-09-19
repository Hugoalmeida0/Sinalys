import type { HTMLAttributes } from "react";

export function Badge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium whitespace-nowrap ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}

export function SoftBadge({
  className = "",
  children,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-xs font-medium text-slate-600 ${className}`}
      {...props}
    >
      {children}
    </span>
  );
}
