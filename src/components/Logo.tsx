import logo from "@/assets/acadex-logo.png";

export function Logo({ className = "h-8 w-8", showText = true }: { className?: string; showText?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <img src={logo} alt="Acadex logo" className={className} />
      {showText && <span className="text-lg font-bold tracking-tight text-primary-deep">Acadex</span>}
    </div>
  );
}
