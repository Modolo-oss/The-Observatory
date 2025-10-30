import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation } from "@tanstack/react-query";
import { History as HistoryIcon, RotateCcw, ChevronRight, Download } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { downloadCSV, formatDateForCSV } from "@/lib/csv-export";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function History() {
  const { toast } = useToast();
  const { data: history, isLoading } = useQuery<any[]>({
    queryKey: ["/api/configurations/history"],
  });

  const rollbackMutation = useMutation({
    mutationFn: (historyId: string) => 
      apiRequest("POST", `/api/configurations/rollback/${historyId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/configurations/history"] });
      queryClient.invalidateQueries({ queryKey: ["/api/configurations"] });
      toast({
        title: "Rollback Successful",
        description: "Configuration has been rolled back to the previous state",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Rollback Failed",
        description: error.message || "Failed to rollback configuration",
        variant: "destructive",
      });
    },
  });

  const historyData: any[] = history || [];

  const getActionColor = (action: string) => {
    switch (action) {
      case "created": return "bg-blue-500/20 text-blue-500 border-blue-500/30";
      case "updated": return "bg-purple-500/20 text-purple-500 border-purple-500/30";
      case "activated": return "bg-green-500/20 text-green-500 border-green-500/30";
      case "deactivated": return "bg-yellow-500/20 text-yellow-500 border-yellow-500/30";
      default: return "bg-gray-500/20 text-gray-500 border-gray-500/30";
    }
  };

  const handleExport = () => {
    const exportData = historyData.map((item: any) => ({
      id: item.id,
      configuration_id: item.configurationId,
      name: item.name || "Unnamed",
      change_reason: item.changeReason || "No reason provided",
      routes: JSON.stringify(item.routes),
      created_by: item.createdBy || "System",
      created_at: formatDateForCSV(item.createdAt),
    }));

    downloadCSV(exportData, `observatory-config-history-${new Date().toISOString().split('T')[0]}`);
    
    toast({
      title: "Export Complete",
      description: `${exportData.length} configuration changes exported successfully`,
    });
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="p-8 space-y-8">
          <div className="flex items-center justify-center h-96">
            <p className="text-muted-foreground">Loading configuration history...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Configuration History</h1>
            <p className="text-muted-foreground">Track all routing configuration changes over time</p>
          </div>
          <Button variant="outline" onClick={handleExport} data-testid="button-export-history">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Total Changes
                </p>
                <p className="text-3xl font-bold font-mono" data-testid="text-total-changes">{historyData.length}</p>
              </div>
              <HistoryIcon className="h-10 w-10 text-primary/70" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  This Week
                </p>
                <p className="text-3xl font-bold font-mono" data-testid="text-this-week">
                  {historyData.filter((h: any) => new Date(h.createdAt) > new Date(Date.now() - 7 * 24 * 3600000)).length}
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                <ChevronRight className="h-6 w-6 text-primary" />
              </div>
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Last Change
                </p>
                <p className="text-sm font-semibold" data-testid="text-last-change">
                  {historyData[0] ? new Date(historyData[0].createdAt).toLocaleString() : "N/A"}
                </p>
              </div>
              <RotateCcw className="h-10 w-10 text-cyan-500/70" />
            </div>
          </GlassCard>
        </div>

        {/* Timeline */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Change Timeline</h2>

          {historyData.length === 0 ? (
            <GlassCard>
              <div className="flex flex-col items-center justify-center py-12">
                <HistoryIcon className="h-16 w-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No configuration changes yet</p>
              </div>
            </GlassCard>
          ) : (
            <div className="relative">
              {/* Timeline Line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary via-primary/50 to-transparent" />

              <div className="space-y-6">
                {historyData.map((entry: any) => (
                  <div key={entry.id} className="relative pl-16">
                    {/* Timeline Dot */}
                    <div className="absolute left-0 top-6 h-12 w-12 rounded-full bg-card border-2 border-primary flex items-center justify-center">
                      <HistoryIcon className="h-5 w-5 text-primary" />
                    </div>

                    <GlassCard className="border-l-4 border-l-primary">
                      <div className="space-y-4">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2 flex-wrap">
                              <Badge className={getActionColor(entry.action)}>
                                {entry.action}
                              </Badge>
                              <span className="text-xs text-muted-foreground">by {entry.performedBy}</span>
                            </div>
                            <p className="text-sm font-medium mb-1">{entry.changesSummary}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(entry.createdAt).toLocaleString()}
                            </p>
                          </div>
                          {entry.previousConfig && (
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  data-testid={`button-rollback-${entry.id}`}
                                  disabled={rollbackMutation.isPending}
                                >
                                  <RotateCcw className="h-4 w-4 mr-2" />
                                  Rollback
                                </Button>
                              </AlertDialogTrigger>
                              <AlertDialogContent>
                                <AlertDialogHeader>
                                  <AlertDialogTitle>Confirm Rollback</AlertDialogTitle>
                                  <AlertDialogDescription>
                                    Are you sure you want to rollback to this configuration? This will restore the routing weights to their previous state and will affect live traffic immediately.
                                  </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                                  <AlertDialogAction
                                    onClick={() => rollbackMutation.mutate(entry.id)}
                                    data-testid={`button-confirm-rollback-${entry.id}`}
                                  >
                                    Confirm Rollback
                                  </AlertDialogAction>
                                </AlertDialogFooter>
                              </AlertDialogContent>
                            </AlertDialog>
                          )}
                        </div>

                        {/* Config Diff */}
                        {entry.previousConfig && entry.newConfig && Array.isArray(entry.previousConfig) && Array.isArray(entry.newConfig) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                              <p className="text-xs font-medium uppercase tracking-wide text-red-500 mb-3">
                                Previous
                              </p>
                              <div className="space-y-2">
                                {entry.previousConfig.map((route: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span>{route.name}</span>
                                    <span className="font-mono font-semibold">{route.weight}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            <div className="p-4 rounded-lg bg-green-500/5 border border-green-500/20">
                              <p className="text-xs font-medium uppercase tracking-wide text-green-500 mb-3">
                                New
                              </p>
                              <div className="space-y-2">
                                {entry.newConfig.map((route: any, i: number) => (
                                  <div key={i} className="flex items-center justify-between text-sm">
                                    <span>{route.name}</span>
                                    <span className="font-mono font-semibold">{route.weight}%</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </GlassCard>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
