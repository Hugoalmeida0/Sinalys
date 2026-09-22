import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "navy" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-brand-royal text-puro shadow-[0_8px_18px_-10px_rgba(37,99,235,0.9)] hover:bg-[#1d4ed8] focus-visible:outline-brand-royal",
  navy: "bg-brand-navy text-puro hover:bg-[#082357] focus-visible:outline-brand-navy",
  secondary:
    "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 hover:ring-slate-300 focus-visible:outline-brand-royal",
  ghost:
    "bg-transparent text-slate-600 hover:bg-slate-100 focus-visible:outline-brand-royal",
  danger: "bg-red-600 text-puro hover:bg-red-700 focus-visible:outline-red-600",
};

// min-h garante alvo de toque confortável no celular sem alterar a altura no
// desktop, onde o ponteiro é preciso.
const sizeClasses: Record<Size, string> = {
  sm: "text-xs px-3 py-1.5 gap-1.5 min-h-11 sm:min-h-0",
  md: "text-sm px-4 py-2.5 gap-2 min-h-11 sm:min-h-0",
  lg: "text-sm px-5 py-3 gap-2",
};

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-xl font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
