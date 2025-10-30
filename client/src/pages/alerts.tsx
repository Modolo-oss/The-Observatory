import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { Bell, Plus, AlertTriangle, Info, CheckCircle, Settings, Download } from "lucide-react";
import { downloadCSV, formatDateForCSV } from "@/lib/csv-export";
import { useToast } from "@/hooks/use-toast";

export default function Alerts() {
  const { toast } = useToast();
  
  const { data: alerts } = useQuery<any[]>({
    queryKey: ["/api/alerts"],
  });

  const { data: alertRules } = useQuery<any[]>({
    queryKey: ["/api/alert-rules"],
  });

  const mockAlerts: any[] = alerts || [
    {
      id: "1",
      type: "threshold",
      title: "High Network Congestion",
      message: "Average confirmation time increased by 23%",
      severity: "warning",
      source: "system",
      isRead: false,
      createdAt: new Date(Date.now() - 120000).toISOString(),
    },
    {
      id: "2",
      type: "anomaly",
      title: "Unusual Failure Pattern",
      message: "RPC A showing 15% failure rate - AI detected anomaly",
      severity: "critical",
      source: "ai",
      isRead: false,
      createdAt: new Date(Date.now() - 300000).toISOString(),
    },
    {
      id: "3",
      type: "threshold",
      title: "Cost Savings Milestone",
      message: "Successfully saved 1 SOL in Jito tip refunds this week",
      severity: "info",
      source: "system",
      isRead: true,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
  ];

  const mockRules: any[] = alertRules || [
    {
      id: "1",
      name: "Success Rate Alert",
      metric: "success_rate",
      condition: "below",
      threshold: 90,
      routeType: null,
      enabled: true,
      webhookUrl: "https://hooks.slack.com/services/...",
    },
    {
      id: "2",
      name: "High Cost Warning",
      metric: "avg_cost",
      condition: "above",
      threshold: 0.005,
      routeType: "jito",
      enabled: true,
      webhookUrl: null,
    },
  ];

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning": return <Bell className="h-5 w-5 text-yellow-500" />;
      default: return <Info className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "border-red-500 bg-red-500/10";
      case "warning": return "border-yellow-500 bg-yellow-500/10";
      default: return "border-blue-500 bg-blue-500/10";
    }
  };

  const handleExportAlerts = () => {
    const exportData = mockAlerts.map(alert => ({
      id: alert.id,
      title: alert.title,
      message: alert.message,
      severity: alert.severity,
      type: alert.type,
      source: alert.source,
      is_read: alert.isRead ? "Yes" : "No",
      created_at: formatDateForCSV(alert.createdAt),
    }));

    downloadCSV(exportData, `observatory-alerts-${new Date().toISOString().split('T')[0]}`);
    
    toast({
      title: "Export Complete",
      description: `${exportData.length} alerts exported successfully`,
    });
  };

  const handleExportRules = () => {
    const exportData = mockRules.map(rule => ({
      id: rule.id,
      name: rule.name,
      metric: rule.metric,
      condition: rule.condition,
      threshold: rule.threshold,
      route_type: rule.routeType || "All",
      enabled: rule.enabled ? "Yes" : "No",
      webhook_url: rule.webhookUrl || "Not configured",
    }));

    downloadCSV(exportData, `observatory-alert-rules-${new Date().toISOString().split('T')[0]}`);
    
    toast({
      title: "Export Complete",
      description: `${exportData.length} alert rules exported successfully`,
    });
  };

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Alerts</h1>
            <p className="text-muted-foreground">Monitor and manage system notifications</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleExportAlerts} data-testid="button-export-alerts">
              <Download className="h-4 w-4 mr-2" />
              Export Alerts
            </Button>
            <Button data-testid="button-create-rule">
              <Plus className="h-4 w-4 mr-2" />
              Create Alert Rule
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Total Alerts
                </p>
                <p className="text-3xl font-bold font-mono">{mockAlerts.length}</p>
              </div>
              <Bell className="h-10 w-10 text-primary/70" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Unread
                </p>
                <p className="text-3xl font-bold font-mono">
                  {mockAlerts.filter(a => !a.isRead).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                <div className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Active Rules
                </p>
                <p className="text-3xl font-bold font-mono">
                  {mockRules.filter(r => r.enabled).length}
                </p>
              </div>
              <Settings className="h-10 w-10 text-green-500/70" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Critical
                </p>
                <p className="text-3xl font-bold font-mono">
                  {mockAlerts.filter(a => a.severity === 'critical').length}
                </p>
              </div>
              <AlertTriangle className="h-10 w-10 text-red-500/70" />
            </div>
          </GlassCard>
        </div>

        {/* Alert Timeline */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Alert Timeline</h2>

          {mockAlerts.map((alert) => (
            <GlassCard key={alert.id} className={`border-2 ${getSeverityColor(alert.severity)} ${!alert.isRead ? 'border-l-4' : ''}`}>
              <div className="flex items-start gap-4">
                <div className={`h-12 w-12 rounded-xl ${getSeverityColor(alert.severity)} border-2 flex items-center justify-center flex-shrink-0`}>
                  {getSeverityIcon(alert.severity)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{alert.title}</h3>
                      <Badge variant="secondary" className="text-xs uppercase">
                        {alert.type}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {alert.source}
                      </Badge>
                      {!alert.isRead && (
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                      )}
                    </div>
                    <Button variant="ghost" size="sm" data-testid={`button-mark-read-${alert.id}`}>
                      {alert.isRead ? "Mark Unread" : "Mark Read"}
                    </Button>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(alert.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>

        {/* Alert Rules */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Alert Rules</h2>
            <Button variant="outline" size="sm" onClick={handleExportRules} data-testid="button-export-rules">
              <Download className="h-4 w-4 mr-2" />
              Export Rules
            </Button>
          </div>

          {mockRules.map((rule) => (
            <GlassCard key={rule.id}>
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{rule.name}</h3>
                    <Switch checked={rule.enabled} data-testid={`switch-rule-${rule.id}`} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Metric</p>
                      <p className="text-sm font-medium capitalize">{rule.metric.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Condition</p>
                      <p className="text-sm font-medium capitalize">{rule.condition} {rule.threshold}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Route</p>
                      <p className="text-sm font-medium">{rule.routeType || "All Routes"}</p>
                    </div>
                  </div>

                  {rule.webhookUrl && (
                    <div className="p-3 rounded-lg bg-white/5 border border-white/10">
                      <p className="text-xs text-muted-foreground mb-1">Webhook URL</p>
                      <p className="text-sm font-mono truncate">{rule.webhookUrl}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="outline" size="sm" data-testid={`button-edit-rule-${rule.id}`}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" data-testid={`button-delete-rule-${rule.id}`}>
                    Delete
                  </Button>
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </Layout>
  );
}
