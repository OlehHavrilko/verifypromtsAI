import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";
import { useLanguage } from "@/lib/i18n/LanguageContext";

interface ThemeToggleProps {
  collapsed?: boolean;
}

export function ThemeToggle({ collapsed }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const { language } = useLanguage();
  const isDark = theme === "dark";

  const label = isDark
    ? language === "en" ? "Light mode" : language === "ua" ? "Світла тема" : "Светлая тема"
    : language === "en" ? "Dark mode" : language === "ua" ? "Темна тема" : "Тёмная тема";

  return (
    <button
      onClick={toggleTheme}
      aria-label={label}
      title={label}
      className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors w-full"
    >
      {isDark ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
