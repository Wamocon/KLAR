"use client";

import Link from "next/link";
import { useLocale } from "next-intl";
import { FileSearch } from "lucide-react";

export default function NotFound() {
  const locale = useLocale();
  const isDE = locale === "de";

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="text-center">
        <div className="mb-6 flex justify-center">
          <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
            <FileSearch className="h-12 w-12 text-gray-400" />
          </div>
        </div>
        <h2 className="mb-2 text-2xl font-bold">
          {isDE ? "404 — Seite nicht gefunden" : "404 — Page Not Found"}
        </h2>
        <p className="mb-6 text-gray-600 dark:text-gray-400">
          {isDE
            ? "Die angeforderte Seite existiert nicht."
            : "The page you're looking for doesn't exist."}
        </p>
        <Link
          href={`/${locale}`}
          className="inline-flex items-center rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300"
        >
          {isDE ? "Zurück zur Startseite" : "Back to Home"}
        </Link>
      </div>
    </div>
  );
}
