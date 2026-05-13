import { useEffect, useState } from "react";

const KEY = "acadex_theme_v1";
type Theme = "light" | "dark";

function apply(t: Theme) {
  const root = document.documentElement;
  if (t === "dark") root.classList.add("dark");
  else root.classList.remove("dark");
}

export function initTheme() {
  if (typeof window === "undefined") return;
  const saved = (localStorage.getItem(KEY) as Theme | null) ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  apply(saved);
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "light";
    return (localStorage.getItem(KEY) as Theme | null) ?? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  });
  useEffect(() => {
    apply(theme);
    localStorage.setItem(KEY, theme);
  }, [theme]);
  return { theme, setTheme, toggle: () => setTheme((t) => (t === "dark" ? "light" : "dark")) };
}
