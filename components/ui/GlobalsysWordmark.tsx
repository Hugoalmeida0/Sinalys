export function GlobalsysWordmark({ className = "" }: { className?: string }) {
  return (
    <span className={`font-semibold tracking-tight ${className}`}>
      <span className="font-normal text-brand-light">global</span>
      <span className="font-bold text-puro">sys</span>
    </span>
  );
}
