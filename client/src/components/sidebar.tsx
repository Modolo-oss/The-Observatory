import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import {
  LayoutDashboard,
  Settings,
  Activity,
  Moon,
  Sun,
  BarChart3,
  Menu,
  X,
  Key,
  LogOut,
  User,
} from "lucide-react";
import { useTheme } from "./theme-provider";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import observatoryLogoLight from "@assets/image_1761577428632.png";
import observatoryLogoDark from "@assets/image_1761593754071.png";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Benchmarking", href: "/benchmarking", icon: BarChart3 },
  { name: "Live Analytics", href: "/analytics", icon: Activity },
  { name: "API Keys", href: "/api-keys", icon: Key },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({ onLinkClick }: { onLinkClick?: () => void }) {
  const [location, setLocation] = useLocation();
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await apiRequest('POST', '/api/auth/logout', {});

      // Clear auth cache
      queryClient.setQueryData(['/api/auth/status'], { authenticated: false, userId: null });
      queryClient.clear();

      toast({
        title: 'Logged out successfully',
        description: 'See you next time!',
      });

      // Redirect to landing page
      setLocation('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Logout failed',
        description: error.message || 'Please try again',
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-sidebar/95 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-3 p-6 border-b border-white/10">
        <div className="relative">
          <div className="h-10 w-10 rounded-lg bg-primary/10 dark:bg-primary/20 flex items-center justify-center p-2 shadow-lg border border-primary/30">
            <img 
              src={theme === "dark" ? observatoryLogoDark : observatoryLogoLight} 
              alt="Observatory" 
              className="w-full h-full object-contain opacity-90" 
            />
          </div>
          <div className="absolute inset-0 rounded-lg bg-primary/30 blur-xl animate-pulse" />
        </div>
        <div>
          <h1 className="text-lg font-bold tracking-tight">The Observatory</h1>
          <p className="text-xs text-muted-foreground">Mission Control</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.name} href={item.href}>
              <div
                onClick={onLinkClick}
                data-testid={`nav-${item.name.toLowerCase().replace(" ", "-")}`}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer",
                  isActive
                    ? "bg-primary/10 text-primary border-l-2 border-primary shadow-lg shadow-primary/10"
                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground border-l-2 border-transparent"
                )}
              >
                <item.icon className="h-5 w-5" />
                <span>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile & Theme Toggle */}
      <div className="p-4 border-t border-white/10 space-y-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
          className="w-full justify-start gap-3"
          data-testid="button-theme-toggle"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === "dark" ? "Light Mode" : "Dark Mode"}</span>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer" data-testid="button-profile-menu">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-cyan-500 flex items-center justify-center text-sm font-bold">
                OA
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">Observatory Admin</p>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/settings">
                <div className="flex items-center gap-2 w-full cursor-pointer" data-testid="menu-settings">
                  <User className="h-4 w-4" />
                  <span>Settings</span>
                </div>
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="text-red-600 dark:text-red-400 focus:text-red-600 dark:focus:text-red-400"
              data-testid="button-logout"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span>{isLoggingOut ? 'Logging out...' : 'Logout'}</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-10 w-10" data-testid="button-mobile-menu">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-72">
            <SidebarContent onLinkClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:block fixed left-0 top-0 h-screen w-72 border-r border-white/10">
        <SidebarContent />
      </div>
    </>
  );
}