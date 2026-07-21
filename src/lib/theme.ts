export type Theme = "dark" | "light";

const KEY = "spoiled-theme";

export function getInitialTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  const saved = window.localStorage.getItem(KEY) as Theme | null;
  return saved ?? "dark";
}

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.toggle("light", theme === "light");
  window.localStorage.setItem(KEY, theme);
}
