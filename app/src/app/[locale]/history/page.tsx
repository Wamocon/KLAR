"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Search, Trash2, FileSearch, Clock, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import { formatDate, truncateText } from "@/lib/utils";
import type { Verification } from "@/types";

export default function HistoryPage() {
  const t = useTranslations("history");
  const locale = useLocale();
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOrder, setSortOrder] = useState<"newest" | "oldest" | "highest" | "lowest">("newest");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const supabase = createClient();
  const { toast } = useToast();

  const fetchVerifications = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.location.href = `/${locale}/auth/login`;
      return;
    }

    let query = supabase
      .from("verifications")
      .select("*")
      .eq("user_id", user.id);

    if (sortOrder === "newest" || sortOrder === "oldest") {
      query = query.order("created_at", {
        ascending: sortOrder === "oldest",
      });
    } else {
      query = query.order("trust_score", {
        ascending: sortOrder === "lowest",
      });
    }

    const { data } = await query.range((page - 1) * pageSize, page * pageSize - 1);
    if (data) setVerifications(data);
    setLoading(false);
  }, [supabase, locale, sortOrder, page, pageSize]);

  useEffect(() => {
    fetchVerifications(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [fetchVerifications]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("deleteConfirm"))) return;

    await supabase.from("claims").delete().eq("verification_id", id);
    await supabase.from("verifications").delete().eq("id", id);
    setVerifications((prev) => prev.filter((v) => v.id !== id));
    toast(t("deleted"), "success");
  };

  const filteredVerifications = verifications.filter((v) =>
    v.input_text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8">
        <Skeleton className="mb-6 h-8 w-48" />
        <Skeleton className="mb-4 h-10 rounded-xl" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-20 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const sortButtons = [
    { key: "newest" as const, label: t("newest") },
    { key: "oldest" as const, label: t("oldest") },
    { key: "highest" as const, label: t("highestScore") },
    { key: "lowest" as const, label: t("lowestScore") },
  ];

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-30" />

      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
          {t("title")}
        </h1>

        {/* Filters */}
        <div className="mb-8 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder={t("searchPlaceholder")}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 h-11 rounded-xl border-gray-200/80 bg-white/60 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/60 focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>
          <div className="flex gap-1.5 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
            {sortButtons.map((btn) => (
              <Button
                key={btn.key}
                variant={sortOrder === btn.key ? "default" : "ghost"}
                size="sm"
                onClick={() => setSortOrder(btn.key)}
                className={`rounded-lg text-xs ${sortOrder === btn.key ? "bg-white dark:bg-gray-700 shadow-sm" : ""}`}
              >
                {btn.label}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {filteredVerifications.length === 0 ? (
          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardContent className="py-16 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                <FileSearch className="h-7 w-7 text-gray-400" />
              </div>
              <p className="text-sm text-gray-500">
                {searchQuery
                  ? locale === "de"
                    ? "Keine Ergebnisse für diese Suche."
                    : "No results for this search."
                  : locale === "de"
                  ? "Noch keine Verifizierungen."
                  : "No verifications yet."}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredVerifications.map((v, index) => (
              <Card
                key={v.id}
                className="group border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-emerald-900/5 animate-fade-in"
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <CardContent className="flex items-center gap-4 p-5">
                  <Link
                    href={`/${locale}/report/${v.id}`}
                    className="flex-1 min-w-0"
                  >
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                      {truncateText(v.input_text, 120)}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(v.created_at, locale)}
                      </span>
                      <span>·</span>
                      <span>
                        {v.total_claims} {locale === "de" ? "Behauptungen" : "claims"}
                      </span>
                      {v.processing_time_ms > 0 && (
                        <>
                          <span>·</span>
                          <span>{(v.processing_time_ms / 1000).toFixed(1)}s</span>
                        </>
                      )}
                    </div>
                  </Link>
                  <Badge
                    variant={
                      v.trust_score >= 70
                        ? "success"
                        : v.trust_score >= 40
                        ? "warning"
                        : "destructive"
                    }
                    className="text-sm font-semibold"
                  >
                    {v.trust_score}%
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(v.id)}
                    className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors"
                    aria-label={locale === "de" ? "Löschen" : "Delete"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Pagination */}
        {filteredVerifications.length > 0 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="gap-1.5 rounded-xl"
              aria-label={locale === "de" ? "Vorherige Seite" : "Previous page"}
            >
              <ChevronLeft className="h-4 w-4" />
              {locale === "de" ? "Zurück" : "Previous"}
            </Button>
            <span className="text-sm text-gray-500 tabular-nums">
              {locale === "de" ? "Seite" : "Page"} {page}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={verifications.length < pageSize}
              onClick={() => setPage((p) => p + 1)}
              className="gap-1.5 rounded-xl"
              aria-label={locale === "de" ? "Nächste Seite" : "Next page"}
            >
              {locale === "de" ? "Weiter" : "Next"}
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
