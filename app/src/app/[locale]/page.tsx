import { useTranslations } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import {
  Shield,
  FileSearch,
  Search,
  Brain,
  FileCheck,
  ClipboardPaste,
  Globe,
  Eye,
  Zap,
  Users,
  Lock,
  Check,
  ArrowRight,
  Copy,
  BarChart3,
  Upload,
  Sparkles,
  Key,
  Building2,
  Scale,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <LandingContent locale={locale} />;
}

function LandingContent({ locale }: { locale: string }) {
  const t = useTranslations("landing");

  return (
    <div className="animate-fade-in">
      {/* Hero Section */}
      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-32 min-h-[90vh] flex flex-col justify-center">
        <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-100 transition-colors duration-700" />
        
        {/* Animated Orbs */}
        <div className="absolute right-[10%] top-[20%] -z-10 h-[400px] w-[400px] animate-float rounded-full bg-gradient-to-br from-emerald-400/30 to-teal-500/10 blur-[80px] dark:from-emerald-600/20 dark:to-teal-900/20" />
        <div className="absolute -left-[5%] bottom-[10%] -z-10 h-[500px] w-[500px] animate-float-delayed rounded-full bg-gradient-to-tr from-blue-400/20 to-emerald-300/20 blur-[100px] dark:from-blue-900/20 dark:to-emerald-800/20" />

        <div className="mx-auto max-w-4xl text-center">
          <Badge variant="secondary" className="mb-6 text-sm">
            <Shield className="mr-1.5 h-3.5 w-3.5" />
            {locale === "de" ? "KI-Verifizierung" : "AI Verification"}
          </Badge>

          <h1 className="text-4xl font-bold tracking-tight text-slate-800 dark:text-slate-300 sm:text-5xl lg:text-6xl">
            {t("hero.title")}{" "}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent dark:from-emerald-400 dark:to-teal-400">
              {t("hero.titleHighlight")}
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600 dark:text-gray-400 sm:text-xl">
            {t("hero.description")}
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link href={`/${locale}/verify`}>
              <Button size="xl" className="gap-2 shadow-lg shadow-gray-900/10">
                <FileSearch className="h-5 w-5" />
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <a href="#how-it-works">
              <Button variant="outline" size="lg">
                {t("hero.ctaSecondary")}
              </Button>
            </a>
          </div>

          {/* Demo Preview */}
          <div className="mx-auto mt-20 max-w-3xl animate-float-delayed">
            <div className="glass dark:glass-dark rounded-2xl p-6 shadow-2xl shadow-emerald-900/5">
              <div className="flex items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
                <div className="h-3 w-3 rounded-full bg-red-400" />
                <div className="h-3 w-3 rounded-full bg-amber-400" />
                <div className="h-3 w-3 rounded-full bg-emerald-400" />
                <span className="ml-2 text-xs text-gray-400">klar.ai</span>
              </div>
              <div className="mt-4 space-y-3">
                <div className="verdict-supported rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {locale === "de"
                          ? '"Deutschland hat über 200 KI-Startups in Berlin."'
                          : '"Germany has over 200 AI startups in Berlin."'}
                      </p>
                      <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">
                        ✓{" "}
                        {locale === "de"
                          ? "Bestätigt — Quelle: Wikipedia"
                          : "Supported — Source: Wikipedia"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="verdict-contradicted rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm text-red-600">✗</span>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {locale === "de"
                          ? '"n8n wurde 2015 in München gegründet."'
                          : '"n8n was founded in 2015 in Munich."'}
                      </p>
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                        ✗{" "}
                        {locale === "de"
                          ? "Widerlegt — n8n ist in Berlin ansässig"
                          : "Contradicted — n8n is based in Berlin"}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="verdict-unverifiable rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 text-sm text-amber-600">?</span>
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">
                        {locale === "de"
                          ? '"85% der DAX-Unternehmen nutzen KI-Tools intern."'
                          : '"85% of DAX companies use AI tools internally."'}
                      </p>
                      <p className="mt-1 text-xs text-amber-600 dark:text-amber-400">
                        ?{" "}
                        {locale === "de"
                          ? "Nicht überprüfbar — keine verlässliche Quelle gefunden"
                          : "Unverifiable — no reliable source found"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {t("howItWorks.title")}
              </h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
                {t("howItWorks.subtitle")}
              </p>
              <p className="mt-2 mx-auto max-w-2xl text-sm text-gray-400 dark:text-gray-500">
                {locale === "de"
                  ? "KLAR verwendet einen mehrstufigen Verifizierungsprozess: Zuerst werden Behauptungen extrahiert, dann gegen echte Quellen geprüft und abschließend von einer zweiten KI bewertet."
                  : "KLAR uses a multi-stage verification pipeline: first extracting claims, then checking them against real sources, and finally having a second AI pass evaluate each claim."}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-16 grid grid-cols-1 gap-8 md:grid-cols-5">
            {[
              { icon: ClipboardPaste, title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
              { icon: FileSearch, title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
              { icon: Search, title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
              { icon: Brain, title: t("howItWorks.step4Title"), desc: t("howItWorks.step4Desc") },
              { icon: FileCheck, title: t("howItWorks.step5Title"), desc: t("howItWorks.step5Desc") },
            ].map((step, i) => (
              <div key={i} className="relative flex flex-col items-center text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-900 text-white shadow-lg dark:bg-white dark:text-slate-800 magnetic-hover">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="absolute -left-4 top-7 hidden h-px w-full bg-gray-200 dark:bg-gray-700 md:block first:hidden" style={{ display: i === 0 ? "none" : undefined }} />
                <span className="mt-2 text-xs font-bold text-gray-400">{i + 1}</span>
                <h3 className="mt-2 text-base font-semibold text-slate-800 dark:text-slate-300">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {step.desc}
                </p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Features */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent dark:via-gray-900/20" />
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl inline-block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                {t("features.title")}
              </h2>
              <p className="mt-2 mx-auto max-w-xl text-sm text-gray-400 dark:text-gray-500">
                {locale === "de"
                  ? "KLAR ist nicht nur ein Faktenprüfer — es ist eine umfassende Plattform zur Inhaltsanalyse mit mehreren spezialisierten KI-Engines."
                  : "KLAR is not just a fact-checker — it's a comprehensive content analysis platform with multiple specialized AI engines."}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Search, title: t("features.evidenceBased"), desc: t("features.evidenceBasedDesc") },
              { icon: Eye, title: t("features.transparent"), desc: t("features.transparentDesc") },
              { icon: Globe, title: t("features.universal"), desc: t("features.universalDesc") },
              { icon: Lock, title: t("features.euCompliant"), desc: t("features.euCompliantDesc") },
              { icon: Zap, title: t("features.fast"), desc: t("features.fastDesc") },
              { icon: Users, title: t("features.accessible"), desc: t("features.accessibleDesc") },
            ].map((feature, i) => (
              <Card key={i} className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm magnetic-hover">
                <div className="absolute origin-top-left -rotate-12 scale-150 transform opacity-0 transition-opacity duration-500 group-hover:opacity-100">
                   <div className="h-40 w-40 rounded-full bg-gradient-to-br from-emerald-400/10 to-transparent blur-3xl" />
                </div>
                <CardHeader>
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 text-gray-600 transition-colors duration-300 group-hover:from-emerald-500 group-hover:to-teal-600 group-hover:text-white dark:from-gray-800 dark:to-gray-900 dark:text-gray-300 shadow-sm border border-gray-200/50 dark:border-gray-700/50">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                    {feature.desc}
                  </p>
                </CardContent>
              </Card>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Analysis Capabilities — NEW */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 text-xs">
                <Sparkles className="mr-1.5 h-3 w-3" />
                {locale === "de" ? "5 KI-Engines" : "5 AI Engines"}
              </Badge>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {locale === "de" ? "Umfassende Inhaltsanalyse" : "Comprehensive Content Analysis"}
              </h2>
              <p className="mt-3 mx-auto max-w-2xl text-gray-500 dark:text-gray-400">
                {locale === "de"
                  ? "Wählen Sie zwischen fünf spezialisierten Analyse-Modi oder führen Sie eine Vollanalyse durch — alles in einem Durchgang."
                  : "Choose between five specialized analysis modes or run a full comprehensive analysis — all in a single pass."}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              {
                icon: FileSearch, color: "emerald",
                title: locale === "de" ? "Faktenprüfung" : "Fact Checking",
                desc: locale === "de"
                  ? "Extrahiert einzelne Behauptungen und prüft jede gegen Wikipedia und Google. Jedes Urteil enthält Quelllinks und eine Begründung."
                  : "Extracts individual claims and verifies each against Wikipedia and Google. Every verdict includes source links and reasoning.",
              },
              {
                icon: Eye, color: "violet",
                title: locale === "de" ? "Bias-Erkennung" : "Bias Detection",
                desc: locale === "de"
                  ? "Erkennt geladene Sprache, emotionale Appelle, einseitige Rahmung und politische Neigung mit einem 0-100 Bias-Score."
                  : "Detects loaded language, emotional appeals, one-sided framing, and political lean with a 0-100 bias score.",
              },
              {
                icon: Brain, color: "blue",
                title: locale === "de" ? "KI-Erkennung" : "AI Detection",
                desc: locale === "de"
                  ? "Analysiert Satzstruktur, Vokabelvielfalt und Perplexität, um festzustellen, ob Text von Menschen oder KI geschrieben wurde."
                  : "Analyzes sentence structure, vocabulary diversity, and perplexity to determine whether text was written by a human or AI.",
              },
              {
                icon: Copy, color: "amber",
                title: locale === "de" ? "Plagiatsprüfung" : "Plagiarism Check",
                desc: locale === "de"
                  ? "Vergleicht Textfragmente mit bekannten Quellen im Web und berechnet einen Originalitätsprozentsatz."
                  : "Compares text fragments against known web sources and calculates an originality percentage.",
              },
              {
                icon: BarChart3, color: "rose",
                title: locale === "de" ? "Qualitätsbewertung" : "Quality Evaluation",
                desc: locale === "de"
                  ? "Bewertet Inhalt mit professionellen Frameworks: MECE, Red Team, BLUF und Pre-Mortem — mit Note A-F."
                  : "Scores content using professional frameworks: MECE, Red Team, BLUF, and Pre-Mortem — with an A-F grade.",
              },
              {
                icon: Upload, color: "teal",
                title: locale === "de" ? "Datei-Upload" : "File Upload",
                desc: locale === "de"
                  ? "Laden Sie PDF-, DOCX- oder TXT-Dateien hoch — KLAR extrahiert den Text automatisch und führt alle ausgewählten Analysen durch."
                  : "Upload PDF, DOCX, or TXT files — KLAR automatically extracts text and runs all selected analyses.",
              },
            ].map(({ icon: Icon, color, title, desc }, i) => {
              const colorMap: Record<string, string> = {
                emerald: "from-emerald-500 to-teal-600 shadow-emerald-500/20",
                violet: "from-violet-500 to-purple-600 shadow-violet-500/20",
                blue: "from-blue-500 to-indigo-600 shadow-blue-500/20",
                amber: "from-amber-500 to-orange-600 shadow-amber-500/20",
                rose: "from-rose-500 to-pink-600 shadow-rose-500/20",
                teal: "from-teal-500 to-cyan-600 shadow-teal-500/20",
              };
              return (
                <div key={i} className="group rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg magnetic-hover">
                  <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${colorMap[color]} text-white shadow-lg`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">{title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
                </div>
              );
            })}
          </ScrollReveal>

          <ScrollReveal className="mt-10 text-center">
            <Link href={`/${locale}/verify`}>
              <Button size="lg" className="gap-2">
                <Sparkles className="h-4 w-4" />
                {locale === "de" ? "Jetzt analysieren" : "Start analyzing"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {t("pricing.title")}
              </h2>
              <p className="mt-3 text-lg text-gray-500 dark:text-gray-400">
                {t("pricing.subtitle")}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3">
            {/* Free */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.free")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.freePrice")}
                  <span className="text-base font-normal text-gray-500">
                    {t("pricing.perMonth")}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.freeFeature1"), t("pricing.freeFeature2"), t("pricing.freeFeature3")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/verify`} className="block pt-4">
                  <Button variant="outline" className="w-full">
                    {t("pricing.free")}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-gray-900 shadow-lg dark:border-white">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-sm">
                  {locale === "de" ? "Beliebteste" : "Most popular"}
                </Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.pro")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.proPrice")}
                  <span className="text-base font-normal text-gray-500">
                    {t("pricing.perMonth")}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.proFeature1"), t("pricing.proFeature2"), t("pricing.proFeature3")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/auth/signup`} className="block pt-4">
                  <Button className="w-full">{t("pricing.pro")}</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Team */}
            <Card>
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.team")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.teamPrice")}
                  <span className="text-base font-normal text-gray-500">
                    {t("pricing.perUser")}{t("pricing.perMonth")}
                  </span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.teamFeature1"), t("pricing.teamFeature2"), t("pricing.teamFeature3")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 text-emerald-500" />
                      {f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/auth/signup`} className="block pt-4">
                  <Button variant="outline" className="w-full">
                    {t("pricing.team")}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* Trust Section */}
      <section className="bg-gray-50 px-4 py-20 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl text-center">
          <ScrollReveal>
            <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
              {t("trust.title")}
            </h2>
            <p className="mt-2 text-sm text-gray-400 dark:text-gray-500">
              {locale === "de"
                ? "Ihre Daten bleiben in der EU. DSGVO-konform von Grund auf."
                : "Your data stays in the EU. GDPR-compliant by design."}
            </p>
            <div className="mx-auto mt-3 section-divider" />
          </ScrollReveal>
          <ScrollReveal stagger className="mt-10 grid grid-cols-2 gap-6 md:grid-cols-4">
            {[
              { label: t("trust.gdpr"), icon: Lock },
              { label: t("trust.euData"), icon: Globe },
              { label: t("trust.aiAct"), icon: Shield },
              { label: t("trust.builtInGermany"), icon: Check },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900 magnetic-hover"
              >
                <item.icon className="h-6 w-6 text-slate-800 dark:text-slate-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {item.label}
                </span>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* Enterprise / B2B Section */}
      <section id="enterprise" className="px-4 py-20 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 text-sm">
                <Building2 className="mr-1.5 h-3.5 w-3.5" />
                Enterprise
              </Badge>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {locale === "de"
                  ? "KI-Qualitätssicherung für Unternehmen"
                  : "AI Quality Assurance for Enterprise"}
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-gray-600 dark:text-gray-400">
                {locale === "de"
                  ? "Verifizieren Sie KI-Ausgaben im großen Maßstab. Integrieren Sie über API, überwachen Sie über Dashboards, berichten Sie konform zum EU KI-Gesetz."
                  : "Verify AI outputs at scale. Integrate via API, monitor through dashboards, and report in compliance with the EU AI Act."}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-2">
            {[
              {
                icon: Key,
                title: locale === "de" ? "API & Browser-Erweiterung" : "API & Browser Extension",
                desc: locale === "de"
                  ? "Integrieren Sie die Verifizierung in Ihren Workflow mit unserer REST-API oder Chrome-Erweiterung. HMAC-signierte Webhooks für Echtzeit-Benachrichtigungen."
                  : "Integrate verification into your workflow with our REST API or Chrome Extension. HMAC-signed webhooks for real-time notifications.",
              },
              {
                icon: Users,
                title: locale === "de" ? "Team- & Organisationsverwaltung" : "Team & Organization Management",
                desc: locale === "de"
                  ? "Erstellen Sie Organisationen, laden Sie Mitglieder ein, verwalten Sie Rollen (Owner/Admin/Member) und teilen Sie den Verifizierungsverlauf."
                  : "Create organizations, invite members, manage roles (Owner/Admin/Member), and share verification history across your team.",
              },
              {
                icon: Scale,
                title: locale === "de" ? "EU KI-Gesetz Compliance" : "EU AI Act Compliance",
                desc: locale === "de"
                  ? "Generieren Sie automatisch Transparenzberichte (Art. 52), Risikobewertungen und Prüfprotokoll-Exporte für regulatorische Anforderungen."
                  : "Auto-generate transparency reports (Art. 52), risk assessments, and audit trail exports for regulatory requirements.",
              },
              {
                icon: Layers,
                title: locale === "de" ? "Stapelverarbeitung" : "Batch Processing",
                desc: locale === "de"
                  ? "Verifizieren Sie bis zu 50 Texte pro Batch-Auftrag. Asynchrone Verarbeitung mit Statusabfrage und Webhook-Benachrichtigungen."
                  : "Verify up to 50 texts per batch job. Async processing with status polling and webhook notifications when complete.",
              },
            ].map((feature, i) => (
              <Card
                key={i}
                className="border-gray-200/60 bg-white/60 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/60 magnetic-hover"
              >
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-base">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                      <feature.icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{feature.desc}</p>
                </CardContent>
              </Card>
            ))}
          </ScrollReveal>

          <ScrollReveal className="mt-10 text-center">
            <Link href={`/${locale}/settings`}>
              <Button size="lg" variant="outline" className="gap-2">
                <Key className="h-4 w-4" />
                {locale === "de" ? "API-Zugang einrichten" : "Set up API access"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </ScrollReveal>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gray-900 px-4 py-20 dark:bg-gray-950 sm:px-6 lg:px-8">
        <ScrollReveal variant="scale" className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {locale === "de"
              ? "Bereit, KI-Inhalte zu überprüfen?"
              : "Ready to verify AI content?"}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {locale === "de"
              ? "Starten Sie kostenlos — keine Registrierung für die ersten 3 Überprüfungen erforderlich."
              : "Start for free — no signup required for your first 3 checks."}
          </p>
          <Link href={`/${locale}/verify`}>
            <Button
              size="xl"
              variant="success"
              className="mt-8 gap-2 shadow-lg"
            >
              <FileSearch className="h-5 w-5" />
              {locale === "de" ? "Jetzt starten" : "Get started"}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
