"use client";

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within ToastProvider");
  return context;
}

const icons: Record<ToastType, ReactNode> = {
  success: <CheckCircle2 className="h-4 w-4 text-emerald-500" />,
  error: <XCircle className="h-4 w-4 text-red-500" />,
  warning: <AlertTriangle className="h-4 w-4 text-amber-500" />,
  info: <Info className="h-4 w-4 text-blue-500" />,
};

const bgColors: Record<ToastType, string> = {
  success: "bg-emerald-50 border-emerald-200 dark:bg-emerald-900/20 dark:border-emerald-800/50",
  error: "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800/50",
  warning: "bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800/50",
  info: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800/50",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = "info") => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      {/* Toast container */}
      <div
        className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 shadow-lg backdrop-blur-sm animate-slide-in-right ${bgColors[t.type]}`}
            role="alert"
          >
            {icons[t.type]}
            <span className="text-sm font-medium text-gray-900 dark:text-white">{t.message}</span>
            <button
              onClick={() => removeToast(t.id)}
              className="ml-2 rounded-lg p-0.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
