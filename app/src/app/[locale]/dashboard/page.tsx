"use client";

import { useEffect, useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { LayoutDashboard, FileSearch, TrendingUp, Clock, ArrowRight, Sparkles, AlertTriangle, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { formatDate, truncateText } from "@/lib/utils";
import type { Verification, Profile, Claim } from "@/types";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [verifications, setVerifications] = useState<Verification[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [trendData, setTrendData] = useState<{ date: string; supported: number; contradicted: number }[]>([]);
  const [contradictedClaims, setContradictedClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = `/${locale}/auth/login`;
        return;
      }

      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
      sevenDaysAgo.setHours(0, 0, 0, 0);

      const [profileRes, verificationsRes, countRes, trendRes, claimsRes] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase
          .from("verifications")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("verifications")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id),
        supabase
          .from("verifications")
          .select("created_at, supported_count, contradicted_count")
          .eq("user_id", user.id)
          .gte("created_at", sevenDaysAgo.toISOString()),
        supabase
          .from("claims")
          .select("*, verifications!inner(user_id)")
          .eq("verifications.user_id", user.id)
          .eq("verdict", "contradicted")
          .order("created_at", { ascending: false })
          .limit(3),
      ]);

      if (profileRes.data) setProfile(profileRes.data);
      if (verificationsRes.data) setVerifications(verificationsRes.data);
      setTotalCount(countRes.count ?? 0);
      
      // Process trend data
      if (trendRes.data) {
        const days = Array.from({ length: 7 }).map((_, i) => {
          const d = new Date(sevenDaysAgo);
          d.setDate(d.getDate() + i);
          return d.toISOString().split("T")[0];
        });
        
        const trends = days.map(dateStr => {
          const dayData = trendRes.data.filter(v => v.created_at.startsWith(dateStr));
          return {
            date: new Date(dateStr).toLocaleDateString(locale, { weekday: "short" }),
            supported: dayData.reduce((sum, v) => sum + v.supported_count, 0),
            contradicted: dayData.reduce((sum, v) => sum + v.contradicted_count, 0),
          };
        });
        setTrendData(trends);
      }
      
      if (claimsRes.data) {
        // Handle PostgREST nested join response format
        const cleanClaims = claimsRes.data.map(c => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { verifications: _verifications, ...rest } = c;
          return rest as Claim;
        });
        setContradictedClaims(cleanClaims);
      }
      
      setLoading(false);
    };

    fetchData();
  }, [supabase, locale]);

  if (loading) {
    return (
      <div className="mx-auto max-w-6xl animate-fade-in px-4 py-8">
        <Skeleton className="mb-6 h-8 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const totalVerifications = totalCount;
  const recentCount = verifications.length;
  const avgScore =
    recentCount > 0
      ? Math.round(
          verifications.reduce((sum, v) => sum + v.trust_score, 0) /
            recentCount
        )
      : 0;
  const thisMonth = profile?.monthly_verification_count ?? 0;
  const planLimit = profile?.plan === "pro" ? 200 : profile?.plan === "team" ? 999 : 10;
  const remaining = Math.max(0, planLimit - thisMonth);
  const usagePercent = Math.round((thisMonth / planLimit) * 100);

  const statCards = [
    {
      icon: LayoutDashboard,
      label: t("totalVerifications"),
      value: totalVerifications,
      badge: locale === "de" ? "Gesamt" : "Total",
      badgeVariant: "secondary" as const,
      gradient: "from-blue-500/10 to-indigo-500/10 dark:from-blue-500/20 dark:to-indigo-500/20",
      iconColor: "text-blue-500",
    },
    {
      icon: TrendingUp,
      label: t("avgTrustScore"),
      value: `${avgScore}%`,
      badge: `${avgScore}%`,
      badgeVariant: (avgScore >= 70 ? "success" : avgScore >= 40 ? "warning" : "destructive") as "success" | "warning" | "destructive",
      gradient: "from-emerald-500/10 to-teal-500/10 dark:from-emerald-500/20 dark:to-teal-500/20",
      iconColor: "text-emerald-500",
    },
    {
      icon: Clock,
      label: t("thisMonth"),
      value: thisMonth,
      badge: locale === "de" ? "Monat" : "Month",
      badgeVariant: "secondary" as const,
      gradient: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20",
      iconColor: "text-amber-500",
    },
    {
      icon: Sparkles,
      label: t("remaining"),
      value: remaining,
      badge: `${remaining}`,
      badgeVariant: (remaining > 0 ? "success" : "destructive") as "success" | "destructive",
      gradient: "from-purple-500/10 to-pink-500/10 dark:from-purple-500/20 dark:to-pink-500/20",
      iconColor: "text-purple-500",
    },
  ];

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      {/* Subtle decorative orbs */}
      <div className="absolute top-20 right-[10%] -z-10 h-[300px] w-[300px] rounded-full bg-emerald-100/40 blur-[100px] dark:bg-emerald-900/10" />
      <div className="absolute bottom-40 left-[5%] -z-10 h-[250px] w-[250px] rounded-full bg-blue-100/30 blur-[80px] dark:bg-blue-900/10" />

      <div className="mx-auto max-w-6xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-200">
              {t("title")}
            </h1>
            <p className="mt-1 text-slate-500 dark:text-slate-400">
              {t("welcome")}, {profile?.full_name || profile?.email}
            </p>
          </div>
          <Link href={`/${locale}/verify`}>
            <Button className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300">
              <FileSearch className="h-4 w-4" />
              {t("quickVerify")}
            </Button>
          </Link>
        </div>

        {/* Stats Grid — clean white cards */}
        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <div key={i} className="group relative overflow-hidden rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-40`} />
              <div className="relative">
                <div className="flex items-center justify-between">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-sm border border-gray-100 dark:bg-gray-800 dark:border-gray-700`}>
                    <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  </div>
                  <Badge variant={stat.badgeVariant}>{stat.badge}</Badge>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-200">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Dashboard Insights: Trends & Contradictions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="md:col-span-2 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 mb-6">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 dark:bg-indigo-900/30">
                <BarChart3 className="h-4 w-4 text-indigo-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{locale === "de" ? "Aktivität der letzten 7 Tage" : "Last 7 Days Activity"}</h3>
            </div>
            <div className="h-44 flex items-end justify-between gap-3">
              {trendData.map((day, i) => {
                const maxVal = Math.max(...trendData.map(d => d.supported + d.contradicted), 1);
                const sHeight = `${Math.max((day.supported / maxVal) * 100, 4)}%`;
                const cHeight = `${(day.contradicted / maxVal) * 100}%`;
                const hasData = day.supported > 0 || day.contradicted > 0;
                
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {hasData && (
                      <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-slate-800 text-white text-[10px] py-1 px-2 rounded-lg z-10 pointer-events-none whitespace-nowrap shadow-lg">
                        {day.supported} Supported · {day.contradicted} Contradicted
                      </div>
                    )}
                    <div className="w-full h-full flex flex-col-reverse justify-start relative rounded-lg overflow-hidden bg-slate-50 dark:bg-gray-800/50">
                      {day.supported > 0 && (
                        <div 
                          className="w-full rounded-t-sm bg-gradient-to-t from-emerald-400 to-emerald-300 transition-colors"
                          style={{ height: sHeight }}
                        />
                      )}
                      {day.contradicted > 0 && (
                        <div 
                          className="w-full rounded-t-sm bg-gradient-to-t from-red-400 to-red-300 transition-colors"
                          style={{ height: cHeight }}
                        />
                      )}
                      {!hasData && (
                        <div className="w-full bg-slate-100 dark:bg-gray-700/50" style={{ height: "4%" }} />
                      )}
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{day.date}</span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-2 p-5 pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-50 dark:bg-red-900/20">
                <AlertTriangle className="h-4 w-4 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300">{locale === "de" ? "Widerlegte Behauptungen" : "Contradicted Insights"}</h3>
            </div>
            {contradictedClaims.length === 0 ? (
              <div className="p-6 text-center text-sm text-slate-400">
                {locale === "de" ? "Keine widerlegten Behauptungen gefunden." : "No contradicted claims found."}
              </div>
            ) : (
              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {contradictedClaims.map(claim => (
                  <div key={claim.id} className="p-4 hover:bg-red-50/50 dark:hover:bg-red-900/10 transition-colors">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300 line-clamp-2">&ldquo;{claim.claim_text}&rdquo;</p>
                    <p className="mt-1.5 text-xs text-red-500 truncate">{claim.reasoning}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Usage Quota — clean white card */}
        <div className="mb-8 rounded-2xl border border-gray-200/80 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {locale === "de" ? "Nutzungskontingent" : "Usage Quota"}
            </span>
            <span className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {thisMonth} / {planLimit}
            </span>
          </div>
          <div className="h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-800">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-700"
              style={{ width: `${Math.min(usagePercent, 100)}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-slate-400">
            {profile?.plan === "free"
              ? locale === "de" ? "Kostenloser Plan" : "Free plan"
              : `${profile?.plan} plan`}
          </p>
        </div>

        {/* Recent Verifications — clean white card */}
        <div className="rounded-2xl border border-gray-200/80 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-center justify-between p-6 pb-4">
            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">{t("recentVerifications")}</h3>
            <Link href={`/${locale}/history`}>
              <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                {t("viewAll")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </div>
          <div className="px-6 pb-6">
            {verifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 dark:bg-gray-800 mb-4">
                  <FileSearch className="h-6 w-6 text-slate-300" />
                </div>
                <p className="text-sm text-slate-500 mb-4">{t("noVerifications")}</p>
                <Link href={`/${locale}/verify`}>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <FileSearch className="h-3 w-3" />
                    {t("quickVerify")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {verifications.map((v, index) => (
                  <Link
                    key={v.id}
                    href={`/${locale}/report/${v.id}`}
                    className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4 transition-all duration-200 hover:border-emerald-200 hover:bg-emerald-50/40 hover:shadow-sm dark:border-gray-800 dark:bg-gray-800/50 dark:hover:border-emerald-800/50 dark:hover:bg-emerald-900/10"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-700 dark:text-slate-300 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                        {truncateText(v.input_text, 80)}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        {formatDate(v.created_at, locale)} · {v.total_claims}{" "}
                        {locale === "de" ? "Behauptungen" : "claims"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        v.trust_score >= 70
                          ? "success"
                          : v.trust_score >= 40
                          ? "warning"
                          : "destructive"
                      }
                      className="ml-4 text-sm"
                    >
                      {v.trust_score}%
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
