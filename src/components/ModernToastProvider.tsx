import { ReactNode, createContext, useContext, useState, useCallback } from "react";
import { ModernToastItem } from "@/components/ModernToast";

export type ToastVariant = "default" | "success" | "error" | "warning";

export interface ToastConfig {
  title?: string;
  description?: string;
  variant?: ToastVariant;
  duration?: number; // milliseconds, 0 = no auto close
}

interface Toast extends ToastConfig {
  id: string;
}

interface ModernToastContextType {
  toasts: Toast[];
  showToast: (config: ToastConfig) => string;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ModernToastContext = createContext<ModernToastContextType | undefined>(undefined);

export function useModernToast() {
  const context = useContext(ModernToastContext);
  if (!context) {
    throw new Error("useModernToast must be used within ModernToastProvider");
  }
  return context;
}

let toastId = 0;

export function ModernToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((config: ToastConfig): string => {
    const id = `toast-${++toastId}`;
    const toast: Toast = {
      ...config,
      id,
      duration: config.duration ?? 3000, // 3 seconds default
    };
    setToasts((prev) => [...prev, toast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ModernToastContext.Provider value={{ toasts, showToast, dismissToast, dismissAll }}>
      {children}
      <div className="fixed top-0 right-0 pointer-events-none z-50">
        {toasts.map((toast) => (
          <ModernToastItem
            key={toast.id}
            {...toast}
            onClose={() => dismissToast(toast.id)}
          />
        ))}
      </div>
    </ModernToastContext.Provider>
  );
}
