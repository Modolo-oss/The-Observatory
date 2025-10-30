import { GlassCard } from "./glass-card";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: {
    value: number;
    direction: "up" | "down" | "neutral";
  };
  icon?: React.ReactNode;
  className?: string;
  loading?: boolean;
}

export function MetricCard({
  label,
  value,
  trend,
  icon,
  className,
  loading = false,
}: MetricCardProps) {
  const TrendIcon = trend?.direction === "up" ? TrendingUp : trend?.direction === "down" ? TrendingDown : Minus;
  
  return (
    <GlassCard className={cn("relative overflow-hidden", className)}>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 w-24 bg-muted/50 rounded mb-4"></div>
          <div className="h-8 w-32 bg-muted/50 rounded"></div>
        </div>
      ) : (
        <>
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
              {label}
            </p>
            {icon && <div className="text-primary/70">{icon}</div>}
          </div>
          
          <div className="flex items-baseline gap-3">
            <p className="text-4xl font-bold font-mono tracking-tight">
              {value}
            </p>
            
            {trend && (
              <div className={cn(
                "flex items-center gap-1 text-sm font-semibold",
                trend.direction === "up" && "text-green-500",
                trend.direction === "down" && "text-red-500",
                trend.direction === "neutral" && "text-muted-foreground"
              )}>
                <TrendIcon className="h-4 w-4" />
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </>
      )}
    </GlassCard>
  );
}
