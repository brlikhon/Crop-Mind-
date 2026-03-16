import * as React from "react"

// Minimal placeholder for tooltip context to avoid breaking App.tsx if it was referenced
export function TooltipProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
