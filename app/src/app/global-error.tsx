"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global error:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-50">
        <div className="text-center px-4">
          <div className="mb-6 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30">
            <AlertTriangle className="h-8 w-8 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="mb-2 text-2xl font-bold">Something went wrong</h2>
          <p className="mb-6 text-gray-600 dark:text-gray-400">
            An unexpected error occurred. Please try again.
          </p>
          <button
            onClick={reset}
            className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-white font-semibold shadow-lg"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
