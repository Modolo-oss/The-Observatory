
import { useState } from "react";
import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Download, CheckCircle2, XCircle, Clock, Zap, TrendingUp, AlertCircle } from "lucide-react";
import { downloadCSV, formatDateForCSV } from "@/lib/csv-export";
import { Textarea } from "@/components/ui/textarea";
import { useEffect } from "react";

interface BenchmarkRun {
  id: string;
  name: string;
  timestamp: string;
  totalTransactions: number;
  successRate: number;
  avgLatency: number;
  avgCost: number;
  status: 'running' | 'completed' | 'failed';
}

interface BenchmarkProgress {
  runId: string;
  completed: number;
  total: number;
  successCount: number;
  failedCount: number;
}

export default function BenchmarkRunner() {
  const [formData, setFormData] = useState({
    name: "",
    transactionCount: "10",
    amountSol: "0.001",
    fromPrivateKey: "",
    toAddress: "11111111111111111111111111111111", // Burn address for testing
  });

  const [currentRun, setCurrentRun] = useState<{
    runId: string;
    status: 'running' | 'completed' | 'failed';
    progress: number;
    successCount: number;
    failedCount: number;
    totalTransactions: number;
  } | null>(null);

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastMessage } = useWebSocket();

  // Listen to WebSocket for real-time updates
  useEffect(() => {
    if (!lastMessage) return;

    if (lastMessage.type === 'benchmark_start') {
      setCurrentRun({
        runId: lastMessage.data.runId,
        status: 'running',
        progress: 0,
        successCount: 0,
        failedCount: 0,
        totalTransactions: lastMessage.data.totalTransactions,
      });
    }

    if (lastMessage.type === 'benchmark_progress' && currentRun) {
      const { completed, total, successCount, failedCount } = lastMessage.data;
      setCurrentRun(prev => prev ? {
        ...prev,
        progress: (completed / total) * 100,
        successCount,
        failedCount,
      } : null);
    }

    if (lastMessage.type === 'benchmark_complete' && currentRun) {
      setCurrentRun(prev => prev ? {
        ...prev,
        status: 'completed',
        progress: 100,
      } : null);
      
      toast({
        title: "Benchmark Completed! ✅",
        description: `${lastMessage.data.successCount}/${currentRun.totalTransactions} transactions successful`,
      });

      // Refresh history
      queryClient.invalidateQueries({ queryKey: ["/api/benchmarks/history"] });
    }

    if (lastMessage.type === 'benchmark_error' && currentRun) {
      setCurrentRun(prev => prev ? { ...prev, status: 'failed' } : null);
      toast({
        variant: "destructive",
        title: "Benchmark Failed",
        description: lastMessage.data.error,
      });
    }
  }, [lastMessage, currentRun, toast, queryClient]);

  // Fetch benchmark history
  const { data: history = [], isLoading: historyLoading } = useQuery<BenchmarkRun[]>({
    queryKey: ["/api/benchmarks/history"],
  });

  // Run benchmark mutation
  const runBenchmark = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await fetch("/api/benchmarks/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: data.name || `Benchmark ${new Date().toLocaleString()}`,
          transactionCount: parseInt(data.transactionCount),
          amountSol: parseFloat(data.amountSol),
          fromPrivateKey: data.fromPrivateKey,
          toAddress: data.toAddress,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to start benchmark");
      }

      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Benchmark Started! 🚀",
        description: "Watch real-time progress below",
      });
    },
    onError: (error: Error) => {
      toast({
        variant: "destructive",
        title: "Failed to Start Benchmark",
        description: error.message,
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.fromPrivateKey.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Private key is required",
      });
      return;
    }

    const txCount = parseInt(formData.transactionCount);
    if (isNaN(txCount) || txCount < 1 || txCount > 100) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Transaction count must be between 1 and 100",
      });
      return;
    }

    runBenchmark.mutate(formData);
  };

  const handleExportResults = (runId: string) => {
    // Export benchmark results
    fetch(`/api/benchmarks/${runId}`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          const { run, transactions } = data.data;
          
          // Export transactions CSV
          const csvData = transactions.map((tx: any) => ({
            "TX Hash": tx.txHash || "N/A",
            "Status": tx.status,
            "Latency (ms)": tx.latencyMs || "N/A",
            "Fee (SOL)": tx.feeSol || "N/A",
            "Error": tx.errorMessage || "",
            "Timestamp": formatDateForCSV(tx.createdAt),
          }));

          downloadCSV(csvData, `benchmark-${run.name}-${new Date().toISOString()}`);
          
          toast({
            title: "Export Successful!",
            description: "Benchmark results downloaded as CSV",
          });
        }
      })
      .catch(error => {
        toast({
          variant: "destructive",
          title: "Export Failed",
          description: error.message,
        });
      });
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Live Benchmark Runner 🚀
          </h1>
          <p className="text-muted-foreground mt-2">
            Run real transaction benchmarks via Sanctum Gateway
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Benchmark Configuration */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Benchmark Configuration</h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Benchmark Name (Optional)</Label>
                <Input
                  id="name"
                  placeholder="e.g., Gateway Performance Test #1"
                  value={formData.name}
                  onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="txCount">Transaction Count (1-100)</Label>
                <Input
                  id="txCount"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.transactionCount}
                  onChange={e => setFormData(prev => ({ ...prev, transactionCount: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Recommended: 10-30 for testing, 50-100 for comprehensive benchmarks
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount per TX (SOL)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="0.01"
                  value={formData.amountSol}
                  onChange={e => setFormData(prev => ({ ...prev, amountSol: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Default: 0.001 SOL (safe for testing)
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="privateKey">Wallet Private Key</Label>
                <Textarea
                  id="privateKey"
                  placeholder="Base58 private key or [1,2,3...] JSON array"
                  value={formData.fromPrivateKey}
                  onChange={e => setFormData(prev => ({ ...prev, fromPrivateKey: e.target.value }))}
                  className="font-mono text-xs h-24"
                />
                <Alert className="bg-orange-500/10 border-orange-500/20">
                  <AlertDescription className="text-xs text-orange-600">
                    ⚠️ Use a funded mainnet wallet with sufficient SOL for fees
                  </AlertDescription>
                </Alert>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recipient">Recipient Address</Label>
                <Input
                  id="recipient"
                  value={formData.toAddress}
                  onChange={e => setFormData(prev => ({ ...prev, toAddress: e.target.value }))}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Default: Burn address (safe for testing)
                </p>
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={runBenchmark.isPending || currentRun?.status === 'running'}
              >
                {runBenchmark.isPending || currentRun?.status === 'running' ? (
                  <>
                    <Clock className="mr-2 h-4 w-4 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Benchmark
                  </>
                )}
              </Button>
            </form>
          </GlassCard>

          {/* Real-time Progress */}
          <GlassCard className="p-6">
            <h2 className="text-xl font-bold mb-4">Real-time Progress</h2>

            {currentRun ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Status</span>
                  <span className={`font-bold capitalize ${
                    currentRun.status === 'completed' ? 'text-green-500' :
                    currentRun.status === 'failed' ? 'text-red-500' :
                    'text-yellow-500'
                  }`}>
                    {currentRun.status}
                  </span>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span>Progress</span>
                    <span className="font-mono">
                      {currentRun.successCount + currentRun.failedCount}/{currentRun.totalTransactions}
                    </span>
                  </div>
                  <Progress value={currentRun.progress} className="h-2" />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="text-center p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span className="text-xs text-green-500">Success</span>
                    </div>
                    <div className="text-2xl font-bold text-green-500">
                      {currentRun.successCount}
                    </div>
                  </div>

                  <div className="text-center p-4 rounded-lg bg-red-500/10 border border-red-500/20">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      <span className="text-xs text-red-500">Failed</span>
                    </div>
                    <div className="text-2xl font-bold text-red-500">
                      {currentRun.failedCount}
                    </div>
                  </div>
                </div>

                {currentRun.status === 'completed' && (
                  <Button
                    onClick={() => handleExportResults(currentRun.runId)}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export Results (CSV)
                  </Button>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Zap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No active benchmark</p>
                <p className="text-xs mt-2">Configure and start a benchmark to see progress</p>
              </div>
            )}
          </GlassCard>
        </div>

        {/* Benchmark History */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Benchmark History</h2>
            <TrendingUp className="h-5 w-5 text-primary" />
          </div>

          {historyLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading history...
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>No benchmark runs yet</p>
              <p className="text-xs mt-2">Run your first benchmark to see results here</p>
            </div>
          ) : (
            <div className="space-y-3">
              {history.slice(0, 10).map((run) => (
                <div
                  key={run.id}
                  className="p-4 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold truncate">{run.name}</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          run.status === 'completed' ? 'bg-green-500/20 text-green-500' :
                          run.status === 'failed' ? 'bg-red-500/20 text-red-500' :
                          'bg-yellow-500/20 text-yellow-500'
                        }`}>
                          {run.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.timestamp).toLocaleString()}
                      </p>
                    </div>

                    <Button
                      onClick={() => handleExportResults(run.id)}
                      variant="ghost"
                      size="sm"
                      disabled={run.status !== 'completed'}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>

                  {run.status === 'completed' && (
                    <div className="grid grid-cols-4 gap-4 mt-3 pt-3 border-t border-white/10">
                      <div>
                        <p className="text-xs text-muted-foreground">Success Rate</p>
                        <p className="text-sm font-bold">{run.successRate.toFixed(1)}%</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Latency</p>
                        <p className="text-sm font-bold">{run.avgLatency.toFixed(0)}ms</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Avg Cost</p>
                        <p className="text-sm font-bold">{run.avgCost.toFixed(6)} SOL</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Total TXs</p>
                        <p className="text-sm font-bold">{run.totalTransactions}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </Layout>
  );
}
