import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Leaf, Network, Activity } from "lucide-react";
import { useHealthCheck } from "@/hooks/use-api";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function Layout({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  const { data: health } = useHealthCheck();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Dynamic Background Image */}
      <div 
        className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: `url(${import.meta.env.BASE_URL}images/bg-texture.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed'
        }}
      />
      
      <header className="sticky top-0 z-50 w-full border-b border-border/40 glass-panel">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-md shadow-primary/20">
              <Leaf className="w-5 h-5" />
            </div>
            <span className="font-display font-bold text-xl tracking-tight text-foreground">
              CropMind
            </span>
            <span className="ml-2 px-2 py-0.5 rounded-full bg-secondary/15 text-secondary text-[10px] font-bold uppercase tracking-wider hidden sm:inline-block">
              APAC Network
            </span>
          </div>

          <nav className="flex items-center gap-1 bg-muted/50 p-1 rounded-xl">
            <Link 
              href="/" 
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                location === "/" 
                  ? "bg-white shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              <Activity className="w-4 h-4" />
              <span className="hidden sm:inline">Diagnose</span>
            </Link>
            <Link 
              href="/architecture" 
              className={cn(
                "px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-2",
                location === "/architecture" 
                  ? "bg-white shadow-sm text-foreground" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/50"
              )}
            >
              <Network className="w-4 h-4" />
              <span className="hidden sm:inline">Architecture</span>
            </Link>
          </nav>

          <div className="flex items-center gap-3">
             <div className="flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full bg-background border">
                <div className={cn("w-2 h-2 rounded-full animate-pulse", health ? "bg-success" : "bg-destructive")} />
                <span className="hidden sm:inline">{health ? "Systems Online" : "Connecting..."}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative z-10 py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        {children}
      </main>
      
      <footer className="py-6 border-t border-border/50 text-center text-sm text-muted-foreground relative z-10">
        <p>Powered by Google Cloud Gen AI Academy APAC 2026 • ADK + MCP + AlloyDB</p>
      </footer>
    </div>
  );
}
