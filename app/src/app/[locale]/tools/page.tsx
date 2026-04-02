"use client";

import { useState } from "react";
import { useLocale } from "next-intl";
import {
  Bookmark, Code, Copy, Check, Zap, Globe,
  MousePointerClick,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default function ToolsPage() {
  const locale = useLocale();
  const [copied, setCopied] = useState<string | null>(null);

  const appUrl = typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  // Bookmarklet code — grabs page text and opens KLAR with it
  const bookmarkletCode = `javascript:void((function(){var t=document.body.innerText.substring(0,10000);var w=window.open('${appUrl}/${locale}/verify?prefill='+encodeURIComponent(t),'_blank');})())`;

  // URL bookmarklet — verifies the current page URL
  const urlBookmarkletCode = `javascript:void((function(){window.open('${appUrl}/${locale}/verify?url='+encodeURIComponent(window.location.href),'_blank');})())`;

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const curlExample = `curl -X POST ${appUrl}/api/verify \\
  -H "Content-Type: application/json" \\
  -d '{"text": "Your AI-generated text here...", "language": "en"}'`;

  const jsExample = `const response = await fetch("${appUrl}/api/verify", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: "Your AI-generated text here...",
    language: "en",
  }),
});

const reader = response.body.getReader();
// Process SSE stream...`;

  const pythonExample = `import requests

response = requests.post(
    "${appUrl}/api/verify",
    json={
        "text": "Your AI-generated text here...",
        "language": "en",
    },
    stream=True,
)

for line in response.iter_lines():
    if line.startswith(b"data: "):
        print(line.decode())`;

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-30" />

      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 mb-4">
            <Zap className="h-7 w-7" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
            {locale === "de" ? "Werkzeuge & Integration" : "Tools & Integration"}
          </h1>
          <p className="mt-2 text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
            {locale === "de"
              ? "Verifizieren Sie KI-Inhalte direkt aus Ihrem Browser — ohne Copy-Paste."
              : "Verify AI content directly from your browser — no copy-paste needed."}
          </p>
        </div>

        {/* Bookmarklets Section */}
        <ScrollReveal stagger className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Text Bookmarklet */}
          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-teal-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                  <MousePointerClick className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {locale === "de" ? "Seitentext prüfen" : "Verify Page Text"}
                  </CardTitle>
                  <p className="text-xs text-gray-500">Bookmarklet</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {locale === "de"
                  ? "Klicken Sie auf einer beliebigen Seite — der gesamte Text wird zur Verifizierung geöffnet."
                  : "Click on any page — the full text content opens in KLAR for verification."}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={bookmarkletCode}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white text-sm font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.preventDefault()}
                  draggable
                  title={locale === "de" ? "In die Lesezeichen-Leiste ziehen" : "Drag to bookmarks bar"}
                >
                  <Bookmark className="h-4 w-4" />
                  KLAR Verify
                </a>
                <span className="text-xs text-gray-400">
                  ← {locale === "de" ? "In Lesezeichen ziehen" : "Drag to bookmarks bar"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* URL Bookmarklet */}
          <Card className="border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Globe className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-base">
                    {locale === "de" ? "URL verifizieren" : "Verify URL"}
                  </CardTitle>
                  <p className="text-xs text-gray-500">Bookmarklet</p>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {locale === "de"
                  ? "Sendet die aktuelle URL an KLAR — wir extrahieren den Inhalt serverseitig."
                  : "Sends the current URL to KLAR — we extract the content server-side."}
              </p>
              <div className="flex items-center gap-3">
                <a
                  href={urlBookmarkletCode}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-medium shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all cursor-grab active:cursor-grabbing"
                  onClick={(e) => e.preventDefault()}
                  draggable
                  title={locale === "de" ? "In die Lesezeichen-Leiste ziehen" : "Drag to bookmarks bar"}
                >
                  <Globe className="h-4 w-4" />
                  KLAR URL
                </a>
                <span className="text-xs text-gray-400">
                  ← {locale === "de" ? "In Lesezeichen ziehen" : "Drag to bookmarks bar"}
                </span>
              </div>
            </CardContent>
          </Card>
        </ScrollReveal>

        {/* How to install */}
        <ScrollReveal>
        <Card className="mb-10 border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-base">
              {locale === "de" ? "Installation in 3 Schritten" : "Install in 3 Steps"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "1",
                  title: locale === "de" ? "Lesezeichen-Leiste anzeigen" : "Show Bookmarks Bar",
                  desc: locale === "de" ? "Drücken Sie Ctrl+Shift+B (Chrome/Edge) oder Ctrl+B (Firefox)" : "Press Ctrl+Shift+B (Chrome/Edge) or Ctrl+B (Firefox)",
                },
                {
                  step: "2",
                  title: locale === "de" ? "Button ziehen" : "Drag the Button",
                  desc: locale === "de" ? "Ziehen Sie den grünen/blauen Button oben in Ihre Lesezeichen-Leiste" : "Drag the green/blue button above into your bookmarks bar",
                },
                {
                  step: "3",
                  title: locale === "de" ? "Auf jeder Seite klicken" : "Click on Any Page",
                  desc: locale === "de" ? "Besuchen Sie eine Seite und klicken Sie auf das Lesezeichen — fertig!" : "Visit any page and click the bookmark — done!",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30 text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-300">{item.title}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        </ScrollReveal>

        {/* API Examples */}
        <ScrollReveal>
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-300">
              {locale === "de" ? "API-Integration" : "API Integration"}
            </h2>
            <Badge variant="secondary" className="text-xs">REST + SSE</Badge>
          </div>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {locale === "de"
              ? "Integrieren Sie KLAR direkt in Ihre Anwendung. Die API akzeptiert Text, URL oder Datei-Uploads und streamt Ergebnisse als Server-Sent Events."
              : "Integrate KLAR directly into your application. The API accepts text, URL, or file uploads and streams results as Server-Sent Events."}
          </p>
        </div>
        </ScrollReveal>

        <ScrollReveal stagger className="space-y-4">
          {[
            { id: "curl", label: "cURL", code: curlExample },
            { id: "js", label: "JavaScript", code: jsExample },
            { id: "python", label: "Python", code: pythonExample },
          ].map((example) => (
            <Card key={example.id} className="border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm">
              <CardContent className="p-0">
                <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{example.label}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopy(example.code, example.id)}
                    className="gap-1.5 text-xs"
                  >
                    {copied === example.id ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
                    {copied === example.id ? "Copied" : "Copy"}
                  </Button>
                </div>
                <pre className="p-4 text-xs text-gray-700 dark:text-gray-300 overflow-x-auto leading-relaxed">
                  <code>{example.code}</code>
                </pre>
              </CardContent>
            </Card>
          ))}
        </ScrollReveal>
      </div>
    </div>
  );
}
