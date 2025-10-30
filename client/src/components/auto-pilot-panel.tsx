import { GlassCard } from "./glass-card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Bot, Sparkles, Zap, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AutoPilotStatus {
  isActive: boolean;
  lastOptimization: string | null;
}

export function AutoPilotPanel() {
  const { toast } = useToast();
  
  const { data: status, isLoading } = useQuery<AutoPilotStatus>({
    queryKey: ["/api/autopilot/status"],
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const startMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/autopilot/start", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autopilot/status"] });
      toast({
        title: "Auto-Pilot Activated",
        description: "AI will now optimize routing automatically every 5 minutes",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to start Auto-Pilot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const stopMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/autopilot/stop", {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/autopilot/status"] });
      toast({
        title: "Auto-Pilot Deactivated",
        description: "Manual routing control restored",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to stop Auto-Pilot",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (checked: boolean) => {
    if (checked) {
      startMutation.mutate();
    } else {
      stopMutation.mutate();
    }
  };

  const formatLastOptimization = (timestamp: string | null) => {
    if (!timestamp) return "Never";
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <GlassCard className="border-2 border-primary/20">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-purple-500 flex items-center justify-center">
              <Bot className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                Auto-Pilot Mode
                {status?.isActive && (
                  <span className="flex items-center gap-1 text-xs font-normal text-green-500">
                    <Sparkles className="h-3 w-3 animate-pulse" />
                    Active
                  </span>
                )}
              </h3>
              <p className="text-sm text-muted-foreground">
                AI-powered automatic route optimization
              </p>
            </div>
          </div>

          <Switch
            checked={status?.isActive || false}
            onCheckedChange={handleToggle}
            disabled={isLoading || startMutation.isPending || stopMutation.isPending}
            data-testid="switch-autopilot"
          />
        </div>

        {/* Status Info */}
        <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Zap className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Status</p>
              <p className="font-semibold" data-testid="text-autopilot-status">
                {status?.isActive ? "Optimizing..." : "Standby"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Last Optimization</p>
              <p className="font-semibold" data-testid="text-last-optimization">
                {formatLastOptimization(status?.lastOptimization || null)}
              </p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="text-sm text-muted-foreground space-y-2">
          <p>
            When enabled, Auto-Pilot monitors transaction performance and automatically adjusts
            routing weights every 5 minutes to maximize success rates and minimize costs.
          </p>
          {status?.isActive && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
              <Sparkles className="h-4 w-4 text-primary mt-0.5" />
              <p className="text-xs text-primary">
                AI is actively monitoring performance. Next optimization check in ~5 minutes.
              </p>
            </div>
          )}
        </div>
      </div>
    </GlassCard>
  );
}
