import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Send, CheckCircle2, XCircle, Clock, Key, Droplet, ArrowLeft, Upload, Download, Eye, EyeOff, Copy } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram, Transaction } from "@solana/web3.js";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import bs58 from "bs58";

// Using MAINNET because Gateway API key is configured for mainnet
// Multiple free public RPC endpoints for reliability (with fallback)
const MAINNET_RPCS = [
  "https://rpc.gsnode.io",
  "https://solana-rpc.publicnode.com",
  "https://api.mainnet-beta.solana.com",
];

// Helper to create connection with fallback
const createConnection = (endpoint?: string) => {
  const rpc = endpoint || MAINNET_RPCS[0];
  return new Connection(rpc, "confirmed");
};

export default function TestTransaction() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAirdropping, setIsAirdropping] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [keypair, setKeypair] = useState<Keypair | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [showPrivateKey, setShowPrivateKey] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);
  const [privateKeyInput, setPrivateKeyInput] = useState("");
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Form data
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("0.01");
  const [apiKey, setApiKey] = useState("");

  const generateKeypair = () => {
    const newKeypair = Keypair.generate();
    setKeypair(newKeypair);
    setBalance(null);
    toast({
      title: "Keypair generated",
      description: `Public key: ${newKeypair.publicKey.toBase58().substring(0, 20)}...`,
    });
  };

  const importKeypair = () => {
    try {
      if (!privateKeyInput.trim()) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "Please enter a private key",
        });
        return;
      }

      let secretKey: Uint8Array;
      const trimmedInput = privateKeyInput.trim();
      
      // Try parsing as JSON array first
      if (trimmedInput.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmedInput);
          if (Array.isArray(parsed) && parsed.length === 64) {
            secretKey = Uint8Array.from(parsed);
          } else {
            throw new Error("Invalid array length");
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Invalid JSON array",
            description: "Private key must be an array of 64 numbers",
          });
          return;
        }
      } else {
        // Try base58 string format (standard wallet export format)
        try {
          secretKey = bs58.decode(trimmedInput);
          if (secretKey.length !== 64) {
            throw new Error("Invalid key length");
          }
        } catch (error) {
          toast({
            variant: "destructive",
            title: "Invalid private key",
            description: "Enter base58 string or JSON array format [1,2,3,...]",
          });
          return;
        }
      }

      const importedKeypair = Keypair.fromSecretKey(secretKey);
      setKeypair(importedKeypair);
      setBalance(null);
      setPrivateKeyInput("");
      setImportDialogOpen(false);

      toast({
        title: "Wallet imported!",
        description: `Public key: ${importedKeypair.publicKey.toBase58().substring(0, 20)}...`,
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        variant: "destructive",
        title: "Import failed",
        description: error.message || "Invalid private key format",
      });
    }
  };

  const exportPrivateKey = (format: 'base58' | 'json' = 'base58') => {
    if (!keypair) return "";
    if (format === 'base58') {
      return bs58.encode(keypair.secretKey);
    }
    return JSON.stringify(Array.from(keypair.secretKey));
  };

  const copyPrivateKey = () => {
    const privateKey = exportPrivateKey('base58');
    navigator.clipboard.writeText(privateKey);
    toast({
      title: "Copied!",
      description: "Private key copied to clipboard (base58 format)",
    });
  };

  const copyPublicKey = () => {
    if (!keypair) return;
    navigator.clipboard.writeText(keypair.publicKey.toBase58());
    toast({
      title: "Copied!",
      description: "Public key copied to clipboard",
    });
  };

  const checkBalance = async () => {
    if (!keypair) return;

    // Try multiple RPC endpoints with fallback
    for (let i = 0; i < MAINNET_RPCS.length; i++) {
      try {
        const connection = createConnection(MAINNET_RPCS[i]);
        const balanceLamports = await connection.getBalance(keypair.publicKey);
        const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
        setBalance(balanceSOL);
        
        if (balanceSOL === 0) {
          toast({
            title: "Balance: 0 SOL",
            description: "Fund your wallet with SOL to test transactions",
          });
        }
        return; // Success, exit loop
      } catch (error: any) {
        console.error(`Failed to check balance with RPC ${i + 1}:`, error);
        
        // If this was the last RPC, show error to user
        if (i === MAINNET_RPCS.length - 1) {
          toast({
            variant: "destructive",
            title: "Failed to check balance",
            description: "All RPC endpoints are unavailable. Please try again later.",
          });
        }
      }
    }
  };

  const requestAirdrop = async () => {
    if (!keypair) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Generate a keypair first",
      });
      return;
    }

    setIsAirdropping(true);

    try {
      const connection = createConnection();
      
      toast({
        title: "Requesting airdrop...",
        description: "This may take a few seconds",
      });

      const signature = await connection.requestAirdrop(
        keypair.publicKey,
        2 * LAMPORTS_PER_SOL
      );

      // Wait for confirmation
      await connection.confirmTransaction(signature);

      // Check new balance
      const balanceLamports = await connection.getBalance(keypair.publicKey);
      const balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
      setBalance(balanceSOL);

      toast({
        title: "Airdrop successful!",
        description: `Received 2 SOL. New balance: ${balanceSOL.toFixed(4)} SOL`,
      });
    } catch (error: any) {
      console.error("Airdrop error:", error);
      toast({
        variant: "destructive",
        title: "Airdrop failed",
        description: error.message || "Please try again in a few seconds",
      });
    } finally {
      setIsAirdropping(false);
    }
  };

  // Poll transaction confirmation status
  const pollTransactionConfirmation = async (signature: string, connection: Connection) => {
    const maxAttempts = 30; // 30 attempts = 30 seconds max
    let attempts = 0;

    const checkStatus = async () => {
      try {
        attempts++;
        console.log(`Checking transaction status (attempt ${attempts}/${maxAttempts})...`);

        const statusResult = await connection.getSignatureStatus(signature);
        const status = statusResult?.value;

        if (status?.confirmationStatus === 'confirmed' || status?.confirmationStatus === 'finalized') {
          // Transaction confirmed!
          console.log("✅ Transaction confirmed!", status);
          
          // Fetch transaction details for fee calculation
          const txDetails = await connection.getTransaction(signature, {
            maxSupportedTransactionVersion: 0,
          });

          const feeSOL = txDetails?.meta?.fee ? txDetails.meta.fee / LAMPORTS_PER_SOL : 0;

          setResult((prev: any) => ({
            ...prev!,
            status: 'success',
            confirmationTime: attempts * 1000, // Rough estimate
            cost: feeSOL,
          }));

          toast({
            title: "Transaction Confirmed! ✅",
            description: `Transaction confirmed on-chain. Fee: ${feeSOL.toFixed(6)} SOL`,
          });

          // Update balance
          setTimeout(() => checkBalance(), 1000);
          return;
        }

        if (status?.err) {
          // Transaction failed
          console.error("❌ Transaction failed:", status.err);
          
          setResult((prev: any) => ({
            ...prev!,
            status: 'failed',
            error: true,
            message: `Transaction failed: ${JSON.stringify(status.err)}`,
          }));

          toast({
            variant: "destructive",
            title: "Transaction Failed",
            description: "Transaction was rejected on-chain",
          });
          return;
        }

        // Not confirmed yet, try again
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000); // Check again in 1 second
        } else {
          console.log("⏱️ Confirmation timeout - transaction may still be processing");
          toast({
            title: "Confirmation Timeout",
            description: "Transaction submitted but confirmation is taking longer than expected. Check explorer for updates.",
          });
        }
      } catch (error) {
        console.error("Error checking transaction status:", error);
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 1000);
        }
      }
    };

    // Start checking
    setTimeout(checkStatus, 1000); // Wait 1 second before first check
  };

  const handleSubmitTransaction = async () => {
    if (!keypair) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Generate a keypair first",
      });
      return;
    }

    if (!recipientAddress.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Enter recipient address",
      });
      return;
    }

    if (!apiKey.trim()) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Enter your API key",
      });
      return;
    }

    const amountSOL = parseFloat(amount);
    if (isNaN(amountSOL) || amountSOL <= 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Enter a valid amount",
      });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      let connection: Connection | null = null;
      let balanceSOL = 0;
      let blockhash = "";

      // Try multiple RPC endpoints for balance check and blockhash
      for (let i = 0; i < MAINNET_RPCS.length; i++) {
        try {
          connection = createConnection(MAINNET_RPCS[i]);
          
          // Check balance
          const balanceLamports = await connection.getBalance(keypair.publicKey);
          balanceSOL = balanceLamports / LAMPORTS_PER_SOL;
          
          // Get latest blockhash
          const blockhashResult = await connection.getLatestBlockhash();
          blockhash = blockhashResult.blockhash;
          
          // Success! Exit loop
          break;
        } catch (error: any) {
          console.error(`Failed with RPC ${i + 1}:`, error);
          
          // If this was the last RPC, throw error
          if (i === MAINNET_RPCS.length - 1) {
            throw new Error("All RPC endpoints are unavailable. Please try again later.");
          }
        }
      }

      if (!connection || !blockhash) {
        throw new Error("Failed to connect to Solana network");
      }
      
      if (balanceSOL < amountSOL + 0.001) {
        throw new Error(`Insufficient balance. You have ${balanceSOL.toFixed(4)} SOL`);
      }

      // PREFLIGHT CHECK: Verify wallet is a pure system account (required for Gateway tips)
      // System Program transfers require source account to have NO custom data
      console.log("Checking if wallet is compatible with Gateway tips...");
      try {
        const accountInfo = await connection.getAccountInfo(keypair.publicKey);
        
        if (accountInfo && accountInfo.data.length > 0) {
          toast({
            variant: "destructive",
            title: "Wallet Not Compatible",
            description: "This wallet has custom data and cannot be used for Gateway tip transfers. Please generate a fresh wallet.",
          });
          setResult({
            error: true,
            message: `Wallet account contains data (${accountInfo.data.length} bytes). Gateway tips require a pure system account with no custom data. Please generate a new wallet or use a different one.`,
          });
          return;
        }
        
        console.log("✅ Wallet is a pure system account (compatible with Gateway tips)");
      } catch (error) {
        console.error("Failed to check account info:", error);
        // Continue anyway - let Gateway handle it
      }

      // STEP 1: Get tip instructions from Gateway
      console.log("Getting tip instructions from Gateway...");
      
      const tipResponse = await fetch("/api/public/tip-instructions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          feePayer: keypair.publicKey.toBase58(),
          // jitoTipRange is set at project level in Gateway dashboard, don't override
        }),
      });

      const tipData = await tipResponse.json();

      if (!tipResponse.ok || !tipData.success) {
        throw new Error(tipData.error || "Failed to get tip instructions");
      }

      console.log("Got tip instructions:", tipData.data.instructions.length, "instructions");
      console.log("Full tip instructions response:", JSON.stringify(tipData.data.instructions, null, 2));

      // STEP 2: Create transaction with tip instructions + transfer
      const transaction = new Transaction();
      
      // Add tip instructions first (if any)
      if (tipData.data.instructions && tipData.data.instructions.length > 0) {
        tipData.data.instructions.forEach((ix: any, index: number) => {
          console.log(`Processing instruction #${index}:`, ix);
          console.log(`Accounts for instruction #${index}:`, ix.accounts);
          
          // Convert data object {"0": 2, "1": 0, ...} to Uint8Array
          const dataBytes = new Uint8Array(Object.values(ix.data));
          
          const accountMetas = ix.accounts.map((acc: any, accIndex: number) => {
            // Parse from Gateway response format:
            // - role: 3 = writable+signer, 1 = writable, 0 = readonly
            // - signer object exists for signing accounts
            const isSigner = !!acc.signer;
            const isWritable = acc.role === 1 || acc.role === 3;
            
            console.log(`  Account ${accIndex}:`, {
              address: acc.address,
              role: acc.role,
              hasSigner: !!acc.signer,
              computed_isSigner: isSigner,
              computed_isWritable: isWritable,
            });
            
            return {
              pubkey: new PublicKey(acc.address),
              isSigner,
              isWritable,
            };
          });
          
          transaction.add({
            programId: new PublicKey(ix.programAddress),
            keys: accountMetas,
            data: dataBytes as any, // Uint8Array compatible with TransactionInstruction
          });
        });
      }
      
      // Add the actual transfer instruction
      transaction.add(
        SystemProgram.transfer({
          fromPubkey: keypair.publicKey,
          toPubkey: new PublicKey(recipientAddress),
          lamports: amountSOL * LAMPORTS_PER_SOL,
        })
      );

      transaction.recentBlockhash = blockhash;
      transaction.feePayer = keypair.publicKey;

      console.log("Signing transaction with tip instructions...");

      // STEP 3: Sign the transaction
      transaction.sign(keypair);

      // STEP 4: Serialize signed transaction
      const signedSerialized = transaction.serialize();
      const signedBase64 = btoa(
        String.fromCharCode(...Array.from(signedSerialized))
      );

      console.log("Submitting signed transaction to Gateway...");

      // STEP 5: Submit signed transaction to Observatory Public API
      const response = await fetch("/api/public/transactions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": apiKey,
        },
        body: JSON.stringify({
          transaction: signedBase64,
          encoding: "base64",
          metadata: {
            description: `SOL transfer: ${amountSOL} SOL to ${recipientAddress.substring(0, 8)}...`,
            category: "transfer",
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || data.message || "Failed to submit transaction");
      }

      setResult(data.data);
      
      toast({
        title: "Transaction submitted!",
        description: `Signature: ${data.data.signature.substring(0, 20)}... (checking confirmation...)`,
      });

      // Start polling for confirmation
      pollTransactionConfirmation(data.data.signature, connection!);

      // Update balance after tx
      setTimeout(() => checkBalance(), 3000);
    } catch (error: any) {
      console.error("Transaction submission error:", error);
      toast({
        variant: "destructive",
        title: "Submission failed",
        description: error.message || "Failed to submit transaction",
      });
      setResult({
        error: true,
        message: error.message,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const fillDemoData = () => {
    // Demo recipient address (random devnet address)
    setRecipientAddress("11111111111111111111111111111111");
    setAmount("0.01");
  };

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setLocation("/dashboard")}
        className="mb-2"
        data-testid="button-back"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Dashboard
      </Button>

      <div>
        <h1 className="text-3xl font-bold tracking-tight" data-testid="text-page-title">
          Test Transaction
        </h1>
        <p className="text-muted-foreground mt-2">
          Create and submit a real SOL transfer transaction to Solana <strong className="text-orange-500">MAINNET</strong> via Sanctum Gateway
        </p>
        <Alert className="bg-orange-500/10 border-orange-500/20 mt-4">
          <AlertDescription className="text-xs text-orange-600">
            ⚠️ <strong>WARNING:</strong> This uses REAL Solana mainnet. Transactions use REAL SOL with actual value!
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Wallet Setup */}
        <Card>
          <CardHeader>
            <CardTitle>1. Wallet Setup</CardTitle>
            <CardDescription>
              Generate a keypair or import existing wallet (MAINNET - uses real SOL!)
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!keypair ? (
              <div className="space-y-2">
                <Button
                  onClick={generateKeypair}
                  className="w-full"
                  data-testid="button-generate-keypair"
                >
                  <Key className="mr-2 h-4 w-4" />
                  Generate Test Keypair
                </Button>
                
                {/* Import Wallet Dialog */}
                <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="w-full"
                      data-testid="button-import-wallet"
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Import Wallet
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Import Wallet</DialogTitle>
                      <DialogDescription>
                        Enter your private key in base58 string or JSON array format.
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="private-key-import">Private Key</Label>
                        <Textarea
                          id="private-key-import"
                          placeholder='5Jx... (base58) or [123,45,67,...] (JSON array)'
                          value={privateKeyInput}
                          onChange={(e) => setPrivateKeyInput(e.target.value)}
                          className="font-mono text-xs h-32"
                          data-testid="textarea-private-key"
                        />
                        <p className="text-xs text-muted-foreground">
                          Supports: Base58 string from Phantom/Solflare OR JSON array [1,2,3,...]
                        </p>
                      </div>
                      <Alert className="bg-yellow-500/10 border-yellow-500/20">
                        <AlertDescription className="text-xs text-yellow-600">
                          ⚠️ Never share your private key! This uses REAL mainnet SOL.
                        </AlertDescription>
                      </Alert>
                      <div className="flex gap-2">
                        <Button
                          onClick={importKeypair}
                          className="flex-1"
                          data-testid="button-import-confirm"
                        >
                          Import
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setImportDialogOpen(false);
                            setPrivateKeyInput("");
                          }}
                          className="flex-1"
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Public Key</Label>
                  <div className="flex gap-2">
                    <Input
                      value={keypair.publicKey.toBase58()}
                      readOnly
                      className="font-mono text-xs"
                      data-testid="input-public-key"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyPublicKey}
                      data-testid="button-copy-public-key"
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Balance</Label>
                  <div className="flex gap-2 items-center">
                    {balance !== null ? (
                      <div className="text-2xl font-bold" data-testid="text-balance">
                        {balance.toFixed(4)} SOL
                      </div>
                    ) : (
                      <Button
                        onClick={checkBalance}
                        variant="outline"
                        size="sm"
                        data-testid="button-check-balance"
                      >
                        Check Balance
                      </Button>
                    )}
                  </div>
                </div>

                <Alert className="bg-orange-500/10 border-orange-500/20">
                  <AlertDescription className="text-xs text-orange-600">
                    ℹ️ Airdrop not available on mainnet. Please fund your wallet with real SOL from an exchange.
                  </AlertDescription>
                </Alert>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    onClick={generateKeypair}
                    variant="ghost"
                    size="sm"
                  >
                    Generate New
                  </Button>
                  
                  {/* Export Wallet Dialog */}
                  <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        data-testid="button-export-wallet"
                      >
                        <Download className="mr-2 h-4 w-4" />
                        Export
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Export Private Key</DialogTitle>
                        <DialogDescription>
                          Save your private key to import this wallet later. Never share this with anyone!
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label>Private Key (Base58)</Label>
                          <div className="relative">
                            <Textarea
                              value={showPrivateKey ? exportPrivateKey('base58') : "••••••••••••••••••••••••••••••••"}
                              readOnly
                              className="font-mono text-xs h-32 pr-20"
                              data-testid="textarea-private-key-export"
                            />
                            <div className="absolute right-2 top-2 flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setShowPrivateKey(!showPrivateKey)}
                                data-testid="button-toggle-private-key"
                              >
                                {showPrivateKey ? (
                                  <EyeOff className="h-4 w-4" />
                                ) : (
                                  <Eye className="h-4 w-4" />
                                )}
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={copyPrivateKey}
                                data-testid="button-copy-private-key"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <Alert className="bg-red-500/10 border-red-500/20">
                          <AlertDescription className="text-xs text-red-600">
                            🔒 <strong>Keep this secure!</strong> Anyone with this key can access your wallet.
                          </AlertDescription>
                        </Alert>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setExportDialogOpen(false);
                            setShowPrivateKey(false);
                          }}
                          className="w-full"
                        >
                          Close
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            )}

            <Alert className="bg-orange-500/10 border-orange-500/20">
              <AlertDescription className="text-xs text-orange-600">
                <strong>⚠️ MAINNET WARNING:</strong> This uses real Solana mainnet. All transactions use REAL SOL with actual monetary value. Test with small amounts!
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Transaction Form */}
        <Card>
          <CardHeader>
            <CardTitle>2. Create Transaction</CardTitle>
            <CardDescription>
              Build and submit a SOL transfer via Sanctum Gateway
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="api-key">Observatory API Key</Label>
              <Input
                id="api-key"
                type="password"
                placeholder="obs_..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                data-testid="input-api-key"
              />
              <p className="text-xs text-muted-foreground">
                Get your API key from Settings → API Keys
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="Solana address (base58)"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                className="font-mono text-xs"
                data-testid="input-recipient"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (SOL)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.001"
                placeholder="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                data-testid="input-amount"
              />
            </div>

            <div className="flex gap-2">
              <Button
                onClick={fillDemoData}
                variant="outline"
                className="flex-1"
                data-testid="button-fill-demo"
              >
                Fill Demo Data
              </Button>
              <Button
                onClick={handleSubmitTransaction}
                disabled={isSubmitting || !keypair}
                className="flex-1"
                data-testid="button-submit"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit via Gateway
                  </>
                )}
              </Button>
            </div>

            {balance !== null && balance < 0.01 && (
              <Alert>
                <AlertDescription className="text-xs text-amber-600">
                  ⚠️ Low balance! Request airdrop first.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.error ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Transaction Failed
                </>
              ) : result.status === "success" ? (
                <>
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Transaction Successful
                </>
              ) : (
                <>
                  <Clock className="h-5 w-5 text-yellow-500" />
                  Transaction Pending
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.error ? (
              <div className="text-destructive" data-testid="text-error">
                {result.message}
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Signature</Label>
                  <div className="font-mono text-sm break-all" data-testid="text-signature">
                    {result.signature}
                  </div>
                  <a
                    href={`https://explorer.solana.com/tx/${result.signature}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline"
                  >
                    View on Solana Explorer (Mainnet) →
                  </a>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Status</Label>
                    <div className="font-semibold capitalize" data-testid="text-status">
                      {result.status}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Route</Label>
                    <div className="font-semibold" data-testid="text-route">
                      {result.route}
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Confirmation Time</Label>
                    <div className="font-semibold" data-testid="text-confirmation-time">
                      {result.confirmationTime}ms
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs text-muted-foreground">Cost</Label>
                    <div className="font-semibold" data-testid="text-cost">
                      {result.cost.toFixed(6)} SOL
                    </div>
                  </div>
                </div>

                {result.jitoTipRefunded > 0 && (
                  <div>
                    <Label className="text-xs text-muted-foreground">Jito Tip Refunded</Label>
                    <div className="font-semibold text-green-500">
                      {result.jitoTipRefunded.toFixed(6)} SOL
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
