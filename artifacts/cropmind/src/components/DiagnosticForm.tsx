import { useState } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const PRESETS = [
  "My rice leaves are yellowing with brown spots in Punjab, India",
  "Tomato plants showing late blight symptoms in Karnataka",
  "Coffee leaf rust spreading in Vietnam Central Highlands"
];

interface DiagnosticFormProps {
  onSubmit: (query: string) => void;
  isPending: boolean;
}

export function DiagnosticForm({ onSubmit, isPending }: DiagnosticFormProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isPending) {
      onSubmit(query);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-3xl mx-auto"
    >
      <div className="text-center mb-8">
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-foreground mb-4">
          Expert Crop Intelligence
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Describe your crop situation. Our multi-agent orchestrator will analyze symptoms, check live weather, verify market conditions, and scan historical cases for a unified recommendation.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-1 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-[2rem] blur opacity-50 group-hover:opacity-100 transition duration-500"></div>
        <div className="relative bg-card rounded-3xl shadow-xl border border-border/50 overflow-hidden focus-within:border-primary/50 transition-colors">
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            disabled={isPending}
            placeholder="E.g., I have 2 hectares of wheat in Sindh. I'm noticing white powdery spots on the lower leaves, and it's been unusually humid..."
            className="w-full h-32 p-6 bg-transparent text-lg resize-none focus:outline-none disabled:opacity-50 placeholder:text-muted-foreground/60"
          />
          <div className="flex items-center justify-between p-3 bg-muted/20 border-t border-border/30">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-3">
              <Sparkles className="w-4 h-4 text-secondary" />
              <span>Powered by 4 specialized agents + pgvector</span>
            </div>
            <button
              type="submit"
              disabled={!query.trim() || isPending}
              className={cn(
                "flex items-center gap-2 px-6 py-2.5 rounded-full font-bold text-sm transition-all duration-300",
                !query.trim() || isPending
                  ? "bg-muted text-muted-foreground cursor-not-allowed"
                  : "bg-primary text-primary-foreground hover:shadow-lg hover:shadow-primary/25 hover:-translate-y-0.5 active:translate-y-0"
              )}
            >
              {isPending ? "Analyzing..." : "Diagnose"}
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {PRESETS.map((preset, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => setQuery(preset)}
            disabled={isPending}
            className="text-xs px-4 py-2 rounded-full bg-card border shadow-sm hover:border-primary/40 hover:bg-primary/5 transition-colors text-muted-foreground hover:text-foreground text-left max-w-full truncate"
          >
            {preset}
          </button>
        ))}
      </div>
    </motion.div>
  );
}
