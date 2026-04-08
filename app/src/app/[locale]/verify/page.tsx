"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import {
  FileSearch, Loader2, AlertCircle, CheckCircle2, XCircle, HelpCircle,
  Sparkles, Globe, Type, Link2, ExternalLink, Upload, FileText,
  Brain, Copy, BarChart3, Eye, X, Info,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type {
  PipelineEvent, JudgmentResult, ExtractedClaim, AnalysisMode,
  BiasAnalysis, AIDetectionResult, PlagiarismResult, FrameworkEvaluation,
  TokenUsageInfo,
} from "@/types";

const MAX_CHARS = 50000;
const MIN_CHARS = 50;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB (hard limit; plan limits enforced server-side)

type InputMode = "text" | "url" | "file";

interface AnalysisModeOption {
  id: AnalysisMode;
  icon: React.ReactNode;
  label: string;
  labelDe: string;
  description: string;
  descriptionDe: string;
  color: string;
}

const ANALYSIS_MODES: AnalysisModeOption[] = [
  {
    id: "fact-check",
    icon: <CheckCircle2 className="h-4 w-4" />,
    label: "Fact Check",
    labelDe: "Faktenprüfung",
    description: "Verify claims against evidence sources",
    descriptionDe: "Behauptungen anhand von Quellen prüfen",
    color: "emerald",
  },
  {
    id: "bias-check",
    icon: <Eye className="h-4 w-4" />,
    label: "Bias Detection",
    labelDe: "Bias-Erkennung",
    description: "Detect loaded language, framing & one-sided perspectives",
    descriptionDe: "Erkennung von Framing, einseitigen Perspektiven & geladener Sprache",
    color: "violet",
  },
  {
    id: "ai-detection",
    icon: <Brain className="h-4 w-4" />,
    label: "AI Detection",
    labelDe: "KI-Erkennung",
    description: "Detect AI-generated vs. human-written content",
    descriptionDe: "KI-generierten vs. menschlich verfassten Inhalt erkennen",
    color: "blue",
  },
  {
    id: "plagiarism",
    icon: <Copy className="h-4 w-4" />,
    label: "Plagiarism",
    labelDe: "Plagiatsprüfung",
    description: "Check text overlap with known sources",
    descriptionDe: "Textübereinstimmung mit bekannten Quellen prüfen",
    color: "amber",
  },
  {
    id: "framework-eval",
    icon: <BarChart3 className="h-4 w-4" />,
    label: "Quality Eval",
    labelDe: "Qualitätsbewertung",
    description: "Score using MECE, Red Team, BLUF, Pre-Mortem frameworks",
    descriptionDe: "Bewertung mit MECE, Red Team, BLUF, Pre-Mortem",
    color: "rose",
  },
];

export default function VerifyPage() {
  const t = useTranslations("verify");
  const locale = useLocale();
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Input state
  const [inputMode, setInputMode] = useState<InputMode>("text");
  const [text, setText] = useState("");
  const [url, setUrl] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [selectedAnalyses, setSelectedAnalyses] = useState<AnalysisMode[]>(["fact-check"]);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [stageMessage, setStageMessage] = useState("");
  const [error, setError] = useState("");
  const [claimsExtracted, setClaimsExtracted] = useState<ExtractedClaim[]>([]);
  const [judgments, setJudgments] = useState<JudgmentResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [extractedMeta, setExtractedMeta] = useState<{ url: string; title: string | null; contentLength: number } | null>(null);

  // Analysis results (shown in-line during processing)
  const [biasResult, setBiasResult] = useState<BiasAnalysis | null>(null);
  const [aiDetectionResult, setAIDetectionResult] = useState<AIDetectionResult | null>(null);
  const [plagiarismResult, setPlagiarismResult] = useState<PlagiarismResult | null>(null);
  const [frameworkResult, setFrameworkResult] = useState<FrameworkEvaluation | null>(null);

  // Token transparency
  const [tokenUsage, setTokenUsage] = useState<TokenUsageInfo | null>(null);
  const [tokenEstimate, setTokenEstimate] = useState<{ input: number; total: number } | null>(null);

  // Usage / quota state
  const [usage, setUsage] = useState<{
    plan: string; used: number; limit: number; remaining: number;
    maxChars: number; allowedModes: string[];
  } | null>(null);

  useEffect(() => {
    fetch("/api/usage").then(r => r.json()).then(setUsage).catch(() => {});
  }, []);

  // Handle bookmarklet query params
  useEffect(() => {
    const prefill = searchParams.get("prefill");
    const urlParam = searchParams.get("url");
    if (prefill) {
      setText(decodeURIComponent(prefill));
      setInputMode("text");
    } else if (urlParam) {
      setUrl(decodeURIComponent(urlParam));
      setInputMode("url");
    }
  }, [searchParams]);

  const isInputValid =
    inputMode === "text"
      ? text.trim().length >= MIN_CHARS && text.length <= MAX_CHARS
      : inputMode === "url"
        ? url.trim().length > 0 && url.startsWith("http")
        : file !== null;

  const toggleAnalysis = useCallback((mode: AnalysisMode) => {
    if (mode === "comprehensive") {
      setSelectedAnalyses(["comprehensive"]);
      return;
    }
    setSelectedAnalyses((prev) => {
      const filtered = prev.filter((m) => m !== "comprehensive");
      if (filtered.includes(mode)) {
        const next = filtered.filter((m) => m !== mode);
        return next.length === 0 ? ["fact-check"] : next;
      }
      return [...filtered, mode];
    });
  }, []);

  const handleFileDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.size <= MAX_FILE_SIZE) {
      setFile(droppedFile);
      setError("");
    } else if (droppedFile) {
      setError(locale === "de" ? "Datei zu groß. Maximal 10 MB." : "File too large. Maximum 10 MB.");
    }
  }, [locale]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (selected && selected.size <= MAX_FILE_SIZE) {
      setFile(selected);
      setError("");
    } else if (selected) {
      setError(locale === "de" ? "Datei zu groß. Maximal 10 MB." : "File too large. Maximum 10 MB.");
    }
  }, [locale]);

  const handleVerify = useCallback(async () => {
    if (inputMode === "text" && text.trim().length < MIN_CHARS) {
      setError(t("textTooShort"));
      return;
    }
    if (inputMode === "url" && (!url.trim() || !url.startsWith("http"))) {
      setError(locale === "de" ? "Bitte geben Sie eine gültige URL ein." : "Please enter a valid URL.");
      return;
    }
    if (inputMode === "file" && !file) {
      setError(locale === "de" ? "Bitte wählen Sie eine Datei aus." : "Please select a file.");
      return;
    }

    setIsProcessing(true);
    setError("");
    setClaimsExtracted([]);
    setJudgments([]);
    setProgress(0);
    setExtractedMeta(null);
    setBiasResult(null);
    setAIDetectionResult(null);
    setPlagiarismResult(null);
    setFrameworkResult(null);
    setTokenUsage(null);
    setTokenEstimate(null);
    setStageMessage(
      inputMode === "url"
        ? locale === "de" ? "Seite wird abgerufen…" : "Fetching page content…"
        : inputMode === "file"
          ? locale === "de" ? "Datei wird verarbeitet…" : "Processing file…"
          : t("extracting")
    );

    try {
      let response: Response;

      if (inputMode === "file" && file) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("language", locale);
        formData.append("analyses", JSON.stringify(selectedAnalyses));
        response = await fetch("/api/verify", { method: "POST", body: formData });
      } else {
        const requestBody = inputMode === "url"
          ? { url, language: locale, mode: "url", analyses: selectedAnalyses }
          : { text, language: locale, mode: "text", analyses: selectedAnalyses };
        response = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestBody),
        });
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;

          try {
            const event: PipelineEvent = JSON.parse(data);

            switch (event.type) {
              case "url_extracted":
                setExtractedMeta({ url: event.url, title: event.title, contentLength: event.contentLength });
                setStageMessage(t("extracting"));
                break;
              case "file_extracted":
                setStageMessage(locale === "de" ? "Datei geladen, analysiere…" : "File loaded, analyzing…");
                break;
              case "status":
                setStageMessage(event.message);
                break;
              case "claims_extracted":
                setClaimsExtracted(event.claims);
                setStageMessage(t("searching"));
                break;
              case "claim_judged":
                setJudgments((prev) => [...prev, event.result]);
                setProgress(
                  ((event.index + 1) / (claimsExtracted.length || 1)) * 100
                );
                break;
              case "bias_analysis":
                setBiasResult(event.result);
                break;
              case "ai_detection":
                setAIDetectionResult(event.result);
                break;
              case "plagiarism_check":
                setPlagiarismResult(event.result);
                break;
              case "framework_evaluation":
                setFrameworkResult(event.result);
                break;
              case "token_estimate":
                setTokenEstimate({ input: event.estimatedInputTokens, total: event.estimatedTotalTokens });
                break;
              case "token_usage":
                setTokenUsage(event.tokens);
                break;
              case "completed":
                router.push(`/${locale}/report/${event.verification.id}`);
                return;
              case "error":
                setError(event.message);
                setIsProcessing(false);
                return;
            }
          } catch {
            // Skip malformed events
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("emptyText"));
    } finally {
      setIsProcessing(false);
    }
  }, [text, url, file, inputMode, locale, t, router, claimsExtracted.length, selectedAnalyses]);

  // Keyboard shortcut: Ctrl/Cmd + Enter to verify
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && isInputValid && !isProcessing) {
        e.preventDefault();
        handleVerify();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleVerify, isInputValid, isProcessing]);

  const getVerdictIcon = (verdict: string) => {
    switch (verdict) {
      case "supported":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
      case "contradicted":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <HelpCircle className="h-4 w-4 text-amber-500" />;
    }
  };

  const charPercent = (text.length / MAX_CHARS) * 100;

  const getColorClass = (color: string, selected: boolean) => {
    if (!selected) return "border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-900/50";
    const map: Record<string, string> = {
      emerald: "border-emerald-300 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-900/20",
      violet: "border-violet-300 dark:border-violet-700 bg-violet-50/80 dark:bg-violet-900/20",
      blue: "border-blue-300 dark:border-blue-700 bg-blue-50/80 dark:bg-blue-900/20",
      amber: "border-amber-300 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-900/20",
      rose: "border-rose-300 dark:border-rose-700 bg-rose-50/80 dark:bg-rose-900/20",
    };
    return map[color] || map.emerald;
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-br from-slate-50 via-white to-emerald-50/30 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="absolute top-[20%] right-[5%] -z-10 h-80 w-80 rounded-full bg-emerald-100/40 blur-[100px] dark:bg-emerald-900/10" />

      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 mb-4">
            <FileSearch className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
            {locale === "de" ? "Inhaltsanalyse" : "Content Analysis"}
          </h1>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {locale === "de"
              ? "Faktenprüfung • Bias-Erkennung • KI-Erkennung • Plagiatsprüfung • Qualitätsbewertung"
              : "Fact Check • Bias Detection • AI Detection • Plagiarism • Quality Evaluation"}
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-gray-500 max-w-lg mx-auto">
            {locale === "de"
              ? "Fügen Sie Text ein, geben Sie eine URL an oder laden Sie eine Datei hoch. Wählen Sie dann die gewünschten Analyse-Modi und klicken Sie auf Analysieren."
              : "Paste text, enter a URL, or upload a file. Then select your desired analysis modes and click Analyze."}
          </p>

          {/* Usage Indicator */}
          {usage && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-gray-100/80 dark:bg-gray-800/80 px-3 py-1.5 text-xs">
              <Info className="h-3 w-3 text-gray-400" />
              <span className="text-gray-500 dark:text-gray-400">
                {locale === "de"
                  ? `${usage.remaining} von ${usage.limit} Prüfungen übrig`
                  : `${usage.remaining} of ${usage.limit} checks remaining`}
              </span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className={`font-medium ${
                usage.plan === "guest" ? "text-gray-500" :
                usage.plan === "free" ? "text-emerald-600 dark:text-emerald-400" :
                usage.plan === "pro" ? "text-blue-600 dark:text-blue-400" :
                "text-violet-600 dark:text-violet-400"
              }`}>
                {usage.plan === "guest" ? (locale === "de" ? "Gast" : "Guest") : usage.plan.charAt(0).toUpperCase() + usage.plan.slice(1)}
              </span>
            </div>
          )}
        </div>

        {/* Analysis Mode Selector */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {locale === "de" ? "Analyse-Modi" : "Analysis Modes"}
            </h2>
            <button
              onClick={() => setSelectedAnalyses(["comprehensive"])}
              className={`text-xs font-medium px-3 py-1 rounded-full transition-all ${
                selectedAnalyses.includes("comprehensive")
                  ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white"
                  : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200"
              }`}
            >
              {locale === "de" ? "Vollanalyse" : "Full Analysis"}
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
            {ANALYSIS_MODES.map((mode) => {
              const selected = selectedAnalyses.includes("comprehensive") || selectedAnalyses.includes(mode.id);
              return (
                <button
                  key={mode.id}
                  onClick={() => toggleAnalysis(mode.id)}
                  disabled={isProcessing}
                  className={`group relative flex flex-col items-start gap-1.5 p-3 rounded-xl border transition-all duration-200 text-left ${getColorClass(mode.color, selected)} ${isProcessing ? "opacity-50" : "hover:shadow-md cursor-pointer"}`}
                >
                  <div className="flex items-center gap-2">
                    {mode.icon}
                    <span className="text-xs font-semibold text-gray-800 dark:text-gray-200">
                      {locale === "de" ? mode.labelDe : mode.label}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">
                    {locale === "de" ? mode.descriptionDe : mode.description}
                  </p>
                  {selected && (
                    <div className="absolute top-1.5 right-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Input Mode Tabs */}
        <div className="mb-6 flex justify-center">
          <div className="inline-flex gap-1 p-1 bg-gray-100/80 dark:bg-gray-800/80 rounded-xl backdrop-blur-sm">
            <button
              onClick={() => { setInputMode("text"); setError(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                inputMode === "text"
                  ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-300 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Type className="h-4 w-4" />
              {locale === "de" ? "Text" : "Text"}
            </button>
            <button
              onClick={() => { setInputMode("url"); setError(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                inputMode === "url"
                  ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-300 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Globe className="h-4 w-4" />
              URL
            </button>
            <button
              onClick={() => { setInputMode("file"); setError(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 ${
                inputMode === "file"
                  ? "bg-white dark:bg-gray-700 text-slate-800 dark:text-slate-300 shadow-sm"
                  : "text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Upload className="h-4 w-4" />
              {locale === "de" ? "Datei" : "File"}
            </button>
          </div>
        </div>

        {/* Input Area */}
        <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl shadow-xl shadow-emerald-900/5">
          <CardContent className="p-6">
            {inputMode === "text" ? (
              <>
                <Textarea
                  placeholder={t("placeholder")}
                  value={text}
                  onChange={(e) => { setText(e.target.value); setError(""); }}
                  disabled={isProcessing}
                  className="min-h-[220px] text-base rounded-2xl border-gray-200/80 bg-white/50 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20 resize-none"
                  maxLength={MAX_CHARS}
                />
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`text-sm font-medium ${
                      text.length > MAX_CHARS ? "text-red-500"
                        : text.length > MAX_CHARS * 0.9 ? "text-amber-500"
                        : "text-gray-400"
                    }`}>
                      {text.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
                    </span>
                    {text.length > 0 && (
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            charPercent > 90 ? "bg-red-500" : charPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                          style={{ width: `${Math.min(charPercent, 100)}%` }}
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleVerify}
                      disabled={isProcessing || !isInputValid}
                      isLoading={isProcessing}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 rounded-xl"
                    >
                      {!isProcessing && <Sparkles className="h-4 w-4" />}
                      {isProcessing ? t("processing") : locale === "de" ? "Analysieren" : "Analyze"}
                    </Button>
                    {!isProcessing && (
                      <kbd className="hidden sm:inline-flex items-center gap-0.5 text-[10px] text-gray-400 font-mono">
                        <span className="rounded border border-gray-200 dark:border-gray-700 px-1.5 py-0.5">⌘</span>
                        <span>+</span>
                        <span className="rounded border border-gray-200 dark:border-gray-700 px-1.5 py-0.5">↵</span>
                      </kbd>
                    )}
                  </div>
                </div>
              </>
            ) : inputMode === "url" ? (
              <>
                <div className="space-y-4">
                  <div className="relative">
                    <Link2 className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                    <Input
                      type="url"
                      placeholder={locale === "de" ? "https://beispiel.de/artikel..." : "https://example.com/article..."}
                      value={url}
                      onChange={(e) => { setUrl(e.target.value); setError(""); }}
                      disabled={isProcessing}
                      className="h-14 pl-12 text-base rounded-2xl border-gray-200/80 bg-white/50 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-gray-400">
                      {locale === "de"
                        ? "Unterstützt Artikel, Blog-Posts und Nachrichtenseiten"
                        : "Supports articles, blog posts, and news pages"}
                    </p>
                    <Button
                      onClick={handleVerify}
                      disabled={isProcessing || !isInputValid}
                      isLoading={isProcessing}
                      size="lg"
                      className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 rounded-xl"
                    >
                      {!isProcessing && <Globe className="h-4 w-4" />}
                      {isProcessing
                        ? locale === "de" ? "Wird geprüft…" : "Verifying…"
                        : locale === "de" ? "Analysieren" : "Analyze"}
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* File Upload Mode */
              <div className="space-y-4">
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleFileDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`relative flex flex-col items-center justify-center gap-3 p-10 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                    file
                      ? "border-emerald-300 bg-emerald-50/50 dark:border-emerald-700 dark:bg-emerald-900/10"
                      : "border-gray-300 bg-gray-50/50 hover:border-emerald-400 hover:bg-emerald-50/30 dark:border-gray-700 dark:bg-gray-900/30 dark:hover:border-emerald-600"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.docx,.doc,.txt,.md"
                    onChange={handleFileChange}
                    className="sr-only"
                  />
                  {file ? (
                    <>
                      <FileText className="h-10 w-10 text-emerald-500" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-300">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); setFile(null); }}
                        className="absolute top-3 right-3 p-1 rounded-full bg-gray-200/80 dark:bg-gray-700/80 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        <X className="h-3.5 w-3.5 text-gray-500" />
                      </button>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-gray-400" />
                      <div className="text-center">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {locale === "de" ? "Datei hierher ziehen oder klicken" : "Drop file here or click to browse"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">PDF, DOCX, TXT — max 10 MB</p>
                      </div>
                    </>
                  )}
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={handleVerify}
                    disabled={isProcessing || !isInputValid}
                    isLoading={isProcessing}
                    size="lg"
                    className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 rounded-xl"
                  >
                    {!isProcessing && <FileText className="h-4 w-4" />}
                    {isProcessing
                      ? locale === "de" ? "Wird analysiert…" : "Analyzing…"
                      : locale === "de" ? "Datei analysieren" : "Analyze File"}
                  </Button>
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50/80 p-4 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}
          </CardContent>
        </Card>
        {/* URL Extracted Metadata */}
        {extractedMeta && (
          <Card className="mt-4 border-emerald-200/60 dark:border-emerald-800/60 bg-emerald-50/50 dark:bg-emerald-900/10 backdrop-blur-sm animate-fade-in">
            <CardContent className="flex items-center gap-3 p-4">
              <ExternalLink className="h-4 w-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-300 truncate">
                  {extractedMeta.title || extractedMeta.url}
                </p>
                <p className="text-xs text-gray-500 truncate">{extractedMeta.url}</p>
              </div>
              <Badge variant="secondary" className="text-xs">
                {extractedMeta.contentLength.toLocaleString()} {locale === "de" ? "Zeichen" : "chars"}
              </Badge>
            </CardContent>
          </Card>
        )}

        {/* Live Analysis Results */}
        {(aiDetectionResult || biasResult || plagiarismResult || frameworkResult) && (
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 animate-fade-in">

            {/* AI Detection Result */}
            {aiDetectionResult && (
              <Card className="border-blue-200/60 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-900/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Brain className="h-4 w-4 text-blue-500" />
                    {locale === "de" ? "KI-Erkennung" : "AI Detection"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-300">
                      {aiDetectionResult.overallScore}%
                    </span>
                    <Badge variant={
                      aiDetectionResult.verdict === "ai_generated" || aiDetectionResult.verdict === "likely_ai"
                        ? "destructive"
                        : aiDetectionResult.verdict === "mixed"
                          ? "warning"
                          : "success"
                    }>
                      {aiDetectionResult.verdict.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        aiDetectionResult.overallScore > 70 ? "bg-red-500"
                          : aiDetectionResult.overallScore > 40 ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${aiDetectionResult.overallScore}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {aiDetectionResult.signals.length} {locale === "de" ? "Signale erkannt" : "signals detected"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Bias Detection Result */}
            {biasResult && (
              <Card className="border-violet-200/60 dark:border-violet-800/60 bg-violet-50/30 dark:bg-violet-900/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Eye className="h-4 w-4 text-violet-500" />
                    {locale === "de" ? "Bias-Analyse" : "Bias Analysis"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-300">
                      {biasResult.overallScore}%
                    </span>
                    <Badge variant={
                      biasResult.biasLevel === "extreme" || biasResult.biasLevel === "significant"
                        ? "destructive"
                        : biasResult.biasLevel === "moderate"
                          ? "warning"
                          : "success"
                    }>
                      {biasResult.biasLevel}
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        biasResult.overallScore > 60 ? "bg-red-500"
                          : biasResult.overallScore > 30 ? "bg-amber-500"
                          : "bg-emerald-500"
                      }`}
                      style={{ width: `${biasResult.overallScore}%` }}
                    />
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {biasResult.signals.slice(0, 3).map((s, i) => (
                      <Badge key={i} variant="outline" className="text-[10px]">
                        {s.type.replace(/_/g, " ")}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Plagiarism Result */}
            {plagiarismResult && (
              <Card className="border-amber-200/60 dark:border-amber-800/60 bg-amber-50/30 dark:bg-amber-900/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Copy className="h-4 w-4 text-amber-500" />
                    {locale === "de" ? "Plagiatsprüfung" : "Plagiarism Check"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-300">
                      {plagiarismResult.originalityPercent}%
                    </span>
                    <Badge variant={
                      plagiarismResult.verdict === "likely_plagiarized" || plagiarismResult.verdict === "significant_overlap"
                        ? "destructive"
                        : plagiarismResult.verdict === "some_overlap"
                          ? "warning"
                          : "success"
                    }>
                      {locale === "de"
                        ? plagiarismResult.originalityPercent >= 80 ? "Original" : "Übereinstimmungen"
                        : plagiarismResult.verdict.replace(/_/g, " ")}
                    </Badge>
                  </div>
                  <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                      style={{ width: `${plagiarismResult.originalityPercent}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    {plagiarismResult.matches.length} {locale === "de" ? "Übereinstimmungen" : "matches found"}
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Framework Evaluation Result */}
            {frameworkResult && (
              <Card className="border-rose-200/60 dark:border-rose-800/60 bg-rose-50/30 dark:bg-rose-900/10 backdrop-blur-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-rose-500" />
                    {locale === "de" ? "Qualitätsbewertung" : "Quality Evaluation"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-bold text-slate-800 dark:text-slate-300">
                      {frameworkResult.overallScore}
                    </span>
                    <Badge variant={
                      frameworkResult.overallScore >= 70 ? "success"
                        : frameworkResult.overallScore >= 40 ? "warning"
                        : "destructive"
                    }>
                      {locale === "de" ? `Note ${frameworkResult.overallGrade}` : `Grade ${frameworkResult.overallGrade}`}
                    </Badge>
                  </div>
                  <div className="space-y-1.5">
                    {frameworkResult.frameworks.map((fw: { framework: string; score: number }) => (
                      <div key={fw.framework} className="flex items-center gap-2">
                        <span className="text-[10px] font-mono w-16 text-gray-500 uppercase">{fw.framework}</span>
                        <div className="flex-1 h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              fw.score >= 70 ? "bg-emerald-500" : fw.score >= 40 ? "bg-amber-500" : "bg-red-500"
                            }`}
                            style={{ width: `${fw.score}%` }}
                          />
                        </div>
                        <span className="text-[10px] w-6 text-right text-gray-500">{fw.score}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Processing Status — Claim-by-Claim */}
        {isProcessing && (
          <Card className="mt-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl animate-fade-in">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Loader2 className="h-4 w-4 animate-spin text-emerald-500" />
                {stageMessage}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {claimsExtracted.length > 0 && (
                <>
                  <div className="mb-6">
                    <div className="h-2.5 overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="mt-2 text-sm text-gray-500">
                      {judgments.length} / {claimsExtracted.length}{" "}
                      {locale === "de" ? "Behauptungen bewertet" : "claims evaluated"}
                    </p>
                    {/* Token Usage Transparency */}
                    {(tokenEstimate || tokenUsage) && (
                      <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-400 dark:text-gray-500">
                        <span className="inline-flex items-center gap-1">
                          <Sparkles className="h-3 w-3" />
                          {tokenUsage
                            ? `${tokenUsage.totalTokens.toLocaleString()} tokens used`
                            : tokenEstimate
                              ? `~${tokenEstimate.total.toLocaleString()} tokens est.`
                              : ""}
                        </span>
                        {tokenUsage && (
                          <span>({tokenUsage.promptTokens.toLocaleString()} in / {tokenUsage.completionTokens.toLocaleString()} out)</span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    {judgments.map((j, i) => (
                      <div
                        key={i}
                        className={`verdict-${j.verdict} flex items-start gap-3 rounded-xl p-3 animate-fade-in`}
                        style={{ animationDelay: `${i * 100}ms` }}
                      >
                        {getVerdictIcon(j.verdict)}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-700 dark:text-gray-300">{j.claim.claim_text}</p>
                          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{j.reasoning}</p>
                          {j.recommendation && (
                            <p className="mt-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                              {locale === "de" ? "Empfehlung" : "Recommendation"}: {j.recommendation}
                            </p>
                          )}
                        </div>
                        <Badge variant={
                          j.verdict === "supported" ? "success"
                          : j.verdict === "contradicted" ? "destructive"
                          : "warning"
                        }>
                          {j.verdict}
                        </Badge>
                      </div>
                    ))}

                    {Array.from(
                      { length: claimsExtracted.length - judgments.length },
                      (_, i) => (
                        <div key={`pending-${i}`} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/50 p-3 dark:border-gray-800 dark:bg-gray-900/50">
                          <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700" />
                          <div className="h-4 flex-1 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        </div>
                      )
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
