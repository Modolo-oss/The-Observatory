import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { 
  Satellite, 
  ArrowRight, 
  Zap, 
  Shield, 
  BarChart3, 
  Brain, 
  Rocket,
  CheckCircle2,
  TrendingUp,
  Clock,
  DollarSign,
  Activity,
  Bot
} from 'lucide-react';
import observatoryLogo from '@assets/image_1761577428632.png';

// Helper component for feature cards
function FeatureCard({ icon, title, description }) {
  return (
    <div className="backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl p-6 hover:border-primary/50 transition-colors">
      <div className="p-3 rounded-xl bg-primary/10 w-fit mb-4">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

// Helper component for glass cards
function GlassCard({ className, children }) {
  return (
    <div className={`backdrop-blur-xl bg-card/50 border border-border/50 rounded-2xl ${className}`}>
      {children}
    </div>
  );
}


export default function LandingPage() {
  // Assuming theme and observatoryLogoDark/Light are available in the scope if used.
  // For this standalone component, we'll omit theme-specific logic for simplicity.
  // const { theme } = useTheme(); 

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      {/* Background Effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Navigation */}
      <nav className="relative border-b border-border/50 backdrop-blur-xl bg-background/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-gradient-to-br from-purple-600 via-blue-600 to-blue-800 shadow-lg border border-purple-400/30">
                <img src={observatoryLogo} alt="Observatory" className="h-6 w-6 object-contain" />
              </div>
              <span className="text-xl font-bold bg-gradient-to-r from-primary to-blue-500 bg-clip-text text-transparent">
                The Observatory
              </span>
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login">
                <Button variant="ghost" data-testid="button-login">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/register">
                <Button data-testid="button-register">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center space-y-8">
            {/* Logo */}
            <div className="flex justify-center">
              <div className="relative">
                <div className="h-24 w-24 rounded-2xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center p-4 shadow-2xl border border-primary/30">
                  <img 
                    src={observatoryLogo} 
                    alt="Observatory" 
                    className="w-full h-full object-contain opacity-90" 
                  />
                </div>
                <div className="absolute inset-0 rounded-2xl bg-primary/30 blur-2xl animate-pulse" />
              </div>
            </div>

            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              The <span className="bg-gradient-to-r from-primary via-purple-500 to-cyan-500 bg-clip-text text-transparent">Observatory</span>
            </h1>

            <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto">
              Live Benchmark Platform for Sanctum Gateway
            </p>

            <p className="text-lg text-muted-foreground/80 max-w-2xl mx-auto">
              Run real transaction benchmarks on Solana mainnet, analyze Gateway performance, and export comprehensive reports for your project.
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link href="/auth/register">
                <Button size="lg" className="text-lg px-8 h-14 w-full sm:w-auto" data-testid="button-get-started">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline" className="text-lg px-8 h-14 w-full sm:w-auto" data-testid="button-sign-in">
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="relative py-20 px-6">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Everything You Need to Scale
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Production-ready infrastructure for enterprise Solana applications
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Zap className="h-8 w-8" />}
              title="🚀 Live Benchmark Runner"
              description="Execute real transaction tests on Sanctum Gateway with mainnet wallets and get instant performance data."
            />
            <FeatureCard
              icon={<BarChart3 className="h-8 w-8" />}
              title="📊 Real-time Analytics"
              description="Track success rates, latency, and costs with live charts and historical trend analysis."
            />
            <FeatureCard
              icon={<Activity className="h-8 w-8" />}
              title="📈 Performance Comparison"
              description="Compare Gateway performance across multiple runs and export detailed CSV reports."
            />
            <FeatureCard
              icon={<DollarSign className="h-8 w-8" />}
              title="💰 Cost Tracking"
              description="Monitor exact transaction fees and Jito tip refunds for accurate cost analysis."
            />
            <FeatureCard
              icon={<Bot className="h-8 w-8" />}
              title="🤖 AI Insights"
              description="Get intelligent recommendations powered by Claude 3.5 Sonnet for optimization opportunities."
            />
            <FeatureCard
              icon={<Shield className="h-8 w-8" />}
              title="🔐 Secure & Production-Ready"
              description="API key management, rate limiting, and enterprise-grade security for your benchmarking workflows."
            />
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="relative py-20 px-6 bg-primary/5">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Why Choose The Observatory?</h2>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Zero Redeployment Required</h3>
                <p className="text-muted-foreground">
                  Tune transaction routing parameters live through our dashboard without touching code
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Production-Ready Security</h3>
                <p className="text-muted-foreground">
                  Bcrypt-hashed API keys, PostgreSQL sessions, and enterprise-grade authentication
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <CheckCircle2 className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Developer-Friendly API</h3>
                <p className="text-muted-foreground">
                  RESTful public API with rate limiting, comprehensive docs, and SDK support (coming soon)
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <Clock className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-lg font-semibold mb-1">Built for Hackathons, Ready for Production</h3>
                <p className="text-muted-foreground">
                  Deploy to Railway in minutes, scale to millions of transactions
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-20 px-4">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Built for <span className="text-primary">Sanctum Gateway Hackathon</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">100%</div>
              <p className="text-muted-foreground">Real Mainnet Transactions</p>
            </GlassCard>
            <GlassCard className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">Live</div>
              <p className="text-muted-foreground">WebSocket Updates</p>
            </GlassCard>
            <GlassCard className="p-8 text-center">
              <div className="text-4xl font-bold text-primary mb-2">CSV</div>
              <p className="text-muted-foreground">Export Reports</p>
            </GlassCard>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4">
        <GlassCard className="max-w-4xl mx-auto p-12 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Benchmark Sanctum Gateway?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Run live transaction tests on mainnet and analyze Gateway performance with professional tools.
          </p>
          <Button asChild size="lg" className="text-lg px-8">
            <Link href="/auth/register">Start Benchmarking Now</Link>
          </Button>
        </GlassCard>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-border/50 py-8 px-6">
        <div className="container mx-auto">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Satellite className="h-4 w-4" />
              <span>The Observatory © 2025</span>
            </div>
            <div>
              Built with Sanctum Gateway
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}