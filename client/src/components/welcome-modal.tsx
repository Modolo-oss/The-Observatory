import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Rocket, BarChart3, Wallet, Zap } from "lucide-react";
import { useEffect, useState } from "react";

export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem("has_seen_welcome");
    if (!hasSeenWelcome) {
      setOpen(true);
    }
  }, []);

  const handleClose = () => {
    localStorage.setItem("has_seen_welcome", "true");
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="bg-black/95 border-white/10 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <Rocket className="h-6 w-6 text-primary" />
            Welcome to The Observatory
          </DialogTitle>
          <DialogDescription className="text-base">
            Mission Control for Sanctum Gateway - Live benchmarking platform for Solana transactions
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="font-bold text-lg mb-4">🚀 Quick Start Guide</h3>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Wallet className="h-4 w-4" />
                    Generate Benchmark Wallet
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Go to <strong>Benchmarking</strong> → Click "Generate Wallet" → Save your private key securely
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    💰 Fund Your Wallet
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Send SOL to your wallet address (minimum ~0.01 SOL recommended for testing)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4" />
                    Run Your First Benchmark
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Configure number of transactions → Add recipient address → Click "Run Benchmark"
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                  4
                </div>
                <div>
                  <h4 className="font-medium flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Analyze Results
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    View real-time results → Check analytics dashboard → Export CSV reports
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
            <h4 className="font-medium text-blue-200 mb-2">⚡ Powered by Sanctum Gateway</h4>
            <p className="text-sm text-blue-200/80">
              Every benchmark runs through Sanctum Gateway's optimized routing:
              <br />• Dual-path submission (RPC + Jito simultaneously)
              <br />• Automatic Jito tip refunds
              <br />• Zero RPC management required
            </p>
          </div>

          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <h4 className="font-medium text-yellow-200 mb-2">⚠️ Important Notes</h4>
            <p className="text-sm text-yellow-200/80">
              • All benchmarks use <strong>real SOL on Solana mainnet</strong>
              <br />• Your private key stays in your browser (never sent to server)
              <br />• Backup your wallet private key before funding
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={handleClose} className="flex-1" size="lg">
            Get Started
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
