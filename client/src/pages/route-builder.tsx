import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Server, Zap, Send, Plus, Save, Play } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function RouteBuilder() {
  const { toast } = useToast();
  const [configName, setConfigName] = useState("Default Configuration");
  
  const { data: activeConfig, isLoading } = useQuery({
    queryKey: ["/api/configurations/active"],
  });

  const [routes, setRoutes] = useState<Array<{
    id: string;
    type: "rpc" | "jito" | "sanctum";
    name: string;
    endpoint: string;
    weight: number;
    enabled: boolean;
  }>>([
    { id: "rpc-1", type: "rpc", name: "RPC A", endpoint: "https://api.mainnet-beta.solana.com", weight: 40, enabled: true },
    { id: "jito-1", type: "jito", name: "Jito Bundle", endpoint: "", weight: 40, enabled: true },
    { id: "sanctum-1", type: "sanctum", name: "Sanctum Sender", endpoint: "", weight: 20, enabled: true },
  ]);

  // Hydrate routes from active configuration
  useEffect(() => {
    if (activeConfig && activeConfig.routes) {
      setRoutes(activeConfig.routes as any);
      setConfigName(activeConfig.name);
    }
  }, [activeConfig]);

  const saveConfiguration = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/configurations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations/active"] });
      toast({
        title: "Configuration Saved",
        description: "Your routing configuration has been saved successfully.",
      });
    },
  });

  const applyConfiguration = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/configurations/apply", data),
    onSuccess: () => {
      toast({
        title: "Configuration Applied",
        description: "Routing changes are now live. All new transactions will use this configuration.",
      });
    },
  });

  const handleWeightChange = (id: string, value: number[]) => {
    setRoutes(routes.map(r => r.id === id ? { ...r, weight: value[0] } : r));
  };

  const handleToggle = (id: string) => {
    setRoutes(routes.map(r => r.id === id ? { ...r, enabled: !r.enabled } : r));
  };

  const totalWeight = routes.filter(r => r.enabled).reduce((sum, r) => sum + r.weight, 0);
  const normalizedRoutes = routes.map(r => ({
    ...r,
    percentage: r.enabled ? ((r.weight / totalWeight) * 100).toFixed(1) : "0.0"
  }));

  const getRouteIcon = (type: string) => {
    switch (type) {
      case "rpc": return <Server className="h-5 w-5" />;
      case "jito": return <Zap className="h-5 w-5" />;
      case "sanctum": return <Send className="h-5 w-5" />;
      default: return null;
    }
  };

  const getRouteColor = (type: string) => {
    switch (type) {
      case "rpc": return "border-blue-500 bg-blue-500/10";
      case "jito": return "border-purple-500 bg-purple-500/10";
      case "sanctum": return "border-cyan-500 bg-cyan-500/10";
      default: return "border-gray-500 bg-gray-500/10";
    }
  };

  const handleSave = () => {
    saveConfiguration.mutate({
      name: configName,
      description: "Custom routing configuration",
      routes: routes.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        endpoint: r.endpoint,
        weight: r.weight,
        enabled: r.enabled,
      })),
      isActive: false,
    });
  };

  const handleApply = () => {
    applyConfiguration.mutate({
      routes: routes.map(r => ({
        id: r.id,
        type: r.type,
        name: r.name,
        endpoint: r.endpoint,
        weight: r.weight,
        enabled: r.enabled,
      })),
    });
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Route Builder</h1>
            <p className="text-muted-foreground">Configure transaction routing strategies with visual controls</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={saveConfiguration.isPending}
              data-testid="button-save-config"
            >
              <Save className="h-4 w-4 mr-2" />
              Save
            </Button>
            <Button
              onClick={handleApply}
              disabled={applyConfiguration.isPending}
              className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
              data-testid="button-apply-config"
            >
              <Play className="h-4 w-4 mr-2" />
              Apply Changes
            </Button>
          </div>
        </div>

        {/* Configuration Name */}
        <GlassCard>
          <div className="space-y-4">
            <div>
              <Label htmlFor="config-name" className="text-sm font-medium mb-2 block">
                Configuration Name
              </Label>
              <Input
                id="config-name"
                value={configName}
                onChange={(e) => setConfigName(e.target.value)}
                placeholder="Enter configuration name..."
                className="max-w-md"
                data-testid="input-config-name"
              />
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                Total Weight: {totalWeight}
              </Badge>
              <Badge variant="outline" className="text-xs">
                Active Routes: {routes.filter(r => r.enabled).length}/{routes.length}
              </Badge>
            </div>
          </div>
        </GlassCard>

        {/* Route Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Routing Paths</h2>
            <Button variant="outline" size="sm" data-testid="button-add-route">
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </div>

          {normalizedRoutes.map((route) => (
            <GlassCard key={route.id} className={`border-2 ${getRouteColor(route.type)}`}>
              <div className="space-y-6">
                {/* Route Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-xl ${getRouteColor(route.type)} border-2 flex items-center justify-center`}>
                      {getRouteIcon(route.type)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-lg font-semibold">{route.name}</h3>
                        <Badge variant="secondary" className="text-xs uppercase">
                          {route.type}
                        </Badge>
                      </div>
                      {route.endpoint && (
                        <p className="text-sm text-muted-foreground font-mono">{route.endpoint}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-3xl font-bold font-mono">{route.percentage}%</p>
                      <p className="text-xs text-muted-foreground">Traffic</p>
                    </div>
                    <Switch
                      checked={route.enabled}
                      onCheckedChange={() => handleToggle(route.id)}
                      data-testid={`switch-route-${route.id}`}
                    />
                  </div>
                </div>

                {/* Weight Slider */}
                {route.enabled && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-sm font-medium">
                        Routing Weight
                      </Label>
                      <span className="text-sm font-mono text-muted-foreground">
                        {route.weight}
                      </span>
                    </div>
                    <Slider
                      value={[route.weight]}
                      onValueChange={(value) => handleWeightChange(route.id, value)}
                      max={100}
                      step={1}
                      className="w-full"
                      data-testid={`slider-route-${route.id}`}
                    />
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Visual Flow Diagram */}
        <GlassCard>
          <h3 className="text-lg font-semibold mb-6">Traffic Distribution Preview</h3>
          <div className="space-y-3">
            {normalizedRoutes.filter(r => r.enabled).map((route) => (
              <div key={route.id} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{route.name}</span>
                  <span className="font-mono font-bold">{route.percentage}%</span>
                </div>
                <div className="h-3 rounded-full bg-muted/30 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      route.type === 'rpc' ? 'bg-gradient-to-r from-blue-500 to-blue-600' :
                      route.type === 'jito' ? 'bg-gradient-to-r from-purple-500 to-purple-600' :
                      'bg-gradient-to-r from-cyan-500 to-cyan-600'
                    }`}
                    style={{ width: `${route.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
