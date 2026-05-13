import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      title="Toggle theme"
      className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-card text-foreground hover:bg-accent transition ${className}`}
    >
      {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </button>
  );
}
