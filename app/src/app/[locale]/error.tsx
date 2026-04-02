"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors");

  useEffect(() => {
    console.error("Page error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-red-100 p-4 dark:bg-red-900/30">
            <AlertCircle className="h-12 w-12 text-red-600 dark:text-red-400" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold">{t("generic")}</h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {error.digest && (
            <span className="block text-sm text-gray-400">
              Error ID: {error.digest}
            </span>
          )}
        </p>
        <Button onClick={reset} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          {t("tryAgain")}
        </Button>
      </div>
    </div>
  );
}
