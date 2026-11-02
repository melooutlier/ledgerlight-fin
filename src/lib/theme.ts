export type ThemeChoice = "light" | "dark" | "system";

export const THEME_KEY = "melfy-theme";

/** Photos-first default: light. */
export function readSavedTheme(): ThemeChoice {
  if (typeof window === "undefined") return "light";
  try {
    const value = window.localStorage.getItem(THEME_KEY);
    if (value === "light" || value === "dark" || value === "system") return value;
  } catch {
    /* storage unavailable — keep default */
  }
  return "light";
}

export function applyTheme(theme: ThemeChoice) {
  if (typeof document === "undefined") return;
  document.documentElement.dataset["theme"] = theme;
  document.documentElement.classList.toggle("dark", theme === "dark");
}

export function setThemeChoice(theme: ThemeChoice) {
  applyTheme(theme);
  try {
    window.localStorage.setItem(THEME_KEY, theme);
  } catch {
    /* preference stays active for this session only */
  }
}

/** Runs before first paint so the theme never flashes dark. */
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("melfy-theme");if(t!=="light"&&t!=="dark"&&t!=="system")t="light";var d=document.documentElement;d.dataset.theme=t;d.classList.toggle("dark",t==="dark");}catch(e){d=document.documentElement;d.dataset.theme="light";}})();';
