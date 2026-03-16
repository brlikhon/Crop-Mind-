import * as React from "react"

export function TooltipProvider({ children, delayDuration }: { children: React.ReactNode; delayDuration?: number }) {
  return <>{children}</>
}

export function Tooltip({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}

export function TooltipTrigger({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) {
  return <>{children}</>
}

export function TooltipContent({ children, side, align, hidden }: { children: React.ReactNode; side?: string; align?: string; hidden?: boolean }) {
  return null
}
