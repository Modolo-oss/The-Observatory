import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Layout } from '@/components/layout';
import { GlassCard } from '@/components/glass-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Alert,
  AlertDescription,
} from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Key, Plus, Copy, Trash2, Check, AlertCircle, Calendar, Activity } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  isActive: boolean;
  rateLimit: number;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

export default function ApiKeysPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyData, setNewKeyData] = useState<any>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Fetch API keys
  const { data: apiKeysData, isLoading } = useQuery<{ apiKeys: ApiKey[] }>({
    queryKey: ['/api/api-keys'],
  });

  const apiKeys = apiKeysData?.apiKeys || [];

  // Create API key mutation
  const createKeyMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await apiRequest('POST', '/api/api-keys', { name });
      return res.json();
    },
    onSuccess: (data) => {
      setNewKeyData(data.apiKey);
      setNewKeyName('');
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: 'API key created',
        description: 'Save your API key now - you won\'t see it again!',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to create API key',
        description: error.message,
      });
    },
  });

  // Delete API key mutation
  const deleteKeyMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest('DELETE', `/api/api-keys/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/api-keys'] });
      toast({
        title: 'API key deleted',
        description: 'The API key has been permanently removed',
      });
    },
    onError: (error: any) => {
      toast({
        variant: 'destructive',
        title: 'Failed to delete API key',
        description: error.message,
      });
    },
  });

  function handleCreateKey() {
    if (!newKeyName.trim()) {
      toast({
        variant: 'destructive',
        title: 'Name required',
        description: 'Please enter a name for your API key',
      });
      return;
    }
    createKeyMutation.mutate(newKeyName);
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    setTimeout(() => setCopiedKey(null), 2000);
    toast({
      title: 'Copied!',
      description: 'API key copied to clipboard',
    });
  }

  function handleCloseNewKeyDialog() {
    setNewKeyData(null);
    setIsCreateDialogOpen(false);
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Key className="w-8 h-8 text-primary" />
              API Keys
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage your API keys for programmatic access to The Observatory
            </p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2" data-testid="button-create-api-key">
                <Plus className="w-4 h-4" />
                Create API Key
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Create New API Key</DialogTitle>
                <DialogDescription>
                  Give your API key a descriptive name to help you remember what it's for
                </DialogDescription>
              </DialogHeader>
              
              {newKeyData ? (
                <div className="space-y-4">
                  <Alert className="border-green-500/50 bg-green-500/10">
                    <Check className="h-4 w-4 text-green-500" />
                    <AlertDescription className="text-green-500">
                      API key created successfully!
                    </AlertDescription>
                  </Alert>
                  
                  <div className="space-y-2">
                    <Label>Your API Key (save it now!)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={newKeyData.key}
                        readOnly
                        className="font-mono text-sm"
                        data-testid="input-new-api-key"
                      />
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => copyToClipboard(newKeyData.key)}
                        data-testid="button-copy-new-key"
                      >
                        {copiedKey === newKeyData.key ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Make sure to copy this key - you won't be able to see it again!
                    </p>
                  </div>

                  <Button 
                    className="w-full" 
                    onClick={handleCloseNewKeyDialog}
                    data-testid="button-close-new-key-dialog"
                  >
                    Done
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="key-name">API Key Name</Label>
                    <Input
                      id="key-name"
                      placeholder="Production API, Staging, Development..."
                      value={newKeyName}
                      onChange={(e) => setNewKeyName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleCreateKey()}
                      data-testid="input-api-key-name"
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={handleCreateKey}
                      disabled={createKeyMutation.isPending}
                      data-testid="button-submit-create-key"
                    >
                      {createKeyMutation.isPending ? 'Creating...' : 'Create Key'}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setIsCreateDialogOpen(false)}
                      data-testid="button-cancel-create-key"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Use these API keys to authenticate requests to The Observatory Public API.
            Include the key in the <code className="text-xs bg-muted px-1 py-0.5 rounded">X-API-Key</code> header.
          </AlertDescription>
        </Alert>

        {/* API Keys Table */}
        <GlassCard>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">
              Loading API keys...
            </div>
          ) : apiKeys.length === 0 ? (
            <div className="p-12 text-center">
              <Key className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No API keys yet</h3>
              <p className="text-muted-foreground mb-4">
                Create your first API key to start accessing The Observatory programmatically
              </p>
              <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-key">
                <Plus className="w-4 h-4 mr-2" />
                Create API Key
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Key</TableHead>
                  <TableHead>Rate Limit</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {apiKeys.map((key: ApiKey) => (
                  <TableRow key={key.id} data-testid={`row-api-key-${key.id}`}>
                    <TableCell className="font-medium">{key.name}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {key.keyPreview}
                        </code>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6"
                          onClick={() => copyToClipboard(key.keyPreview)}
                          data-testid={`button-copy-${key.id}`}
                        >
                          {copiedKey === key.keyPreview ? (
                            <Check className="w-3 h-3 text-green-500" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm">
                        <Activity className="w-3 h-3 text-muted-foreground" />
                        {key.rateLimit}/hr
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {key.lastUsedAt ? (
                        formatDistanceToNow(new Date(key.lastUsedAt), { addSuffix: true })
                      ) : (
                        'Never'
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        {formatDistanceToNow(new Date(key.createdAt), { addSuffix: true })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this API key?')) {
                            deleteKeyMutation.mutate(key.id);
                          }
                        }}
                        data-testid={`button-delete-${key.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </GlassCard>

        {/* API Documentation */}
        <GlassCard className="p-6">
          <h3 className="text-lg font-semibold mb-4">API Documentation</h3>
          
          <div className="space-y-6 text-sm">
            {/* Authentication */}
            <div>
              <h4 className="font-medium mb-2">Authentication</h4>
              <p className="text-muted-foreground mb-2">
                Include your API key in the <code className="bg-muted px-1 py-0.5 rounded text-xs">X-API-Key</code> header:
              </p>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_api_key_here" \\
  https://your-domain.com/api/public/health`}
              </pre>
            </div>

            {/* Benchmark Endpoints */}
            <div>
              <h4 className="font-medium mb-3">Benchmark Endpoints</h4>
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs text-primary">GET /api/public/benchmarks/summary</p>
                  <p className="text-muted-foreground mt-1">Get aggregated benchmark metrics</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_key" \\
  "https://your-domain.com/api/public/benchmarks/summary?timeWindow=24h"`}
                  </pre>
                </div>

                <div>
                  <p className="font-mono text-xs text-primary">GET /api/public/benchmarks</p>
                  <p className="text-muted-foreground mt-1">List all benchmark runs (supports filtering)</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_key" \\
  "https://your-domain.com/api/public/benchmarks?limit=20&status=completed"`}
                  </pre>
                </div>

                <div>
                  <p className="font-mono text-xs text-primary">GET /api/public/benchmarks/:id</p>
                  <p className="text-muted-foreground mt-1">Get specific benchmark run details</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_key" \\
  https://your-domain.com/api/public/benchmarks/run_abc123`}
                  </pre>
                </div>

                <div>
                  <p className="font-mono text-xs text-primary">GET /api/public/benchmarks/:id/transactions</p>
                  <p className="text-muted-foreground mt-1">Get all transactions for a benchmark run</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_key" \\
  https://your-domain.com/api/public/benchmarks/run_abc123/transactions`}
                  </pre>
                </div>

                <div>
                  <p className="font-mono text-xs text-primary">GET /api/public/benchmarks/timeseries</p>
                  <p className="text-muted-foreground mt-1">Get time series data for charts</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -H "X-API-Key: your_key" \\
  "https://your-domain.com/api/public/benchmarks/timeseries?timeWindow=7d"`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Gateway Endpoints */}
            <div>
              <h4 className="font-medium mb-3">Gateway Proxy Endpoints</h4>
              <div className="space-y-4">
                <div>
                  <p className="font-mono text-xs text-primary">POST /api/public/gateway/tip-instructions</p>
                  <p className="text-muted-foreground mt-1">Get Jito tip instructions from Gateway</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -X POST -H "X-API-Key: your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"feePayer":"5WwN8T..."}' \\
  https://your-domain.com/api/public/gateway/tip-instructions`}
                  </pre>
                </div>

                <div>
                  <p className="font-mono text-xs text-primary">POST /api/public/gateway/send-transaction</p>
                  <p className="text-muted-foreground mt-1">Submit signed transaction via Gateway</p>
                  <pre className="bg-muted p-3 rounded-lg mt-2 overflow-x-auto font-mono text-xs">
{`curl -X POST -H "X-API-Key: your_key" \\
  -H "Content-Type: application/json" \\
  -d '{"transaction":"base64_encoded_tx"}' \\
  https://your-domain.com/api/public/gateway/send-transaction`}
                  </pre>
                </div>
              </div>
            </div>

            {/* Rate Limits */}
            <div>
              <h4 className="font-medium mb-2">Rate Limits</h4>
              <p className="text-muted-foreground">
                Each API key has a rate limit (shown in table above). 
                Requests exceeding the limit will receive a <code className="bg-muted px-1 py-0.5 rounded text-xs">429 Too Many Requests</code> response.
              </p>
            </div>

            {/* Response Format */}
            <div>
              <h4 className="font-medium mb-2">Response Format</h4>
              <p className="text-muted-foreground mb-2">All responses follow this structure:</p>
              <pre className="bg-muted p-3 rounded-lg overflow-x-auto font-mono text-xs">
{`{
  "success": true,
  "data": { ... },
  "timestamp": "2025-10-29T12:00:00.000Z"
}`}
              </pre>
            </div>
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
