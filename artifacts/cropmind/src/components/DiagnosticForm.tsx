import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, Sparkles, Camera, X } from "lucide-react";
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
  onSubmit: (query: string, image?: File) => void;
  isPending: boolean;
}

export function DiagnosticForm({ onSubmit, isPending }: DiagnosticFormProps) {
  const [query, setQuery] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim() && !isPending) {
      onSubmit(query, imageFile ?? undefined);
    }
  };

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const clearImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
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
          Describe your crop situation or upload a photo. Our multi-agent system will analyze symptoms, check live weather, verify market conditions, and deliver a unified recommendation.
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

          {imagePreview && (
            <div className="px-6 pb-3 flex items-center gap-3">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Crop photo"
                  className="h-16 w-16 rounded-lg object-cover border"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
              <span className="text-xs text-muted-foreground">{imageFile?.name}</span>
            </div>
          )}

          <div className="flex items-center justify-between p-3 bg-muted/20 border-t border-border/30">
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleImageSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-background border hover:bg-primary/5 hover:border-primary/40 transition-colors disabled:opacity-50"
              >
                <Camera className="w-3.5 h-3.5" />
                {imageFile ? "Change Photo" : "Add Photo"}
              </button>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Sparkles className="w-4 h-4 text-secondary" />
                <span>4 ADK agents + MCP tools + pgvector</span>
              </div>
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
