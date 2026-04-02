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
    <div className="relative min-h-screen">
      {/* Background */}
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-50" />

      <div className="mx-auto max-w-6xl animate-fade-in px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
              {t("title")}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
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

        {/* Dashboard Insights: Trends & Contradictions */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Card className="md:col-span-2 border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-sm animate-fade-in" style={{ animationDelay: "100ms" }}>
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-indigo-500" />
                <CardTitle className="text-base">{locale === "de" ? "Aktivität der letzten 7 Tage" : "Last 7 Days Activity"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-44 flex items-end justify-between gap-2 pt-4">
                {trendData.map((day, i) => {
                  const maxVal = Math.max(...trendData.map(d => d.supported + d.contradicted), 1);
                  const sHeight = `${(day.supported / maxVal) * 100}%`;
                  const cHeight = `${(day.contradicted / maxVal) * 100}%`;
                  const hasData = day.supported > 0 || day.contradicted > 0;
                  
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                      {/* Tooltip */}
                      {hasData && (
                        <div className="absolute -top-12 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-[10px] py-1 px-2 rounded z-10 pointer-events-none whitespace-nowrap shadow-lg">
                          {day.supported} Supported<br />
                          {day.contradicted} Contradicted
                        </div>
                      )}
                      {/* Stacked Bar */}
                      <div className="w-full h-full flex flex-col-reverse justify-start relative rounded-t-sm overflow-hidden bg-gray-100/50 dark:bg-gray-800/50">
                        {day.supported > 0 && (
                          <div 
                            className="w-full bg-emerald-400 hover:bg-emerald-500 transition-colors"
                            style={{ height: sHeight }}
                          />
                        )}
                        {day.contradicted > 0 && (
                          <div 
                            className="w-full bg-red-400 hover:bg-red-500 transition-colors"
                            style={{ height: cHeight }}
                          />
                        )}
                      </div>
                      <span className="text-xs text-gray-500 font-medium">{day.date}</span>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm shadow-sm animate-fade-in" style={{ animationDelay: "150ms" }}>
            <CardHeader className="pb-3 border-b border-gray-100 dark:border-gray-800">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-500" />
                <CardTitle className="text-base">{locale === "de" ? "Widerlegte Behauptungen" : "Contradicted Insights"}</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-4 p-0">
              {contradictedClaims.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">
                  {locale === "de" ? "Keine widerlegten Behauptungen gefunden." : "No contradicted claims found."}
                </div>
              ) : (
                <div className="divide-y divide-gray-100 dark:divide-gray-800">
                  {contradictedClaims.map(claim => (
                    <div key={claim.id} className="p-4 hover:bg-red-50/30 dark:hover:bg-red-900/10 transition-colors">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-300 line-clamp-2">&ldquo;{claim.claim_text}&rdquo;</p>
                      <p className="mt-1.5 text-xs text-red-500 truncate">{claim.reasoning}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Stats Grid */}
        <div className="mb-10 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {statCards.map((stat, i) => (
            <Card key={i} className="group relative overflow-hidden border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg">
              <div className={`absolute inset-0 bg-gradient-to-br ${stat.gradient} opacity-50`} />
              <CardContent className="relative p-6">
                <div className="flex items-center justify-between">
                  <stat.icon className={`h-5 w-5 ${stat.iconColor}`} />
                  <Badge variant={stat.badgeVariant}>{stat.badge}</Badge>
                </div>
                <p className="mt-4 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {stat.value}
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Usage Quota */}
        <Card className="mb-10 border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === "de" ? "Nutzungskontingent" : "Usage Quota"}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {thisMonth} / {planLimit}
              </span>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-700"
                style={{ width: `${Math.min(usagePercent, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-xs text-gray-400">
              {profile?.plan === "free"
                ? locale === "de" ? "Kostenloser Plan" : "Free plan"
                : `${profile?.plan} plan`}
            </p>
          </CardContent>
        </Card>

        {/* Recent Verifications */}
        <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">{t("recentVerifications")}</CardTitle>
            <Link href={`/${locale}/history`}>
              <Button variant="ghost" size="sm" className="gap-1 text-emerald-600 hover:text-emerald-700 dark:text-emerald-400">
                {t("viewAll")}
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {verifications.length === 0 ? (
              <div className="py-12 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800 mb-4">
                  <FileSearch className="h-6 w-6 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-4">{t("noVerifications")}</p>
                <Link href={`/${locale}/verify`}>
                  <Button size="sm" className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white">
                    <FileSearch className="h-3 w-3" />
                    {t("quickVerify")}
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {verifications.map((v, index) => (
                  <Link
                    key={v.id}
                    href={`/${locale}/report/${v.id}`}
                    className="group flex items-center justify-between rounded-2xl border border-gray-100/80 p-4 transition-all duration-200 hover:border-emerald-200/50 hover:bg-emerald-50/30 hover:shadow-sm dark:border-gray-800/80 dark:hover:border-emerald-800/50 dark:hover:bg-emerald-900/10"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">
                        {truncateText(v.input_text, 80)}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
