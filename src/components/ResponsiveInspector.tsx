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
};

const PreviewHeader = ({ title }: { title?: string }) => (
  <div className="relative overflow-hidden">
    <div className="absolute inset-0 opacity-90" style={{
      background:
        "radial-gradient(900px circle at 30% 10%, hsl(var(--accent)) 0%, transparent 55%), radial-gradient(900px circle at 80% 20%, hsl(var(--primary)) 0%, transparent 50%)",
    }} />
    <div className="relative px-5 pt-5 pb-4">
      <div className="text-[13px] font-medium text-muted-foreground">Selection</div>
      <div className="mt-1 text-[16px] font-semibold text-foreground truncate">{title ?? "Details"}</div>
    </div>
    <div className="h-px w-full bg-border" />
  </div>
);

export default function ResponsiveInspector({ open, onOpenChange, title, children, className }: ResponsiveInspectorProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer
        open={open}
        onOpenChange={onOpenChange}
        dismissible
        shouldScaleBackground
        snapPoints={[0.25, 0.55, 0.92]}
      >
        <DrawerContent className={cn("border-border", className)}>
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
    <div className={cn("fixed right-5 bottom-5 z-20 w-[400px] max-w-[calc(100vw-40px)] max-h-[70vh] float-card overflow-hidden animate-float-in", className)}>
      <PreviewHeader title={title} />
      <div className="px-5 pb-6 pt-4 overflow-auto" style={{ maxHeight: "calc(70vh - 76px)" }}>
        {children}
      </div>
    </div>
  );
}
