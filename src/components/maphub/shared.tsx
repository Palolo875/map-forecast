import type { Poi } from "@/features/poi/types";
import { badgeVariants, type BadgeProps } from "@/components/ui/badge";
import { buttonVariants, type ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type HubTab = "overview" | "weather" | "route" | "poi";

export type HubContext = { hasWeather: boolean; hasRoute: boolean; hasPoi: boolean };

export function clampTab(tab: HubTab, ctx: HubContext): HubTab {
  if (tab === "weather" && !ctx.hasWeather) return "overview";
  if (tab === "route" && !ctx.hasRoute) return "overview";
  if (tab === "poi" && !ctx.hasPoi) return "overview";
  return tab;
}

export function labelPoiType(type: Poi["type"]) {
  switch (type) {
    case "refuge":
      return "Refuge";
    case "emergency_shelter":
      return "Abri";
    case "weather_station":
      return "Station météo";
    case "spot":
      return "Spot";
  }
}

export function labelWeather(code: number) {
  if (code === 0) return "Dégagé";
  if (code <= 3) return "Nuageux";
  if (code <= 48) return "Brouillard";
  if (code <= 57) return "Bruine";
  if (code <= 67) return "Pluie";
  if (code <= 77) return "Neige";
  if (code <= 82) return "Averses";
  if (code <= 86) return "Neige";
  return "Orage";
}

export function HubBadge({ variant, children }: { variant: BadgeProps["variant"]; children: React.ReactNode }) {
  return <div className={cn(badgeVariants({ variant }))}>{children}</div>;
}

export function HubButton({
  variant,
  size,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant: ButtonProps["variant"]; size?: ButtonProps["size"] }) {
  return <button className={cn(buttonVariants({ variant, size: size ?? "default" }), className)} {...props} />;
}
