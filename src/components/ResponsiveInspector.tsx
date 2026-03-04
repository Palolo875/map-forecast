import { ReactNode } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Drawer, DrawerContent } from "@/components/ui/drawer";
import { cn } from "@/lib/utils";

type ResponsiveInspectorProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: ReactNode;
  className?: string;
  nonModal?: boolean;
};

const PreviewHeader = ({ title }: { title?: string }) => (
  <div className="relative overflow-hidden grainy-overlay">
    <div className="absolute inset-0 opacity-20" style={{
      background:
        "radial-gradient(600px circle at 10% 0%, hsl(var(--accent)) 0%, transparent 70%), radial-gradient(600px circle at 90% 0%, hsl(var(--primary)) 0%, transparent 70%)",
      filter: "blur(40px)",
    }} />
    <div className="relative px-5 pt-6 pb-4">
      <div className="text-[11px] uppercase tracking-[0.15em] font-medium text-muted-foreground/60">Selection</div>
      <div className="mt-1 text-[18px] font-semibold text-foreground truncate tracking-tight">{title ?? "Details"}</div>
    </div>
    <div className="h-px w-full bg-border/40" />
  </div>
);

export default function ResponsiveInspector({ open, onOpenChange, title, children, className, nonModal }: ResponsiveInspectorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible
        shouldScaleBackground={!nonModal}
        snapPoints={[0.25, 0.55, 0.92]}
      >
        <DrawerContent showOverlay={!nonModal} className={cn("border-border", className)}>
          <PreviewHeader title={title} />
          <div className="px-5 pb-6 pt-4 overflow-auto">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  if (!open) return null;

  return (
    <div className={cn("fixed right-6 bottom-6 z-20 w-[420px] max-w-[calc(100vw-48px)] max-h-[80vh] misty-glass rounded-2xl overflow-hidden animate-float-in grainy-overlay shadow-2xl shadow-black/50", className)}>
      <PreviewHeader title={title} />
      <div className="px-5 pb-8 pt-4 overflow-auto" style={{ maxHeight: "calc(80vh - 86px)" }}>
        {children}
      </div>
    </div>
  );
}
