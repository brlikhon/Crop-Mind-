import { useToast } from "@/hooks/use-toast";
import { AlertTriangle, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function Toaster() {
  const { toasts } = useToast();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border min-w-[300px] max-w-md ${
              t.variant === "destructive" 
                ? "bg-destructive text-destructive-foreground border-destructive/50" 
                : "bg-card text-card-foreground border-border"
            }`}
          >
            {t.variant === "destructive" ? (
              <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
            ) : (
              <CheckCircle className="w-5 h-5 shrink-0 mt-0.5 text-success" />
            )}
            <div>
              <h4 className="font-bold text-sm">{t.title}</h4>
              {t.description && <p className="text-sm opacity-90 mt-1">{t.description}</p>}
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
