import { useState, useEffect } from "react";

// A simple toast hook implementation since we don't have the full shadcn toast registry available
export type ToastVariant = "default" | "destructive";

interface ToastProps {
  id: string;
  title: string;
  description?: string;
  variant?: ToastVariant;
}

let toastCount = 0;
const observers = new Set<(toasts: ToastProps[]) => void>();
let toasts: ToastProps[] = [];

function notifyObservers() {
  observers.forEach((observer) => observer(toasts));
}

export function toast(props: Omit<ToastProps, "id">) {
  const id = `toast-${toastCount++}`;
  const newToast = { ...props, id };
  toasts = [...toasts, newToast];
  notifyObservers();

  // Auto dismiss after 3 seconds
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    notifyObservers();
  }, 3000);
}

export function useToast() {
  const [currentToasts, setCurrentToasts] = useState<ToastProps[]>(toasts);

  useEffect(() => {
    observers.add(setCurrentToasts);
    return () => {
      observers.delete(setCurrentToasts);
    };
  }, []);

  return { toast, toasts: currentToasts };
}
