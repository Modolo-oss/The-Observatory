import { Layout } from "@/components/layout";
import { MetricCard } from "@/components/metric-card";
import { GlassCard } from "@/components/glass-card";
import { MetricCardSkeleton, ChartSkeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useState, useEffect } from "react";
import { Activity, DollarSign, Zap, TrendingUp } from "lucide-react";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from "recharts";

interface DashboardMetrics {
  totalBenchmarks: number;
  totalTransactions: number;
  avgSuccessRate: string;
  avgLatency: string;
  avgCost: string;
  totalCost: string;
}

const DEFAULT_METRICS: DashboardMetrics = {
  totalBenchmarks: 0,
  totalTransactions: 0,
  avgSuccessRate: "0.0%",
  avgLatency: "0ms",
  avgCost: "0.000000000",
  totalCost: "0.000000000",
};

export default function Dashboard() {
  const { data: fetchedMetrics, isLoading: metricsLoading } = useQuery<DashboardMetrics>({
    queryKey: ["/api/dashboard/metrics"],
  });

  const { data: recentTransactions } = useQuery({
    queryKey: ["/api/transactions/recent"],
  });

  // Fetch real benchmark data for dashboard
  const { data: benchmarkData } = useQuery<{success: boolean; data: any[]}>({
    queryKey: ["/api/benchmarks/history"],
  });

  // WebSocket for real-time metrics
  const { lastMessage, isConnected } = useWebSocket();
  const [metrics, setMetrics] = useState<DashboardMetrics>(fetchedMetrics || DEFAULT_METRICS);

  // Update metrics from WebSocket
  useEffect(() => {
    if (lastMessage && lastMessage.type === "metrics") {
      setMetrics(lastMessage.data);
    }
  }, [lastMessage]);

  // Initialize metrics from API
  useEffect(() => {
    if (fetchedMetrics) {
      setMetrics(fetchedMetrics);
    }
  }, [fetchedMetrics]);

  // Transform real benchmark data for charts
  const chartData = benchmarkData?.data && benchmarkData.data.length > 0
    ? benchmarkData.data.slice(-6).map(run => ({
        time: new Date(run.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        success: parseFloat(run.successRate || '0'),
        failed: 100 - parseFloat(run.successRate || '0'),
      }))
    : [
        { time: "No Data", success: 0, failed: 0 },
      ];

  const costData = benchmarkData?.data && benchmarkData.data.length > 0
    ? benchmarkData.data.slice(-6).map(run => ({
        time: new Date(run.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        cost: parseFloat(run.totalCost || '0'),
        refunded: parseFloat(run.jitoTipRefunded || '0'), // Real Jito tip refunds from Gateway
      }))
    : [
        { time: "No Data", cost: 0, refunded: 0 },
      ];

  return (
    <Layout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">Mission Control</h1>
            <p className="text-muted-foreground">Real-time transaction delivery analytics for Solana</p>
          </div>
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${isConnected ? "bg-green-500 animate-pulse" : "bg-gray-500"}`} />
            <span className="text-xs text-muted-foreground">
              {isConnected ? "Live" : "Connecting..."}
            </span>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {metricsLoading ? (
            <>
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
              <MetricCardSkeleton />
            </>
          ) : (
            <>
              <MetricCard
                label="Benchmark Success Rate"
                value={metrics?.avgSuccessRate || "0.0%"}
                trend={{ value: 2.3, direction: "up" }}
                icon={<TrendingUp className="h-5 w-5" />}
                data-testid="metric-success-rate"
              />
              <MetricCard
                label="Avg Latency"
                value={metrics?.avgLatency || "0ms"}
                trend={{ value: 15, direction: "down" }}
                icon={<Zap className="h-5 w-5" />}
                data-testid="metric-avg-confirmation"
              />
              <MetricCard
                label="Avg Transaction Cost"
                value={`${parseFloat(metrics?.avgCost || "0").toFixed(6)} SOL`}
                trend={{ value: 8.4, direction: "up" }}
                icon={<DollarSign className="h-5 w-5" />}
                data-testid="metric-cost-saved"
              />
              <MetricCard
                label="Total Benchmarks Run"
                value={metrics?.totalBenchmarks?.toString() || "0"}
                trend={{ value: 12, direction: "up" }}
                icon={<Activity className="h-5 w-5" />}
                data-testid="metric-total-transactions"
              />
            </>
          )}
        </div>

        {/* Latest Benchmark Results */}
        {benchmarkData && benchmarkData.data && benchmarkData.data.length > 0 && (
          <GlassCard className="p-6 border-2 border-primary/30">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h3 className="text-lg font-semibold mb-1">Latest Benchmark Test</h3>
                <p className="text-sm text-muted-foreground">
                  {new Date(benchmarkData.data[0].createdAt).toLocaleString()}
                </p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                benchmarkData.data[0].status === "completed" ? "bg-green-500/20 text-green-500" :
                benchmarkData.data[0].status === "running" ? "bg-blue-500/20 text-blue-500" :
                "bg-red-500/20 text-red-500"
              }`}>
                {benchmarkData.data[0].status}
              </span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Success Rate</p>
                <p className="text-2xl font-bold font-mono text-green-500" data-testid="latest-benchmark-success-rate">
                  {parseFloat(benchmarkData.data[0].successRate || "0").toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Avg Latency</p>
                <p className="text-2xl font-bold font-mono" data-testid="latest-benchmark-latency">
                  {parseFloat(benchmarkData.data[0].avgLatency || "0").toFixed(0)}ms
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Transactions</p>
                <p className="text-2xl font-bold font-mono">
                  {benchmarkData.data[0].successfulTransactions}/{benchmarkData.data[0].totalTransactions}
                </p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Total Cost</p>
                <p className="text-2xl font-bold font-mono" data-testid="latest-benchmark-cost">
                  {parseFloat(benchmarkData.data[0].totalCost || "0").toFixed(6)} SOL
                </p>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Charts Row */}
        {metricsLoading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Success Rate Chart */}
            <GlassCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Transaction Success Rate</h3>
              <p className="text-sm text-muted-foreground">Last 24 hours</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="successGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(261, 83%, 66%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(261, 83%, 66%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    backdropFilter: "blur(12px)",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="success"
                  stroke="hsl(261, 83%, 66%)"
                  fill="url(#successGradient)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </GlassCard>

          {/* Cost Savings Chart */}
          <GlassCard>
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-1">Cost Analysis</h3>
              <p className="text-sm text-muted-foreground">Gateway Jito tip refunds from real transactions</p>
            </div>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={costData}>
                <XAxis
                  dataKey="time"
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="hsl(var(--muted-foreground))"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value.toFixed(6)} SOL`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    backdropFilter: "blur(12px)",
                  }}
                  formatter={(value: number) => [`${value.toFixed(6)} SOL`, '']}
                />
                <Line
                  type="monotone"
                  dataKey="cost"
                  name="Total Cost"
                  stroke="hsl(189, 85%, 60%)"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  type="monotone"
                  dataKey="refunded"
                  name="Jito Tips Refunded"
                  stroke="hsl(142, 76%, 48%)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </GlassCard>
          </div>
        )}
      </div>
    </Layout>
  );
}
