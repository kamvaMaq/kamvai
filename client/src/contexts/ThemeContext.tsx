import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type ThemePreference = "system" | "light" | "dark";
type ResolvedTheme = "light" | "dark";

interface ThemeContextType {
  theme: ResolvedTheme;
  preference: ThemePreference;
  setThemePreference: (preference: ThemePreference) => void;
  toggleTheme: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children, defaultTheme = "system", switchable = true }: { children: React.ReactNode; defaultTheme?: ThemePreference; switchable?: boolean }) {
  const [preference, setPreference] = useState<ThemePreference>(() => (localStorage.getItem("kamvai-theme") as ThemePreference) || defaultTheme);
  const [systemDark, setSystemDark] = useState(() => window.matchMedia("(prefers-color-scheme: dark)").matches);
  const theme: ResolvedTheme = preference === "system" ? (systemDark ? "dark" : "light") : preference;

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const listener = () => setSystemDark(media.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("kamvai-theme", preference);
  }, [preference, theme]);

  const value = useMemo(() => ({
    theme,
    preference,
    setThemePreference: setPreference,
    toggleTheme: () => setPreference(current => (current === "dark" ? "light" : "dark")),
    switchable,
  }), [theme, preference, switchable]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
