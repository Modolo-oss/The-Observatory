import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Bot, TrendingUp, AlertTriangle, Info, CheckCircle2, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export default function AIInsights() {
  const { toast } = useToast();

  const { data: insights, isLoading } = useQuery({
    queryKey: ["/api/ai/insights"],
  });

  const applyRecommendation = useMutation({
    mutationFn: (insightId: string) => apiRequest("POST", `/api/ai/insights/${insightId}/apply`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/ai/insights"] });
      toast({
        title: "Recommendation Applied",
        description: "AI optimization has been activated successfully.",
      });
    },
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "critical": return <AlertTriangle className="h-5 w-5 text-red-500" />;
      case "warning": return <Info className="h-5 w-5 text-yellow-500" />;
      default: return <TrendingUp className="h-5 w-5 text-blue-500" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "critical": return "border-red-500 bg-red-500/10";
      case "warning": return "border-yellow-500 bg-yellow-500/10";
      default: return "border-blue-500 bg-blue-500/10";
    }
  };

  const mockInsights = insights || [
    {
      id: "1",
      type: "recommendation",
      severity: "warning",
      title: "RPC Performance Degradation Detected",
      description: "RPC A is showing 15% slower confirmation times compared to historical averages. Consider reducing traffic allocation.",
      confidenceScore: 0.87,
      recommendation: {
        action: "Reduce RPC A traffic from 40% to 25%, increase Jito to 55%",
        expectedImpact: "Estimated 12% improvement in average confirmation time",
      },
      isApplied: false,
      createdAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: "2",
      type: "optimization",
      severity: "info",
      title: "Cost Optimization Opportunity",
      description: "Network congestion is low. Switching more traffic to RPC could save additional Jito tips.",
      confidenceScore: 0.92,
      recommendation: {
        action: "Shift 15% from Jito to RPC A for non-critical transactions",
        expectedImpact: "Save approximately 0.15 SOL per day in Jito tips",
      },
      isApplied: false,
      createdAt: new Date(Date.now() - 7200000).toISOString(),
    },
    {
      id: "3",
      type: "anomaly",
      severity: "critical",
      title: "Unusual Transaction Failure Spike",
      description: "RPC B experiencing 25% failure rate in the last 30 minutes - significantly above normal.",
      confidenceScore: 0.95,
      recommendation: {
        action: "Disable RPC B immediately and redistribute traffic",
        expectedImpact: "Prevent estimated 200+ failed transactions per hour",
      },
      isApplied: false,
      createdAt: new Date(Date.now() - 1800000).toISOString(),
    },
  ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">AI Insights</h1>
            <p className="text-muted-foreground">AI-powered recommendations and anomaly detection</p>
          </div>
          <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary/10 border border-primary/20">
            <Sparkles className="h-5 w-5 text-primary animate-pulse" />
            <span className="text-sm font-semibold">AI Active</span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Total Insights
                </p>
                <p className="text-3xl font-bold font-mono">{mockInsights.length}</p>
              </div>
              <Bot className="h-10 w-10 text-primary/70" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Applied
                </p>
                <p className="text-3xl font-bold font-mono">
                  {mockInsights.filter(i => i.isApplied).length}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-500/70" />
            </div>
          </GlassCard>

          <GlassCard>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground mb-1">
                  Avg Confidence
                </p>
                <p className="text-3xl font-bold font-mono">
                  {(mockInsights.reduce((sum, i) => sum + i.confidenceScore, 0) / mockInsights.length * 100).toFixed(0)}%
                </p>
              </div>
              <TrendingUp className="h-10 w-10 text-cyan-500/70" />
            </div>
          </GlassCard>
        </div>

        {/* Insights List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">Active Recommendations</h2>

          {mockInsights.map((insight) => (
            <GlassCard key={insight.id} className={`border-2 ${getSeverityColor(insight.severity)}`}>
              <div className="space-y-4">
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <div className={`h-12 w-12 rounded-xl ${getSeverityColor(insight.severity)} border-2 flex items-center justify-center`}>
                      {getSeverityIcon(insight.severity)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold">{insight.title}</h3>
                        <Badge variant="secondary" className="text-xs uppercase">
                          {insight.type}
                        </Badge>
                        {insight.isApplied && (
                          <Badge className="text-xs bg-green-500/20 text-green-500 border-green-500/30">
                            Applied
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">
                        {insight.description}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(insight.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Confidence Score */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">AI Confidence</span>
                    <span className="text-sm font-mono font-bold">
                      {(insight.confidenceScore * 100).toFixed(0)}%
                    </span>
                  </div>
                  <Progress value={insight.confidenceScore * 100} className="h-2" />
                </div>

                {/* Recommendation */}
                {insight.recommendation && (
                  <div className="p-4 rounded-lg bg-white/5 border border-white/10 space-y-3">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Recommended Action
                      </p>
                      <p className="text-sm font-medium">{insight.recommendation.action}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1">
                        Expected Impact
                      </p>
                      <p className="text-sm text-green-500">{insight.recommendation.expectedImpact}</p>
                    </div>
                  </div>
                )}

                {/* Actions */}
                {!insight.isApplied && (
                  <div className="flex gap-3">
                    <Button
                      onClick={() => applyRecommendation.mutate(insight.id)}
                      disabled={applyRecommendation.isPending}
                      className="bg-gradient-to-r from-primary to-primary/80"
                      data-testid={`button-apply-insight-${insight.id}`}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Apply Recommendation
                    </Button>
                    <Button variant="outline" data-testid={`button-dismiss-insight-${insight.id}`}>
                      Dismiss
                    </Button>
                  </div>
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      </div>
    </Layout>
  );
}
