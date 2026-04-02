"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft, CheckCircle2, XCircle, HelpCircle, ExternalLink,
  ChevronDown, ChevronUp, Clock, FileSearch, Share2, Check, Globe,
  PenLine, Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { HighlightedText, HighlightLegend } from "@/components/verification/highlighted-text";
import { createClient } from "@/lib/supabase/client";
import { useToast } from "@/components/ui/toast";
import type { Verification, Claim } from "@/types";

export default function ReportPage() {
  const t = useTranslations("report");
  const locale = useLocale();
  const params = useParams();
  const id = params.id as string;
  const supabase = createClient();
  const { toast } = useToast();

  const [verification, setVerification] = useState<Verification | null>(null);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedClaim, setExpandedClaim] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [reviewingClaim, setReviewingClaim] = useState<string | null>(null);
  const [reviewVerdict, setReviewVerdict] = useState<string>("");
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const claimRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/verify?id=${id}`);
        if (!res.ok) throw new Error("Failed to load report");
        const data = await res.json();
        setVerification(data.verification);
        setClaims(data.claims);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error loading report");
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  const handleClaimClick = useCallback((claimId: string) => {
    setExpandedClaim(claimId);
    const el = claimRefs.current[claimId];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const handleShare = async () => {
    if (!verification) return;
    setSharing(true);

    try {
      // Toggle public visibility
      if (!verification.is_public) {
        await supabase
          .from("verifications")
          .update({ is_public: true })
          .eq("id", verification.id);
        setVerification({ ...verification, is_public: true });
      }

      // Copy link
      const shareUrl = `${window.location.origin}/${locale}/report/${verification.id}`;
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast(locale === "de" ? "Link kopiert!" : "Link copied!", "success");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
    } finally {
      setSharing(false);
    }
  };

  const handleExportPdf = () => {
    if (!verification) return;
    window.open(`/api/export?id=${verification.id}`, "_blank");
  };

  const handleReviewSubmit = async (claimId: string) => {
    if (!reviewVerdict) return;
    setReviewSubmitting(true);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId,
          new_verdict: reviewVerdict,
          comment: reviewComment,
        }),
      });
      if (res.ok) {
        // Update local claim state to reflect the review
        setClaims((prev) =>
          prev.map((c) =>
            c.id === claimId ? { ...c, verdict: reviewVerdict as Claim["verdict"] } : c
          )
        );
        setReviewingClaim(null);
        setReviewVerdict("");
        setReviewComment("");
        toast(locale === "de" ? "Bewertung gespeichert" : "Review saved", "success");
      }
    } catch {
      // Silent fail — review is non-critical
    } finally {
      setReviewSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-8">
        <Skeleton className="mb-4 h-8 w-48 rounded-xl" />
        <Skeleton className="mb-6 h-40 rounded-2xl" />
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !verification) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100 dark:bg-red-900/30 mb-4">
          <XCircle className="h-7 w-7 text-red-500" />
        </div>
        <p className="text-red-500 font-medium">{error || "Report not found"}</p>
        <Link href={`/${locale}/verify`}>
          <Button className="mt-4 gap-2" variant="outline">
            <FileSearch className="h-4 w-4" />
            {t("backToVerify")}
          </Button>
        </Link>
      </div>
    );
  }

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "supported": return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
      case "contradicted": return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <HelpCircle className="h-5 w-5 text-amber-500" />;
    }
  };

  const getVerdictLabel = (verdict: string) => {
    switch (verdict) {
      case "supported": return t("supported");
      case "contradicted": return t("contradicted");
      default: return t("unverifiable");
    }
  };

  const scoreColor =
    verification.trust_score >= 70 ? "from-emerald-500 to-teal-500"
    : verification.trust_score >= 40 ? "from-amber-500 to-orange-500"
    : "from-red-500 to-rose-500";

  const scoreTextColor =
    verification.trust_score >= 70 ? "text-emerald-500"
    : verification.trust_score >= 40 ? "text-amber-500"
    : "text-red-500";

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-30" />

      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              href={`/${locale}/history`}
              className="mb-4 inline-flex items-center gap-1.5 text-sm text-gray-500 transition-colors hover:text-emerald-600 dark:hover:text-emerald-400"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {locale === "de" ? "Zurück zur Übersicht" : "Back to history"}
            </Link>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
              {t("title")}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPdf}
              className="gap-2 rounded-xl"
              aria-label={locale === "de" ? "Als PDF exportieren" : "Export as PDF"}
            >
              <Download className="h-4 w-4" />
              {locale === "de" ? "PDF" : "PDF"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              disabled={sharing}
              className="gap-2 rounded-xl"
            >
              {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Share2 className="h-4 w-4" />}
              {copied
                ? locale === "de" ? "Link kopiert!" : "Link copied!"
                : locale === "de" ? "Teilen" : "Share"}
            </Button>
          </div>
        </div>

        {/* Source URL badge */}
        {verification.source_url && (
          <a
            href={verification.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-blue-50/80 dark:bg-blue-900/20 px-4 py-2.5 text-sm text-blue-700 dark:text-blue-300 transition-colors hover:bg-blue-100 dark:hover:bg-blue-900/30"
          >
            <Globe className="h-4 w-4" />
            <span className="font-medium">{verification.source_title || verification.source_url}</span>
            <ExternalLink className="h-3 w-3 opacity-50" />
          </a>
        )}

        {/* Score Hero Card */}
        <Card className="mb-8 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl overflow-hidden">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
              <div className="col-span-2 flex flex-col items-center justify-center p-8 relative overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${scoreColor} opacity-5`} />
                <div className="relative h-32 w-32 mb-3">
                  <svg className="h-32 w-32 -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6" className="text-gray-100 dark:text-gray-800" />
                    <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="6"
                      strokeDasharray={`${verification.trust_score * 2.64} 264`}
                      strokeLinecap="round"
                      className={`${scoreTextColor} transition-all duration-1000`}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-4xl font-bold ${scoreTextColor}`}>{verification.trust_score}</span>
                    <span className="text-xs text-gray-400 font-medium">/ 100</span>
                  </div>
                </div>
                <span className="text-sm font-medium text-gray-500">{t("trustScore")}</span>
              </div>

              <div className="col-span-3 grid grid-cols-2 sm:grid-cols-4 border-l border-gray-100 dark:border-gray-800">
                {[
                  { label: t("totalClaims"), value: verification.total_claims, color: "text-slate-800 dark:text-slate-300" },
                  { label: t("supported"), value: verification.supported_count, color: "text-emerald-600" },
                  { label: t("unverifiable"), value: verification.unverifiable_count, color: "text-amber-600" },
                  { label: t("contradicted"), value: verification.contradicted_count, color: "text-red-600" },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center justify-center p-6 border-b border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                    <span className={`text-2xl font-bold ${stat.color}`}>{stat.value}</span>
                    <span className="text-xs text-gray-500 mt-1 text-center">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Processing Time + Distribution */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardContent className="flex items-center gap-3 p-5">
              <Clock className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-300">
                  {(verification.processing_time_ms / 1000).toFixed(1)} {t("seconds")}
                </p>
                <p className="text-xs text-gray-500">{t("processingTime")}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex h-3 overflow-hidden rounded-full gap-0.5">
                {verification.supported_count > 0 && (
                  <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all"
                    style={{ width: `${(verification.supported_count / verification.total_claims) * 100}%` }} />
                )}
                {verification.unverifiable_count > 0 && (
                  <div className="bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all"
                    style={{ width: `${(verification.unverifiable_count / verification.total_claims) * 100}%` }} />
                )}
                {verification.contradicted_count > 0 && (
                  <div className="bg-gradient-to-r from-red-500 to-red-400 rounded-full transition-all"
                    style={{ width: `${(verification.contradicted_count / verification.total_claims) * 100}%` }} />
                )}
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-gray-500 font-medium">
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />{t("supported")} ({verification.supported_count})</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-amber-500" />{t("unverifiable")} ({verification.unverifiable_count})</span>
                <span className="flex items-center gap-1"><span className="h-1.5 w-1.5 rounded-full bg-red-500" />{t("contradicted")} ({verification.contradicted_count})</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inline Highlighted Source Text */}
        <Card className="mb-8 border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">
              {locale === "de" ? "Analysierter Text" : "Analyzed Text"}
            </CardTitle>
            <HighlightLegend locale={locale} />
          </CardHeader>
          <CardContent>
            <div className="rounded-xl bg-gray-50/80 dark:bg-gray-800/30 p-5 max-h-[400px] overflow-y-auto">
              <HighlightedText
                text={verification.input_text}
                claims={claims}
                onClaimClick={handleClaimClick}
                activeClaim={expandedClaim}
              />
            </div>
          </CardContent>
        </Card>

        {/* Claims List */}
        <h2 className="mb-4 text-lg font-semibold text-slate-800 dark:text-slate-300">
          {locale === "de" ? "Einzelne Behauptungen" : "Individual Claims"} ({claims.length})
        </h2>
        <div className="space-y-3">
          {claims.map((claim, index) => (
            <Card
              key={claim.id}
              ref={(el) => { claimRefs.current[claim.id] = el; }}
              className={`border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm cursor-pointer transition-all duration-200 hover:shadow-md animate-fade-in ${
                expandedClaim === claim.id ? "ring-2 ring-emerald-400/30 shadow-lg" : ""
              } ${
                claim.verdict === "supported" ? "hover:border-emerald-200 dark:hover:border-emerald-800/50"
                : claim.verdict === "contradicted" ? "hover:border-red-200 dark:hover:border-red-800/50"
                : "hover:border-amber-200 dark:hover:border-amber-800/50"
              }`}
              style={{ animationDelay: `${index * 50}ms` }}
              onClick={() => setExpandedClaim(expandedClaim === claim.id ? null : claim.id)}
            >
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  {getVerdictIcon(claim.verdict)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-300 leading-relaxed">{claim.claim_text}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant={claim.verdict === "supported" ? "success" : claim.verdict === "contradicted" ? "destructive" : "warning"}>
                        {getVerdictLabel(claim.verdict)}
                      </Badge>
                      <span className="text-xs text-gray-400">{t("confidence")}: {Math.round(claim.confidence * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex-shrink-0 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
                    {expandedClaim === claim.id ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </div>

                {expandedClaim === claim.id && (
                  <div className="mt-4 border-t border-gray-100 pt-4 dark:border-gray-800 animate-fade-in space-y-4">
                    <div>
                      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("reasoning")}</h4>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{claim.reasoning}</p>
                    </div>
                    {claim.sources && claim.sources.length > 0 && (
                      <div>
                        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{t("sources")} ({claim.sources.length})</h4>
                        <div className="space-y-2">
                          {claim.sources.map((source, i) => (
                            <a key={i} href={source.url} target="_blank" rel="noopener noreferrer"
                              className="flex items-start gap-2.5 rounded-xl bg-gray-50/80 p-3 text-sm transition-all hover:bg-gray-100 hover:shadow-sm dark:bg-gray-800/50 dark:hover:bg-gray-800"
                              onClick={(e) => e.stopPropagation()}>
                              <ExternalLink className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
                              <div className="min-w-0">
                                <span className="font-medium text-slate-800 dark:text-slate-300">{source.title}</span>
                                <Badge variant="secondary" className="ml-2 text-[10px]">{source.source_type}</Badge>
                                <p className="mt-1 text-xs text-gray-500 leading-relaxed">{source.snippet}</p>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}
                    {/* Human Review / Override */}
                    <div className="border-t border-gray-100 dark:border-gray-800 pt-3">
                      {reviewingClaim === claim.id ? (
                        <div className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                            {locale === "de" ? "Bewertung überschreiben" : "Override Verdict"}
                          </p>
                          <div className="flex gap-2">
                            {(["supported", "contradicted", "unverifiable"] as const).map((v) => (
                              <button
                                key={v}
                                onClick={() => setReviewVerdict(v)}
                                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                                  reviewVerdict === v
                                    ? v === "supported" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300 ring-2 ring-emerald-400/50"
                                    : v === "contradicted" ? "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300 ring-2 ring-red-400/50"
                                    : "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300 ring-2 ring-amber-400/50"
                                    : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                                }`}
                              >
                                {getVerdictLabel(v)}
                              </button>
                            ))}
                          </div>
                          <textarea
                            value={reviewComment}
                            onChange={(e) => setReviewComment(e.target.value)}
                            placeholder={locale === "de" ? "Begründung (optional)…" : "Reason (optional)…"}
                            className="w-full rounded-xl border border-gray-200 bg-white/50 p-3 text-sm dark:border-gray-700 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                            rows={2}
                            maxLength={1000}
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReviewSubmit(claim.id)}
                              disabled={!reviewVerdict || reviewSubmitting}
                              isLoading={reviewSubmitting}
                              className="gap-1 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                            >
                              <Check className="h-3 w-3" />
                              {locale === "de" ? "Speichern" : "Save"}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => { setReviewingClaim(null); setReviewVerdict(""); setReviewComment(""); }}
                              className="rounded-lg"
                            >
                              {locale === "de" ? "Abbrechen" : "Cancel"}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setReviewingClaim(claim.id); setReviewVerdict(""); }}
                          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors"
                        >
                          <PenLine className="h-3 w-3" />
                          {locale === "de" ? "Bewertung überschreiben" : "Override verdict"}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-10 flex items-center justify-center gap-4">
          <Link href={`/${locale}/verify`}>
            <Button variant="outline" className="gap-2 rounded-xl">
              <FileSearch className="h-4 w-4" />
              {t("backToVerify")}
            </Button>
          </Link>
          <Link href={`/${locale}/history`}>
            <Button variant="ghost" className="gap-2 rounded-xl text-gray-500">
              {locale === "de" ? "Alle Verifizierungen" : "All verifications"}
              <ArrowLeft className="h-3 w-3 rotate-180" />
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
