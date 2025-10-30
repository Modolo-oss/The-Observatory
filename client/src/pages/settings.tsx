import { Layout } from "@/components/layout";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Settings as SettingsIcon, Key, ArrowRight } from "lucide-react";
import { useLocation } from "wouter";

export default function Settings() {
  const [, setLocation] = useLocation();

  return (
    <Layout>
      <div className="p-8 space-y-8 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold tracking-tight flex items-center gap-3 mb-2">
            <SettingsIcon className="h-10 w-10 text-primary" />
            Settings
          </h1>
          <p className="text-muted-foreground">Manage your Observatory account</p>
        </div>

        {/* Account Section */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">Account</h2>
              <p className="text-sm text-muted-foreground">Your Observatory account settings</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30">
              <div>
                <h3 className="font-medium">Account Information</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  View and manage your account details
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon
              </div>
            </div>

            <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30">
              <div>
                <h3 className="font-medium">Email Preferences</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Configure email notifications for benchmark results
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon
              </div>
            </div>
          </div>
        </GlassCard>

        {/* API Access */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Key className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">API Access</h2>
              <p className="text-sm text-muted-foreground">Manage API keys for programmatic access</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg border border-border/50 bg-card/30">
            <div>
              <h3 className="font-medium">API Keys</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage API keys to access The Observatory programmatically
              </p>
            </div>
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setLocation('/api-keys')}
              data-testid="button-manage-api-keys"
            >
              Manage Keys
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </GlassCard>

        {/* Danger Zone */}
        <GlassCard>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
              <SettingsIcon className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-destructive">Danger Zone</h2>
              <p className="text-sm text-muted-foreground">Irreversible and destructive actions</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
              <div>
                <h3 className="font-medium">Delete Account</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data
                </p>
              </div>
              <div className="text-sm text-muted-foreground">
                Coming soon
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </Layout>
  );
}
