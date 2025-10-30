import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { useQuery } from "@tanstack/react-query";
import { LineChart, Line, BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid } from "recharts";
import { TrendingUp, Clock, DollarSign, Activity, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function LiveAnalytics() {
  // Fetch benchmark runs from database
  const { data: benchmarkResponse, isLoading } = useQuery<{success: boolean; data: any[]}>({
    queryKey: ["/api/benchmarks/history"],
  });

  // If no data yet, show empty state
  if (isLoading) {
    return (
      <Layout>
        <div className="p-8">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-64"></div>
            <div className="grid grid-cols-3 gap-4">
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
              <div className="h-48 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const benchmarkRuns = benchmarkResponse?.data || [];
  const hasBenchmarkData = benchmarkRuns && benchmarkRuns.length > 0;

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight mb-2">Live Analytics 📊</h1>
          <p className="text-muted-foreground">
            Real-time benchmark performance trends from live Gateway tests
          </p>
        </div>

        {/* No Data State */}
        {!hasBenchmarkData && (
          <Alert className="border-blue-500/50 bg-blue-500/10">
            <AlertCircle className="h-4 w-4 text-blue-500" />
            <AlertDescription className="text-blue-500">
              No benchmark data available yet. Run your first benchmark test to see analytics here!
            </AlertDescription>
          </Alert>
        )}

        {/* Benchmark Trend Charts */}
        {hasBenchmarkData && (
          <>
            {/* Success Rate Trends */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Success Rate Trends</h3>
                  <p className="text-sm text-muted-foreground">Transaction success rates over time</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={benchmarkRuns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="createdAt" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    domain={[0, 100]}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="successRate" 
                    stroke="hsl(142, 76%, 48%)" 
                    strokeWidth={2}
                    name="Success Rate (%)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Latency Trends */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Confirmation Time Trends</h3>
                  <p className="text-sm text-muted-foreground">Average confirmation latency over time</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={benchmarkRuns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="createdAt" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="avgLatency" 
                    stroke="hsl(217, 91%, 60%)" 
                    strokeWidth={2}
                    name="Avg Latency (ms)"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Cost Analysis */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <DollarSign className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Cost Trends</h3>
                  <p className="text-sm text-muted-foreground">Average transaction costs over time</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={benchmarkRuns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="createdAt" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="avgCost" 
                    fill="hsl(271, 91%, 65%)" 
                    radius={[8, 8, 0, 0]}
                    name="Avg Cost (SOL)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>

            {/* Transaction Volume */}
            <GlassCard className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="h-10 w-10 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                  <Activity className="h-5 w-5 text-cyan-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Transaction Volume</h3>
                  <p className="text-sm text-muted-foreground">Total transactions per benchmark run</p>
                </div>
              </div>
              
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={benchmarkRuns}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                  <XAxis 
                    dataKey="createdAt" 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(value) => new Date(value).toLocaleDateString()}
                  />
                  <YAxis 
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Legend />
                  <Bar 
                    dataKey="totalTransactions" 
                    fill="hsl(189, 85%, 60%)" 
                    radius={[8, 8, 0, 0]}
                    name="Total Transactions"
                  />
                </BarChart>
              </ResponsiveContainer>
            </GlassCard>
          </>
        )}
      </div>
    </Layout>
  );
}
