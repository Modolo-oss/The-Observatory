import { cn } from "@/lib/utils";

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export function GlassCard({ children, className, hover = false }: GlassCardProps) {
  return (
    <div
      className={cn(
        "relative rounded-xl border border-white/10 bg-card/50 backdrop-blur-xl p-6",
        "shadow-lg shadow-black/20",
        hover && "transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/20 hover:shadow-2xl",
        className
      )}
    >
      <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      {children}
    </div>
  );
}
