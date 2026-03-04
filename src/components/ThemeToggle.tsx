import { useTheme } from "next-themes";
import { HugeiconsIcon, Moon02Icon, Sun03Icon } from "@/components/icons";

export default function ThemeToggle() {
  const { theme, setTheme, resolvedTheme } = useTheme();

  const isDark = (theme === "dark") || (theme === "system" && resolvedTheme === "dark");

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="float-card-sm flex items-center gap-2.5 px-4 py-3 text-foreground hover:shadow-md transition-all duration-300 active:scale-95 group shrink-0"
      aria-label={isDark ? "Activer le thème clair" : "Activer le thème sombre"}
    >
      <HugeiconsIcon
        icon={isDark ? Sun03Icon : Moon02Icon}
        size={18}
        className="text-muted-foreground group-hover:text-primary transition-colors"
        strokeWidth={1.5}
      />
      <span className="text-[14px] font-medium hidden sm:inline">
        {isDark ? "Clair" : "Sombre"}
      </span>
    </button>
  );
}
