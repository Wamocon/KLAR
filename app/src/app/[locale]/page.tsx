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
  Upload,
  Sparkles,
  Key,
  Building2,
  Scale,
  Layers,
  AlertTriangle,
  Newspaper,
  Briefcase,
  GraduationCap,
  Pen,
  Gavel,
  School,
  ChevronDown,
  ShieldCheck,
  ScanEye,
  FileText,
  Star,
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
      {/* ═══ HERO — Anchoring Bias + Loss Aversion + Urgency ═══ */}
      <section className="relative overflow-hidden px-4 pb-20 pt-20 sm:px-6 lg:px-8 lg:pt-32 min-h-[90vh] flex flex-col justify-center">
        <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-100 transition-colors duration-700" />
        <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-emerald-400/20 blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-1/4 h-96 w-96 rounded-full bg-blue-400/10 blur-3xl animate-pulse-slow delay-1000" />

        <div className="mx-auto max-w-4xl text-center relative z-10">
          <ScrollReveal>
            <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm shadow-sm">
              <Shield className="mr-2 h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
              {t("hero.badge")}
            </Badge>
          </ScrollReveal>

          <ScrollReveal>
            <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
              <span className="text-slate-800 dark:text-slate-200">{t("hero.title")}</span>
              <br />
              <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-cyan-500 bg-clip-text text-transparent">
                {t("hero.titleHighlight")}
              </span>
            </h1>
          </ScrollReveal>

          <ScrollReveal>
            <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 sm:text-xl">
              {t("hero.description")}
            </p>
          </ScrollReveal>

          <ScrollReveal>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link href={`/${locale}/verify`}>
                <Button size="xl" variant="success" className="gap-2 shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-shadow">
                  <FileSearch className="h-5 w-5" />
                  {t("hero.cta")}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <a href="#how-it-works">
                <Button size="lg" variant="outline" className="gap-2">
                  {t("hero.ctaSecondary")}
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </a>
            </div>
          </ScrollReveal>

          {/* Live demo preview */}
          <ScrollReveal>
            <div className="mx-auto mt-16 max-w-2xl rounded-2xl border border-gray-200/60 bg-white/80 p-6 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/80">
              <div className="flex items-center gap-2 text-xs text-gray-400 mb-4">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                {locale === "de" ? "Live-Vorschau — Vertrauensbericht" : "Live preview — Trust Report"}
              </div>
              <div className="space-y-3">
                {[
                  { verdict: "supported", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300", text: locale === "de" ? "Die Erde umkreist die Sonne in 365,25 Tagen." : "The Earth orbits the Sun in 365.25 days.", icon: Check, source: locale === "de" ? "✓ Bestätigt — Wikipedia, NASA" : "✓ Supported — Wikipedia, NASA" },
                  { verdict: "contradicted", color: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300", text: locale === "de" ? "Die Chinesische Mauer ist vom Mond aus sichtbar." : "The Great Wall of China is visible from the Moon.", icon: AlertTriangle, source: locale === "de" ? "✗ Widerlegt — NASA, Scientific American" : "✗ Contradicted — NASA, Scientific American" },
                  { verdict: "unverifiable", color: "bg-slate-100 text-slate-700 dark:bg-slate-800/40 dark:text-slate-300", text: locale === "de" ? "85 % der Unternehmen nutzen KI im täglichen Betrieb." : "85% of companies use AI daily in their operations.", icon: Search, source: locale === "de" ? "? Unbestätigt — keine zuverlässige Quelle gefunden" : "? Unconfirmed — no reliable source found" },
                ].map((claim, i) => (
                  <div key={i} className="flex items-start gap-3 rounded-xl bg-gray-50/80 p-3 dark:bg-gray-800/40 transition-colors">
                    <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${claim.color}`}>
                      <claim.icon className="h-3.5 w-3.5" />
                    </span>
                    <div>
                      <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{claim.text}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{claim.source}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ PROBLEM / PAIN — Fear + Loss Aversion + Negativity Bias ═══ */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 text-xs">
                <AlertTriangle className="mr-1.5 h-3 w-3 text-amber-600" />
                {locale === "de" ? "Das Problem" : "The Problem"}
              </Badge>
              <h2 className="text-3xl font-bold sm:text-4xl inline-block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                {t("problem.title")}
              </h2>
              <p className="mt-4 mx-auto max-w-3xl text-gray-500 dark:text-gray-400 leading-relaxed">
                {t("problem.subtitle")}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-14 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { value: t("problem.stat1Value"), label: t("problem.stat1Label"), desc: t("problem.stat1Desc"), color: "text-red-600 dark:text-red-400" },
              { value: t("problem.stat2Value"), label: t("problem.stat2Label"), desc: t("problem.stat2Desc"), color: "text-emerald-600 dark:text-emerald-400" },
              { value: t("problem.stat3Value"), label: t("problem.stat3Label"), desc: t("problem.stat3Desc"), color: "text-blue-600 dark:text-blue-400" },
            ].map((stat, i) => (
              <div key={i} className="rounded-2xl border border-gray-200/60 bg-white/70 p-8 text-center dark:border-gray-800/60 dark:bg-gray-900/70 backdrop-blur-sm">
                <div className={`text-4xl font-extrabold tracking-tight sm:text-5xl ${stat.color}`}>{stat.value}</div>
                <div className="mt-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{stat.label}</div>
                <p className="mt-2 text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{stat.desc}</p>
              </div>
            ))}
          </ScrollReveal>

          <ScrollReveal stagger className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {[
              { icon: Newspaper, badge: t("problem.painJournalist"), title: t("problem.painJournalistTitle"), desc: t("problem.painJournalistDesc"), color: "from-emerald-500 to-teal-600" },
              { icon: Briefcase, badge: t("problem.painBusiness"), title: t("problem.painBusinessTitle"), desc: t("problem.painBusinessDesc"), color: "from-blue-500 to-indigo-600" },
              { icon: GraduationCap, badge: t("problem.painStudent"), title: t("problem.painStudentTitle"), desc: t("problem.painStudentDesc"), color: "from-violet-500 to-purple-600" },
            ].map((pain, i) => (
              <div key={i} className="group rounded-2xl border border-gray-200/60 bg-white/60 p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-gray-800/60 dark:bg-gray-900/60 backdrop-blur-sm">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${pain.color} text-white shadow-lg`}>
                  <pain.icon className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="mb-3 text-xs">{pain.badge}</Badge>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">{pain.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{pain.desc}</p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ HOW IT WORKS — Progressive Disclosure ═══ */}
      <section id="how-it-works" className="px-4 py-24 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl inline-block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                {t("howItWorks.title")}
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">
                {t("howItWorks.subtitle")}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <div className="mt-16 relative">
            <div className="absolute left-1/2 top-0 bottom-0 w-px bg-gradient-to-b from-emerald-500/30 via-emerald-500/60 to-emerald-500/30 hidden lg:block" />
            <ScrollReveal stagger className="space-y-12 lg:space-y-16">
              {[
                { icon: ClipboardPaste, title: t("howItWorks.step1Title"), desc: t("howItWorks.step1Desc") },
                { icon: ScanEye, title: t("howItWorks.step2Title"), desc: t("howItWorks.step2Desc") },
                { icon: Brain, title: t("howItWorks.step3Title"), desc: t("howItWorks.step3Desc") },
                { icon: Search, title: t("howItWorks.step4Title"), desc: t("howItWorks.step4Desc") },
                { icon: FileCheck, title: t("howItWorks.step5Title"), desc: t("howItWorks.step5Desc") },
              ].map((step, i) => (
                <div key={i} className={`flex flex-col items-center gap-6 lg:flex-row ${i % 2 === 1 ? "lg:flex-row-reverse" : ""}`}>
                  <div className={`flex-1 ${i % 2 === 1 ? "lg:text-right" : "lg:text-left"} text-center lg:text-inherit`}>
                    <div className="inline-flex items-center gap-2 mb-2">
                      <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">{i + 1}</span>
                      <h3 className="font-semibold text-lg text-slate-800 dark:text-slate-300">{step.title}</h3>
                    </div>
                    <p className="text-sm leading-relaxed text-gray-500 dark:text-gray-400 max-w-md mx-auto lg:mx-0">{step.desc}</p>
                  </div>
                  <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1 hidden lg:block" />
                </div>
              ))}
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* ═══ WHY KLAR — Authority + Social Proof ═══ */}
      <section className="relative px-4 py-24 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-gray-50/50 to-transparent dark:via-gray-900/20" />
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl inline-block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                {t("features.title")}
              </h2>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Search, title: t("features.evidenceBased"), desc: t("features.evidenceBasedDesc") },
              { icon: Eye, title: t("features.transparent"), desc: t("features.transparentDesc") },
              { icon: FileText, title: t("features.universal"), desc: t("features.universalDesc") },
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

      {/* ═══ 5 ANALYSIS ENGINES — Authority + Specificity ═══ */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <Badge variant="secondary" className="mb-4 text-xs">
                <Sparkles className="mr-1.5 h-3 w-3" />
                {locale === "de" ? "5 KI-Engines" : "5 AI Engines"}
              </Badge>
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {t("engines.title")}
              </h2>
              <p className="mt-3 mx-auto max-w-2xl text-gray-500 dark:text-gray-400">
                {t("engines.subtitle")}
              </p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: FileSearch, color: "emerald", title: t("engines.factCheck"), desc: t("engines.factCheckDesc") },
              { icon: Eye, color: "violet", title: t("engines.biasDetection"), desc: t("engines.biasDetectionDesc") },
              { icon: Brain, color: "blue", title: t("engines.aiDetection"), desc: t("engines.aiDetectionDesc") },
              { icon: Copy, color: "amber", title: t("engines.plagiarism"), desc: t("engines.plagiarismDesc") },
              { icon: Shield, color: "rose", title: t("engines.euCompliance"), desc: t("engines.euComplianceDesc") },
              { icon: Upload, color: "teal", title: t("engines.fileUpload"), desc: t("engines.fileUploadDesc") },
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

      {/* ═══ WHO IS IT FOR — Bandwagon + Jobs To Be Done ═══ */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold sm:text-4xl inline-block bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
                {t("whoIsItFor.title")}
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{t("whoIsItFor.subtitle")}</p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Newspaper, title: t("whoIsItFor.journalist"), desc: t("whoIsItFor.journalistDesc"), color: "from-emerald-500 to-teal-600" },
              { icon: GraduationCap, title: t("whoIsItFor.student"), desc: t("whoIsItFor.studentDesc"), color: "from-violet-500 to-purple-600" },
              { icon: Briefcase, title: t("whoIsItFor.business"), desc: t("whoIsItFor.businessDesc"), color: "from-blue-500 to-indigo-600" },
              { icon: Pen, title: t("whoIsItFor.creator"), desc: t("whoIsItFor.creatorDesc"), color: "from-amber-500 to-orange-600" },
              { icon: Gavel, title: t("whoIsItFor.legal"), desc: t("whoIsItFor.legalDesc"), color: "from-rose-500 to-pink-600" },
              { icon: School, title: t("whoIsItFor.education"), desc: t("whoIsItFor.educationDesc"), color: "from-teal-500 to-cyan-600" },
            ].map(({ icon: Icon, title, desc, color }, i) => (
              <div key={i} className="group rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg magnetic-hover">
                <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br ${color} text-white shadow-lg`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-300">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-500 dark:text-gray-400">{desc}</p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ PRICING — Decoy Effect + Anchoring ═══ */}
      <section id="pricing" className="px-4 py-24 sm:px-6 lg:px-8">
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
            <Card className="border-gray-200/60 dark:border-gray-800/60">
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.free")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.freePrice")}
                  <span className="text-base font-normal text-gray-500">{t("pricing.perMonth")}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.freeFeature1"), t("pricing.freeFeature2"), t("pricing.freeFeature3"), t("pricing.freeFeature4"), t("pricing.freeFeature5")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />{f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/verify`} className="block pt-4">
                  <Button variant="outline" className="w-full">{t("pricing.free")}</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="relative border-gray-900 shadow-xl dark:border-white scale-[1.02]">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="shadow-sm">
                  <Star className="mr-1 h-3 w-3" />
                  {locale === "de" ? "Beliebteste" : "Most popular"}
                </Badge>
              </div>
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.pro")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.proPrice")}
                  <span className="text-base font-normal text-gray-500">{t("pricing.perMonth")}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.proFeature1"), t("pricing.proFeature2"), t("pricing.proFeature3"), t("pricing.proFeature4"), t("pricing.proFeature5")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />{f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/auth/signup`} className="block pt-4">
                  <Button className="w-full">{t("pricing.pro")}</Button>
                </Link>
              </CardContent>
            </Card>

            {/* Team */}
            <Card className="border-gray-200/60 dark:border-gray-800/60">
              <CardHeader className="text-center">
                <CardTitle>{t("pricing.team")}</CardTitle>
                <p className="mt-2 text-3xl font-bold text-slate-800 dark:text-slate-300">
                  {t("pricing.teamPrice")}
                  <span className="text-base font-normal text-gray-500">{t("pricing.perUser")}{t("pricing.perMonth")}</span>
                </p>
              </CardHeader>
              <CardContent className="space-y-3">
                {[t("pricing.teamFeature1"), t("pricing.teamFeature2"), t("pricing.teamFeature3"), t("pricing.teamFeature4"), t("pricing.teamFeature5")].map(
                  (f, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <Check className="h-4 w-4 shrink-0 text-emerald-500" />{f}
                    </div>
                  )
                )}
                <Link href={`/${locale}/auth/signup`} className="block pt-4">
                  <Button variant="outline" className="w-full">{t("pricing.team")}</Button>
                </Link>
              </CardContent>
            </Card>
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ TRUST & SECURITY — Authority + Safety ═══ */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-5xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {t("trust.title")}
              </h2>
              <p className="mt-2 text-gray-500 dark:text-gray-400">{t("trust.subtitle")}</p>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>
          <ScrollReveal stagger className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3">
            {[
              { label: t("trust.gdpr"), desc: t("trust.gdprDesc"), icon: Shield },
              { label: t("trust.euData"), desc: t("trust.euDataDesc"), icon: Globe },
              { label: t("trust.aiAct"), desc: t("trust.aiActDesc"), icon: Scale },
              { label: t("trust.builtInGermany"), desc: t("trust.builtInGermanyDesc"), icon: ShieldCheck },
              { label: t("trust.rls"), desc: t("trust.rlsDesc"), icon: Lock },
              { label: t("trust.noTracking"), desc: t("trust.noTrackingDesc"), icon: Eye },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white/70 p-6 text-center dark:border-gray-800 dark:bg-gray-900/70 backdrop-blur-sm magnetic-hover transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                  <item.icon className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</span>
                <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ ENTERPRISE / B2B ═══ */}
      <section id="enterprise" className="px-4 py-24 sm:px-6 lg:px-8">
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

      {/* ═══ FAQ — Objection Handling + Cognitive Ease ═══ */}
      <section className="bg-gray-50 px-4 py-24 dark:bg-gray-900/50 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <ScrollReveal>
            <div className="text-center">
              <h2 className="text-3xl font-bold text-slate-800 dark:text-slate-300 sm:text-4xl">
                {t("faq.title")}
              </h2>
              <div className="mx-auto mt-3 section-divider" />
            </div>
          </ScrollReveal>

          <ScrollReveal stagger className="mt-12 space-y-4">
            {[
              { q: t("faq.q1"), a: t("faq.a1") },
              { q: t("faq.q2"), a: t("faq.a2") },
              { q: t("faq.q3"), a: t("faq.a3") },
              { q: t("faq.q4"), a: t("faq.a4") },
              { q: t("faq.q5"), a: t("faq.a5") },
              { q: t("faq.q6"), a: t("faq.a6") },
            ].map((faq, i) => (
              <details key={i} className="group rounded-2xl border border-gray-200/60 bg-white/70 dark:border-gray-800/60 dark:bg-gray-900/70 backdrop-blur-sm overflow-hidden">
                <summary className="flex cursor-pointer items-center justify-between p-5 text-sm font-semibold text-slate-800 dark:text-slate-300 select-none">
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-gray-400 transition-transform duration-200 group-open:rotate-180" />
                </summary>
                <div className="px-5 pb-5 text-sm leading-relaxed text-gray-500 dark:text-gray-400">
                  {faq.a}
                </div>
              </details>
            ))}
          </ScrollReveal>
        </div>
      </section>

      {/* ═══ FINAL CTA — Urgency + Zero-Risk ═══ */}
      <section className="bg-gray-900 px-4 py-24 dark:bg-gray-950 sm:px-6 lg:px-8">
        <ScrollReveal variant="scale" className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold text-white sm:text-4xl">
            {t("cta.title")}
          </h2>
          <p className="mt-4 text-lg text-gray-400">
            {t("cta.subtitle")}
          </p>
          <Link href={`/${locale}/verify`}>
            <Button
              size="xl"
              variant="success"
              className="mt-8 gap-2 shadow-lg shadow-emerald-500/25"
            >
              <FileSearch className="h-5 w-5" />
              {t("cta.button")}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        </ScrollReveal>
      </section>
    </div>
  );
}
