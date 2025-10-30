import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Play, Download, RefreshCw, CheckCircle, XCircle, Clock, DollarSign, Wallet, Copy, Eye, EyeOff, Gift, ArrowLeftRight, Image, CreditCard, Settings } from "lucide-react";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

interface BenchmarkRun {
  id: string;
  name: string;
  totalTransactions: number;
  successfulTransactions: number;
  failedTransactions: number;
  successRate: string;
  avgLatency: string;
  minLatency: string;
  maxLatency: string;
  avgCost: string;
  totalCost: string;
  status: string;
  createdAt: string;
  completedAt?: string;
}

export default function Benchmarking() {
  const { toast } = useToast();
  const [isRunning, setIsRunning] = useState(false);
  const [currentRunId, setCurrentRunId] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  // Wallet state
  const [walletAddress, setWalletAddress] = useState<string>("");
  const [walletPrivateKey, setWalletPrivateKey] = useState<string>("");
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [checkingBalance, setCheckingBalance] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    preset: "custom" as string,
    transactionCount: 10,
    amountSol: 0.001,
    fromPrivateKey: "",
    toAddress: "",
  });

  // Fetch benchmark presets
  const { data: presetsData } = useQuery<{success: boolean; data: Record<string, any>}>({
    queryKey: ["/api/benchmarks/presets"],
  });
  const presets = presetsData?.data || {};

  // Load wallet from localStorage on mount
  useEffect(() => {
    const savedWallet = localStorage.getItem("benchmark_wallet");
    if (savedWallet) {
      try {
        const { address, privateKey } = JSON.parse(savedWallet);
        setWalletAddress(address);
        setWalletPrivateKey(privateKey);
        setFormData(prev => ({ ...prev, fromPrivateKey: privateKey }));
      } catch (e) {
        console.error("Failed to load wallet:", e);
      }
    }
  }, []);

  // Fetch benchmark history
  const { data: history, refetch: refetchHistory } = useQuery<{success: boolean; data: BenchmarkRun[]}>({
    queryKey: ["/api/benchmarks/history"],
  });

  // WebSocket connection for real-time updates
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connected for benchmarks");
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);

        if (message.type === "benchmark_start") {
          console.log("Benchmark started:", message.data);
        } else if (message.type === "benchmark_progress") {
          const { completed, total, successCount: sc, failedCount: fc } = message.data;
          setProgress((completed / total) * 100);
          setSuccessCount(sc);
          setFailedCount(fc);
        } else if (message.type === "benchmark_complete") {
          console.log("Benchmark completed:", message.data);
          setIsRunning(false);
          setCurrentRunId(null);
          refetchHistory();
          toast({
            title: "✅ Benchmark Completed",
            description: `${message.data.successCount} successful, ${message.data.failedCount} failed`,
          });
        } else if (message.type === "benchmark_error") {
          console.error("Benchmark error:", message.data);
          setIsRunning(false);
          setCurrentRunId(null);
          toast({
            title: "❌ Benchmark Failed",
            description: message.data.error,
            variant: "destructive",
          });
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("WebSocket disconnected");
    };

    return () => {
      ws.close();
    };
  }, [refetchHistory, toast]);

  const handleGenerateWallet = () => {
    const keypair = Keypair.generate();
    const privateKey = bs58.encode(keypair.secretKey);
    const publicKey = keypair.publicKey.toBase58();

    setWalletAddress(publicKey);
    setWalletPrivateKey(privateKey);
    setFormData(prev => ({ ...prev, fromPrivateKey: privateKey }));

    // Save to localStorage
    localStorage.setItem("benchmark_wallet", JSON.stringify({
      address: publicKey,
      privateKey: privateKey,
    }));

    setShowExportModal(true);
    toast({
      title: "✅ Wallet Generated",
      description: "Save your private key securely!",
    });
  };

  const handleCheckBalance = async () => {
    if (!walletAddress) {
      toast({
        title: "No Wallet",
        description: "Generate or import a wallet first",
        variant: "destructive",
      });
      return;
    }

    setCheckingBalance(true);
    try {
      const response = await apiRequest("POST", "/api/wallet/balance", { address: walletAddress });
      const result = await response.json();
      
      if (result.success) {
        setWalletBalance(result.balance);
        toast({
          title: "Balance Updated",
          description: `${result.balance.toFixed(4)} SOL`,
        });
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setCheckingBalance(false);
    }
  };

  const handleCopyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast({
      title: "✅ Copied",
      description: "Wallet address copied to clipboard",
    });
  };

  const handleCopyPrivateKey = () => {
    navigator.clipboard.writeText(walletPrivateKey);
    toast({
      title: "✅ Copied",
      description: "Private key copied - keep it safe!",
    });
  };

  const handlePresetChange = (preset: string) => {
    const presetConfig = presets[preset];
    if (presetConfig) {
      setFormData(prev => ({
        ...prev,
        preset,
        transactionCount: presetConfig.defaultTransactionCount || prev.transactionCount,
        amountSol: presetConfig.defaultAmount || prev.amountSol,
      }));
    } else {
      setFormData(prev => ({ ...prev, preset }));
    }
  };

  // Icon mapping for presets
  const presetIcons: Record<string, any> = {
    Settings,
    Gift,
    ArrowLeftRight,
    Image,
    CreditCard,
  };

  const handleRunBenchmark = async () => {
    if (!formData.fromPrivateKey || !formData.toAddress) {
      toast({
        title: "Missing Fields",
        description: "Generate a wallet and provide recipient address",
        variant: "destructive",
      });
      return;
    }

    // Check balance before running
    if (walletBalance !== null && walletBalance < formData.amountSol * formData.transactionCount * 1.1) {
      toast({
        title: "Insufficient Balance",
        description: `Need at least ${(formData.amountSol * formData.transactionCount * 1.1).toFixed(4)} SOL`,
        variant: "destructive",
      });
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setSuccessCount(0);
    setFailedCount(0);

    try {
      const response = await apiRequest("POST", "/api/benchmarks/run", formData);
      const result = await response.json();

      if (result.success) {
        setCurrentRunId(result.data.runId);
        toast({
          title: "🚀 Benchmark Started",
          description: `Running ${formData.transactionCount} transactions via Gateway`,
        });
      } else {
        throw new Error(result.error || "Failed to start benchmark");
      }
    } catch (error: any) {
      setIsRunning(false);
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExportResults = (run: BenchmarkRun) => {
    const csv = [
      ["Metric", "Value"],
      ["Name", run.name],
      ["Total Transactions", run.totalTransactions],
      ["Successful", run.successfulTransactions],
      ["Failed", run.failedTransactions],
      ["Success Rate", `${run.successRate}%`],
      ["Avg Latency", `${run.avgLatency}ms`],
      ["Min Latency", `${run.minLatency}ms`],
      ["Max Latency", `${run.maxLatency}ms`],
      ["Avg Cost", `${run.avgCost} SOL`],
      ["Total Cost", `${run.totalCost} SOL`],
      ["Started", run.createdAt],
      ["Completed", run.completedAt || "In Progress"],
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `benchmark-${run.id}.csv`;
    a.click();
  };

  return (
    <Layout>
      <div className="p-8 space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
            Live Benchmarking
          </h1>
          <p className="text-muted-foreground mt-2">
            Run live transaction tests and measure Gateway performance with real mainnet transactions
          </p>
        </div>

        {/* Wallet Management */}
        <GlassCard className="p-6 border-2 border-primary/30">
          <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Benchmark Wallet
          </h3>
          
          {!walletAddress ? (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Generate a secure wallet for running benchmarks. Your private key stays in your browser.
              </p>
              <Button onClick={handleGenerateWallet} className="w-full" data-testid="button-generate-wallet">
                <Wallet className="h-4 w-4 mr-2" />
                Generate Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Wallet Address</Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={walletAddress} 
                    readOnly 
                    className="font-mono text-sm"
                    data-testid="text-wallet-address"
                  />
                  <Button onClick={handleCopyAddress} variant="outline" size="sm" data-testid="button-copy-address">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Button 
                  onClick={handleCheckBalance} 
                  variant="outline" 
                  className="flex-1"
                  disabled={checkingBalance}
                  data-testid="button-check-balance"
                >
                  {checkingBalance ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : null}
                  Check Balance
                </Button>
                {walletBalance !== null && (
                  <div className="flex-1 flex items-center justify-center gap-2 border rounded-lg px-4 border-white/10">
                    <DollarSign className="h-4 w-4 text-green-500" />
                    <span className="font-mono font-bold">{walletBalance.toFixed(4)} SOL</span>
                  </div>
                )}
              </div>

              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                <p className="text-xs text-yellow-200">
                  💰 <strong>Fund your wallet:</strong> Send SOL to the address above to run benchmarks
                </p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Run Configuration */}
        <GlassCard className="p-6">
          <h3 className="text-xl font-bold mb-6">Benchmark Configuration</h3>
          
          {/* Preset Selector */}
          <div className="mb-6 p-4 bg-white/5 border border-white/10 rounded-lg">
            <Label htmlFor="select-preset" className="text-base mb-3 block">
              🎯 Benchmark Preset (Real-World Use Cases)
            </Label>
            <Select value={formData.preset} onValueChange={handlePresetChange} disabled={isRunning}>
              <SelectTrigger id="select-preset" data-testid="select-preset" className="w-full">
                <SelectValue placeholder="Select a preset" />
              </SelectTrigger>
              <SelectContent className="bg-black/95 border-white/10">
                {Object.entries(presets).map(([key, config]: [string, any]) => {
                  const IconComponent = presetIcons[config.icon] || Settings;
                  return (
                    <SelectItem key={key} value={key} data-testid={`preset-${key}`}>
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-4 w-4" />
                        <span className="font-medium">{config.name}</span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {presets[formData.preset] && (
              <div className="mt-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-200 mb-2">
                  <strong>{presets[formData.preset].description}</strong>
                </p>
                <p className="text-xs text-muted-foreground">
                  {presets[formData.preset].instructions}
                </p>
                <div className="mt-2 flex gap-3 text-xs">
                  <span className="text-muted-foreground">
                    📊 Default: <strong>{presets[formData.preset].defaultTransactionCount}tx</strong>
                  </span>
                  <span className="text-muted-foreground">
                    💰 Amount: <strong>{presets[formData.preset].defaultAmount} SOL</strong>
                  </span>
                </div>
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="input-name">Benchmark Name (Optional)</Label>
                <Input
                  id="input-name"
                  data-testid="input-name"
                  placeholder="e.g., Production Test #1"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={isRunning}
                />
              </div>

              <div>
                <Label htmlFor="input-transaction-count">Number of Transactions</Label>
                <Input
                  id="input-transaction-count"
                  data-testid="input-transaction-count"
                  type="number"
                  min="1"
                  max="100"
                  value={formData.transactionCount}
                  onChange={(e) => setFormData({ ...formData, transactionCount: parseInt(e.target.value) || 10 })}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">1-100 transactions</p>
              </div>

              <div>
                <Label htmlFor="input-amount-sol">Amount per Transaction (SOL)</Label>
                <Input
                  id="input-amount-sol"
                  data-testid="input-amount-sol"
                  type="number"
                  step="0.0001"
                  min="0.0001"
                  max="0.01"
                  value={formData.amountSol}
                  onChange={(e) => setFormData({ ...formData, amountSol: parseFloat(e.target.value) || 0.001 })}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">0.0001-0.01 SOL</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="input-to-address">Recipient Address</Label>
                <Input
                  id="input-to-address"
                  data-testid="input-to-address"
                  placeholder="Solana public key"
                  value={formData.toAddress}
                  onChange={(e) => setFormData({ ...formData, toAddress: e.target.value })}
                  disabled={isRunning}
                />
                <p className="text-xs text-muted-foreground mt-1">Where to send SOL during benchmark</p>
              </div>

              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 space-y-2">
                <p className="text-xs font-medium text-blue-200">Estimated Cost:</p>
                <p className="text-2xl font-bold font-mono">
                  {(formData.amountSol * formData.transactionCount).toFixed(4)} SOL
                </p>
                <p className="text-xs text-muted-foreground">
                  + network fees (~0.000005 SOL/tx)
                </p>
              </div>

              <Button
                onClick={handleRunBenchmark}
                disabled={isRunning || !walletAddress}
                className="w-full"
                size="lg"
                data-testid="button-run-benchmark"
              >
                {isRunning ? (
                  <>
                    <RefreshCw className="h-5 w-5 mr-2 animate-spin" />
                    Running Benchmark...
                  </>
                ) : (
                  <>
                    <Play className="h-5 w-5 mr-2" />
                    Run Benchmark
                  </>
                )}
              </Button>
            </div>
          </div>
        </GlassCard>

        {/* Export Wallet Modal */}
        <Dialog open={showExportModal} onOpenChange={setShowExportModal}>
          <DialogContent className="bg-black/95 border-white/10">
            <DialogHeader>
              <DialogTitle>🔐 Save Your Wallet</DialogTitle>
              <DialogDescription>
                Your wallet has been generated. Save your private key securely - you'll need it to access your funds.
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label className="text-xs">Public Address</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={walletAddress} readOnly className="font-mono text-xs" />
                  <Button onClick={handleCopyAddress} variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div>
                <Label className="text-xs flex items-center justify-between">
                  Private Key
                  <Button
                    onClick={() => setShowPrivateKey(!showPrivateKey)}
                    variant="ghost"
                    size="sm"
                  >
                    {showPrivateKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input 
                    value={walletPrivateKey} 
                    readOnly 
                    type={showPrivateKey ? "text" : "password"}
                    className="font-mono text-xs" 
                  />
                  <Button onClick={handleCopyPrivateKey} variant="outline" size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                <p className="text-xs text-red-200">
                  ⚠️ <strong>Never share your private key!</strong> Anyone with this key can access your wallet. The key is saved in your browser localStorage.
                </p>
              </div>

              <Button onClick={() => setShowExportModal(false)} className="w-full">
                I've Saved My Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Real-time Progress */}
        {isRunning && (
          <GlassCard className="p-6 border-2 border-primary/30">
            <h3 className="text-xl font-bold mb-6">Live Progress</h3>
            
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Progress</span>
                  <span className="text-sm text-muted-foreground">{progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-3" data-testid="progress-benchmark" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Successful</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-success-count">{successCount}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-red-500/20 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-500" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                    <p className="text-2xl font-bold font-mono" data-testid="text-failed-count">{failedCount}</p>
                  </div>
                </div>
              </div>
            </div>
          </GlassCard>
        )}

        {/* Benchmark History */}
        <GlassCard className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold">Recent Benchmarks</h3>
            <Button onClick={() => refetchHistory()} variant="ghost" size="sm" data-testid="button-refresh-history">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {history?.data && history.data.length > 0 ? (
            <div className="space-y-4">
              {history.data.map((run) => (
                <div
                  key={run.id}
                  className="border border-white/10 rounded-lg p-4 hover:bg-white/5 transition-colors"
                  data-testid={`benchmark-run-${run.id}`}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h4 className="font-bold">{run.name || `Benchmark ${run.id.slice(0, 8)}`}</h4>
                      <p className="text-sm text-muted-foreground">
                        {new Date(run.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        run.status === "completed" ? "bg-green-500/20 text-green-500" :
                        run.status === "running" ? "bg-blue-500/20 text-blue-500" :
                        "bg-red-500/20 text-red-500"
                      }`}>
                        {run.status}
                      </span>
                      <Button
                        onClick={() => handleExportResults(run)}
                        variant="ghost"
                        size="sm"
                        data-testid={`button-export-${run.id}`}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Success Rate</p>
                      <p className="text-lg font-bold font-mono text-green-500">
                        {parseFloat(run.successRate || "0").toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Avg Latency</p>
                      <p className="text-lg font-bold font-mono">
                        {parseFloat(run.avgLatency || "0").toFixed(0)}ms
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Transactions</p>
                      <p className="text-lg font-bold font-mono">
                        {run.totalTransactions}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Total Cost</p>
                      <p className="text-lg font-bold font-mono">
                        {parseFloat(run.totalCost || "0").toFixed(6)} SOL
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Play className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No benchmarks yet. Run your first benchmark above!</p>
            </div>
          )}
        </GlassCard>
      </div>
    </Layout>
  );
}
