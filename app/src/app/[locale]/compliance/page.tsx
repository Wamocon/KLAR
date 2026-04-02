"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  FileText, Loader2, Plus, Download, Shield, BarChart3,
  ClipboardList, Scale,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ComplianceReportType } from "@/types";

interface ReportSummary {
  id: string;
  report_type: string;
  title: string;
  period_start: string;
  period_end: string;
  generated_at: string;
}

interface ReportDetail {
  id: string;
  report_type: string;
  title: string;
  period_start: string;
  period_end: string;
  data: Record<string, unknown>;
  generated_at: string;
}

const REPORT_TYPES: { value: ComplianceReportType; label_en: string; label_de: string; icon: typeof FileText }[] = [
  { value: "ai_act_transparency", label_en: "EU AI Act Transparency", label_de: "EU KI-Gesetz Transparenz", icon: Scale },
  { value: "ai_act_risk_assessment", label_en: "EU AI Act Risk Assessment", label_de: "EU KI-Gesetz Risikobewertung", icon: Shield },
  { value: "monthly_summary", label_en: "Monthly Summary", label_de: "Monatliche Zusammenfassung", icon: BarChart3 },
  { value: "audit_export", label_en: "Audit Trail Export", label_de: "Prüfprotokoll-Export", icon: ClipboardList },
];

export default function ComplianceReportsPage() {
  const locale = useLocale();
  const router = useRouter();

  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Generate form
  const [showForm, setShowForm] = useState(false);
  const [reportType, setReportType] = useState<ComplianceReportType>("monthly_summary");
  const [periodStart, setPeriodStart] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().split("T")[0];
  });
  const [periodEnd, setPeriodEnd] = useState(() => new Date().toISOString().split("T")[0]);

  const loadReports = useCallback(async () => {
    try {
      const res = await fetch("/api/compliance/report");
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports || []);
      }
    } catch {
      // Silent
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/compliance/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_type: reportType,
          period_start: periodStart,
          period_end: periodEnd,
        }),
      });
      if (res.ok) {
        setShowForm(false);
        await loadReports();
      }
    } catch {
      // Silent
    } finally {
      setGenerating(false);
    }
  };

  const handleViewReport = async (reportId: string) => {
    const res = await fetch(`/api/compliance/report?id=${reportId}`);
    if (res.ok) {
      const data = await res.json();
      setSelectedReport(data.report);
    }
  };

  const handleExportReport = (report: ReportDetail) => {
    const blob = new Blob([JSON.stringify(report.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `klar-${report.report_type}-${report.period_start.split("T")[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-40" />

      <div className="mx-auto max-w-3xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
            {locale === "de" ? "Compliance-Berichte" : "Compliance Reports"}
          </h1>
          <Button
            onClick={() => setShowForm(!showForm)}
            className="gap-2 rounded-xl"
          >
            <Plus className="h-4 w-4" />
            {locale === "de" ? "Bericht erstellen" : "Generate Report"}
          </Button>
        </div>

        <p className="mb-6 text-sm text-gray-500">
          {locale === "de"
            ? "Generieren Sie Berichte zur Einhaltung des EU KI-Gesetzes, monatliche Zusammenfassungen und Prüfprotokoll-Exporte."
            : "Generate EU AI Act compliance reports, monthly summaries, and audit trail exports."}
        </p>

        {/* Generate form */}
        {showForm && (
          <Card className="mb-6 border-blue-200/60 dark:border-blue-900/40 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardContent className="pt-6 space-y-4">
              <div>
                <label className="block mb-1.5 text-sm font-medium">
                  {locale === "de" ? "Berichtstyp" : "Report Type"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {REPORT_TYPES.map((rt) => {
                    const Icon = rt.icon;
                    return (
                      <button
                        key={rt.value}
                        onClick={() => setReportType(rt.value)}
                        className={`flex items-center gap-2 rounded-lg border p-3 text-left text-sm transition-colors ${
                          reportType === rt.value
                            ? "border-blue-300 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                            : "border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        }`}
                      >
                        <Icon className="h-4 w-4 shrink-0" />
                        <span>{locale === "de" ? rt.label_de : rt.label_en}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium">
                    {locale === "de" ? "Von" : "From"}
                  </label>
                  <input
                    type="date"
                    value={periodStart}
                    onChange={(e) => setPeriodStart(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
                <div className="flex-1">
                  <label className="block mb-1.5 text-sm font-medium">
                    {locale === "de" ? "Bis" : "To"}
                  </label>
                  <input
                    type="date"
                    value={periodEnd}
                    onChange={(e) => setPeriodEnd(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                  />
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={generating}
                isLoading={generating}
                className="gap-2 rounded-xl"
              >
                <FileText className="h-4 w-4" />
                {locale === "de" ? "Bericht generieren" : "Generate"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Selected report detail */}
        {selectedReport && (
          <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span>{selectedReport.title}</span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExportReport(selectedReport)}
                    className="gap-1 rounded-lg text-xs"
                  >
                    <Download className="h-3 w-3" />
                    JSON
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedReport(null)}
                    className="rounded-lg text-xs"
                  >
                    {locale === "de" ? "Schließen" : "Close"}
                  </Button>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="rounded-lg bg-gray-50 dark:bg-gray-900 p-4 text-xs font-mono overflow-x-auto max-h-[500px] overflow-y-auto">
                {JSON.stringify(selectedReport.data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        )}

        {/* Reports list */}
        <div className="space-y-2">
          {reports.map((report) => {
            const typeInfo = REPORT_TYPES.find((rt) => rt.value === report.report_type);
            const Icon = typeInfo?.icon || FileText;
            return (
              <button
                key={report.id}
                onClick={() => handleViewReport(report.id)}
                className="w-full flex items-center gap-3 rounded-lg border border-gray-200 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-800 dark:hover:bg-gray-800/50"
              >
                <Icon className="h-5 w-5 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{report.title}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(report.period_start).toLocaleDateString(locale)} –{" "}
                    {new Date(report.period_end).toLocaleDateString(locale)}
                  </p>
                </div>
                <span className="text-xs text-gray-400 shrink-0">
                  {new Date(report.generated_at).toLocaleDateString(locale)}
                </span>
              </button>
            );
          })}

          {reports.length === 0 && !showForm && (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-300 dark:text-gray-700" />
              <p className="mt-3 text-sm text-gray-500">
                {locale === "de"
                  ? "Noch keine Berichte. Erstellen Sie Ihren ersten Compliance-Bericht."
                  : "No reports yet. Generate your first compliance report."}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
