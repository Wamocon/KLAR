import { setRequestLocale } from "next-intl/server";
import { Shield, Target, Users, Lightbulb, FileSearch, Brain, Eye, BarChart3, Copy, Zap, Globe } from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const isDE = locale === "de";

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-30" />
      <div className="mx-auto max-w-4xl animate-fade-in px-4 py-16 sm:px-6 lg:px-8">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
            {isDE ? "Über KLAR" : "About KLAR"}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            {isDE
              ? "KLAR — Knowledge Legitimacy Audit & Review — ist ein KI-gestütztes Faktenprüfungstool, das die Genauigkeit von KI-generierten Texten überprüft. Wir glauben an Transparenz und helfen Nutzern, fundierte Entscheidungen auf Basis verifizierter Informationen zu treffen."
              : "KLAR — Knowledge Legitimacy Audit & Review — is an AI-powered fact-checking tool that verifies the accuracy of AI-generated text. We believe in transparency and help users make informed decisions based on verified information."}
          </p>
          <div className="mx-auto mt-4 section-divider" />
        </div>

        {/* Mission Cards */}
        <ScrollReveal stagger className="grid gap-8 sm:grid-cols-2 mb-16">
          {[
            {
              icon: Target,
              title: isDE ? "Unsere Mission" : "Our Mission",
              desc: isDE
                ? "Jedem die Werkzeuge geben, KI-generierte Inhalte kritisch zu prüfen und Desinformation zu erkennen."
                : "Empowering everyone with the tools to critically evaluate AI-generated content and identify misinformation.",
            },
            {
              icon: Shield,
              title: isDE ? "Vertrauen durch Transparenz" : "Trust through Transparency",
              desc: isDE
                ? "Jede Behauptung wird gegen echte Quellen geprüft, mit nachvollziehbaren Quellenlinks."
                : "Every claim is checked against real sources, with traceable source links for full accountability.",
            },
            {
              icon: Users,
              title: isDE ? "Für alle gebaut" : "Built for Everyone",
              desc: isDE
                ? "Von Journalisten bis Studenten — KLAR macht Faktenprüfung zugänglich und einfach."
                : "From journalists to students — KLAR makes fact-checking accessible and effortless.",
            },
            {
              icon: Lightbulb,
              title: isDE ? "KI-Unterstützt" : "AI-Powered",
              desc: isDE
                ? "Modernste KI-Technologie für schnelle, mehrstufige Verifizierung mit menschlicher Überprüfung."
                : "Cutting-edge AI technology for fast, multi-step verification with human review capabilities.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-6 magnetic-hover"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
            </div>
          ))}
        </ScrollReveal>

        {/* What KLAR Analyzes */}
        <ScrollReveal>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              {isDE ? "Was KLAR analysiert" : "What KLAR Analyzes"}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
              {isDE
                ? "Fünf spezialisierte KI-Engines arbeiten zusammen, um Ihren Inhalt umfassend zu bewerten."
                : "Five specialized AI engines work together to comprehensively evaluate your content."}
            </p>
            <div className="mx-auto mt-3 section-divider" />
          </div>
        </ScrollReveal>

        <ScrollReveal stagger className="space-y-4 mb-16">
          {[
            { icon: FileSearch, label: isDE ? "Faktenprüfung" : "Fact Checking", desc: isDE ? "Prüft jede einzelne Behauptung gegen Wikipedia und Google" : "Verifies each individual claim against Wikipedia and Google" },
            { icon: Eye, label: isDE ? "Bias-Erkennung" : "Bias Detection", desc: isDE ? "Erkennt geladene Sprache, Framing und einseitige Perspektiven" : "Detects loaded language, framing, and one-sided perspectives" },
            { icon: Brain, label: isDE ? "KI-Erkennung" : "AI Detection", desc: isDE ? "Bestimmt ob Text von Menschen oder KI geschrieben wurde" : "Determines whether text was written by humans or AI" },
            { icon: Copy, label: isDE ? "Plagiatsprüfung" : "Plagiarism Check", desc: isDE ? "Findet Übereinstimmungen mit bekannten Web-Quellen" : "Finds matches with known web sources" },
            { icon: BarChart3, label: isDE ? "Qualitätsbewertung" : "Quality Evaluation", desc: isDE ? "Bewertet mit MECE, Red Team, BLUF & Pre-Mortem Frameworks" : "Scores using MECE, Red Team, BLUF & Pre-Mortem frameworks" },
          ].map(({ icon: Icon, label, desc }) => (
            <div key={label} className="flex items-start gap-4 rounded-xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-4">
              <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <Icon className="h-4 w-4" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{label}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            </div>
          ))}
        </ScrollReveal>

        {/* Technology & Compliance */}
        <ScrollReveal>
          <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-8">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {isDE ? "Technologie & Compliance" : "Technology & Compliance"}
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { icon: Zap, title: isDE ? "Gemini 2.5 Flash" : "Gemini 2.5 Flash", desc: isDE ? "Googles neustes KI-Modell mit Grounded Search" : "Google's latest AI model with Grounded Search" },
                { icon: Shield, title: isDE ? "DSGVO-konform" : "GDPR-Compliant", desc: isDE ? "Daten in Frankfurt. EU AI Act bereit." : "Data in Frankfurt. EU AI Act ready." },
                { icon: Globe, title: isDE ? "Quelloffen" : "Open Source", desc: isDE ? "Transparente Methodik, überprüfbar" : "Transparent methodology, auditable" },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="text-center p-3">
                  <Icon className="h-6 w-6 mx-auto text-emerald-600 dark:text-emerald-400 mb-2" />
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{title}</h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
