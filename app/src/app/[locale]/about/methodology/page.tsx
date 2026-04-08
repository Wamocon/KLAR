import { setRequestLocale } from "next-intl/server";
import Link from "next/link";
import {
  Shield, Search, Brain, Database, CheckCircle2, AlertTriangle,
  Globe, Layers, ArrowRight, FileSearch, Eye, Copy, BarChart3,
  Cpu, Server, Lock, Zap,
} from "lucide-react";
import { ScrollReveal } from "@/components/ui/scroll-reveal";

export default async function MethodologyPage({
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
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 mb-4">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
            {isDE ? "Methodik & Vertrauenswurdigkeit" : "Methodology & Trust"}
          </h1>
          <p className="mt-4 text-lg text-gray-600 dark:text-gray-400 leading-relaxed max-w-2xl mx-auto">
            {isDE
              ? "Wie KLAR Ergebnisse verifiziert, welche Quellen genutzt werden, und warum Sie unseren Resultaten vertrauen konnen."
              : "How KLAR verifies results, which sources are used, and why you can trust our verdicts."}
          </p>
        </div>

        {/* Section 1: The Verification Pipeline */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-300 mb-6 flex items-center gap-3">
              <Layers className="h-6 w-6 text-emerald-500" />
              {isDE ? "Die Verifizierungs-Pipeline" : "The Verification Pipeline"}
            </h2>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-6 space-y-6">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {isDE
                  ? "KLAR verwendet kein einzelnes KI-Modell, das rdt. Stattdessen durchlduft jeder Text eine mehrstufige Pipeline mit unabhdngigen Prufschritten:"
                  : "KLAR does not use a single AI model that guesses. Instead, every text goes through a multi-stage pipeline with independent verification steps:"}
              </p>
              
              <div className="space-y-4">
                {[
                  {
                    step: "1",
                    icon: FileSearch,
                    title: isDE ? "Behauptungen extrahieren" : "Claim Extraction",
                    desc: isDE
                      ? "Google Gemini 2.5 Flash identifiziert jede faktische Aussage im Text als einzelne, uberprufbare Behauptung. Meinungen, Fragen und subjektive Aussagen werden bewusst ausgelassen."
                      : "Google Gemini 2.5 Flash identifies every factual statement in the text as a single, verifiable claim. Opinions, questions, and subjective statements are deliberately skipped.",
                  },
                  {
                    step: "2",
                    icon: Search,
                    title: isDE ? "Quellen durchsuchen" : "Evidence Search",
                    desc: isDE
                      ? "Fur jede Behauptung werden parallel 4 Quellensysteme durchsucht: Wikipedia, Wikidata, Google Search Grounding (Live-Websuche), und unsere kuratierte Wissensdatenbank. 3-10 Quellen pro Behauptung."
                      : "For each claim, 4 source systems are searched in parallel: Wikipedia, Wikidata, Google Search Grounding (live web search), and our curated knowledge base. 3-10 sources per claim.",
                  },
                  {
                    step: "3",
                    icon: Brain,
                    title: isDE ? "KI-Bewertung mit Quellen" : "AI Judgment with Sources",
                    desc: isDE
                      ? "Ein zweiter KI-Durchlauf vergleicht jede Behauptung mit den gefundenen Quellen und trifft ein Urteil: Bestdtigt, Widerlegt oder Nicht uberprufbar. Jedes Urteil enthalt eine Begrundung und konkrete Handlungsempfehlung."
                      : "A second AI pass compares each claim against found sources and renders a verdict: Supported, Contradicted, or Unverifiable. Every verdict includes reasoning and a specific actionable recommendation.",
                  },
                  {
                    step: "4",
                    icon: CheckCircle2,
                    title: isDE ? "Kreuzvalidierung" : "Cross-Validation",
                    desc: isDE
                      ? "NLP-Algorithmen prufen Quellkonsens, erkennen Halluzinationsrisiken und passen Konfidenzwerte basierend auf Quellenubereinstimmung an."
                      : "NLP algorithms check source consensus, detect hallucination risks, and adjust confidence scores based on source agreement.",
                  },
                ].map(({ step, icon: Icon, title, desc }) => (
                  <div key={step} className="flex gap-4">
                    <div className="flex-shrink-0 flex items-start">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                        {step}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {title}
                      </h3>
                      <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Section 2: Source of Truth */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-300 mb-6 flex items-center gap-3">
              <Database className="h-6 w-6 text-emerald-500" />
              {isDE ? "Quellen der Wahrheit (Source of Truth)" : "Source of Truth"}
            </h2>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-6 space-y-6">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {isDE
                  ? "KLAR nutzt ausschlieBlich externe, offentlich zugdngliche Quellen. Die KI erfindet keine Informationen — sie kann nur bestdtigen oder widerlegen, was in echten Quellen steht."
                  : "KLAR exclusively uses external, publicly accessible sources. The AI does not invent information — it can only confirm or contradict what exists in real sources."}
              </p>

              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    title: "Wikipedia & Wikidata",
                    score: "0.85-0.90",
                    desc: isDE ? "Enzyklopddische Fakten, Daten, Definitionen" : "Encyclopedic facts, dates, definitions",
                    color: "emerald",
                  },
                  {
                    title: isDE ? "Google Search Grounding" : "Google Search Grounding",
                    score: "Live",
                    desc: isDE ? "Echtzeit-Websuche uber Googles Infrastruktur" : "Real-time web search via Google's infrastructure",
                    color: "blue",
                  },
                  {
                    title: isDE ? "Akademische Quellen" : "Academic Sources",
                    score: "0.80-0.95",
                    desc: isDE ? "Nature, PubMed, arXiv, JSTOR, Springer" : "Nature, PubMed, arXiv, JSTOR, Springer",
                    color: "violet",
                  },
                  {
                    title: isDE ? "Regierungsquellen" : "Government Sources",
                    score: "0.85-0.92",
                    desc: isDE ? "WHO, EU, Destatis, Bundesregierung, CDC" : "WHO, EU, Destatis, Federal Government, CDC",
                    color: "amber",
                  },
                  {
                    title: isDE ? "Faktenprufungsorganisationen" : "Fact-Checking Orgs",
                    score: "0.90-0.92",
                    desc: isDE ? "Correctiv, Snopes, Politifact, AFP" : "Correctiv, Snopes, Politifact, AFP Fact Check",
                    color: "rose",
                  },
                  {
                    title: isDE ? "Nachrichtenagenturen" : "News Agencies",
                    score: "0.78-0.88",
                    desc: isDE ? "Reuters, AP, BBC, Tagesschau, Spiegel" : "Reuters, AP, BBC, Tagesschau, Spiegel",
                    color: "slate",
                  },
                ].map(({ title, score, desc, color }) => (
                  <div key={title} className={`rounded-xl border border-${color}-200/60 dark:border-${color}-800/60 bg-${color}-50/20 dark:bg-${color}-900/10 p-4`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300">{title}</h4>
                      <span className="text-xs font-mono text-gray-500">{score}</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-xl bg-amber-50/80 dark:bg-amber-900/10 border border-amber-200/60 dark:border-amber-800/30 p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-amber-800 dark:text-amber-300">
                      {isDE ? "Wie unterscheiden wir serlose von unseriosen Quellen?" : "How do we distinguish reliable from unreliable sources?"}
                    </h4>
                    <p className="mt-1 text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                      {isDE
                        ? "Jede Quelle erhalt einen Vertrauenswert (0-1.0) basierend auf: Domain-Kategorie (akademisch, Regierung, Nachrichten, Social Media, Blog), historischer Zuverldssigkeit, und Quellenvielfalt. Social Media (Twitter, Reddit) und Blogs erhalten niedrige Werte (0.15-0.45). Boulevardmedien wie Bild werden deutlich niedriger bewertet als Qualitdtsjournalismus."
                        : "Every source receives a credibility score (0-1.0) based on: domain category (academic, government, news, social media, blog), historical reliability, and source diversity. Social media (Twitter, Reddit) and blogs receive low scores (0.15-0.45). Tabloid media like Bild are scored significantly lower than quality journalism."}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Section 3: AI Model Transparency */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-300 mb-6 flex items-center gap-3">
              <Cpu className="h-6 w-6 text-emerald-500" />
              {isDE ? "KI-Modell-Transparenz" : "AI Model Transparency"}
            </h2>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-6 space-y-6">
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-300">
                    {isDE ? "Welches KI-Modell wird verwendet?" : "Which AI model is used?"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {isDE
                      ? "KLAR nutzt Google Gemini 2.5 Flash — ein vorhandenes Large Language Model von Google. Wir haben KEIN eigenes Modell trainiert. Stattdessen nutzen wir fortgeschrittenes Prompt Engineering mit strukturierten JSON-Schemas, um prazise und konsistente Ergebnisse zu erzielen."
                      : "KLAR uses Google Gemini 2.5 Flash — an existing Large Language Model by Google. We have NOT trained a custom model. Instead, we use advanced prompt engineering with structured JSON schemas to achieve precise and consistent results."}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-300">
                    {isDE ? "Das Halluzinations-Paradoxon" : "The Hallucination Paradox"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {isDE
                      ? "Kann eine KI Halluzinationen erkennen, wenn sie selbst halluzinieren kann? Unsere Losung: Die KI wird NICHT gebeten, Fakten zu wissen. Sie wird gebeten, Behauptungen gegen EXTERNE Quellen zu vergleichen. Die Gemini Search Grounding greift auf Live-Webdaten zu — die KI muss nichts aus dem Gedachtnis abrufen. Zusatzlich prufen NLP-Algorithmen (keine KI) auf Halluzinationsrisiken im KI-Output."
                      : "Can an AI detect hallucinations if it can hallucinate itself? Our solution: The AI is NOT asked to know facts. It is asked to compare claims against EXTERNAL sources. Gemini Search Grounding accesses live web data — the AI doesn't need to recall anything from memory. Additionally, NLP algorithms (not AI) check for hallucination risks in the AI output."}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-300">
                    {isDE ? "Was NICHT von KI durchgefuhrt wird" : "What is NOT done by AI"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {isDE
                      ? "Bias-Erkennung, KI-Erkennung und Plagiatsprufung verwenden statistische NLP-Algorithmen — keine KI-Aufrufe. Diese Engines analysieren Sprachmuster, Satzstruktur und Textdhnlichkeit mit deterministischen Methoden. Sie konnen nicht halluzinieren."
                      : "Bias detection, AI detection, and plagiarism checking use statistical NLP algorithms — no AI calls. These engines analyze language patterns, sentence structure, and text similarity using deterministic methods. They cannot hallucinate."}
                  </p>
                </div>

                <div>
                  <h3 className="font-semibold text-slate-800 dark:text-slate-300">
                    {isDE ? "Token-Transparenz" : "Token Transparency"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                    {isDE
                      ? "Jede Analyse zeigt den geschdtzten und tatsachlichen Token-Verbrauch an. Sie konnen genau sehen, wie viele Tokens fur Ihre Analyse verwendet wurden — vollstandige Kostentransparenz."
                      : "Every analysis displays the estimated and actual token consumption. You can see exactly how many tokens were used for your analysis — complete cost transparency."}
                  </p>
                </div>
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* Section 4: Plagiarism Database */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-300 mb-6 flex items-center gap-3">
              <Copy className="h-6 w-6 text-emerald-500" />
              {isDE ? "Plagiatsdatenbank" : "Plagiarism Database"}
            </h2>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-6">
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
                {isDE
                  ? "Die Plagiatsprufung vergleicht N-Gramme (4-Wort- und 6-Wort-Sequenzen) des eingegebenen Textes gegen die Quellen, die wahrend der Verifizierung gefunden wurden. Es handelt sich NICHT um eine Datenbank aller akademischen Arbeiten (wie bei Turnitin). Stattdessen wird gepruft, ob der Text substanzielle Ubereinstimmungen mit den verwendeten Web-Quellen aufweist. Der Originalitdtsprozentsatz zeigt, wie viel des Textes einzigartig ist."
                  : "The plagiarism check compares n-grams (4-word and 6-word sequences) of the input text against sources found during verification. It is NOT a database of all academic papers (like Turnitin). Instead, it checks whether the text has substantial overlap with the web sources used. The originality percentage shows how much of the text is unique."}
              </p>
            </div>
          </section>
        </ScrollReveal>

        {/* Section 5: Security & Data */}
        <ScrollReveal>
          <section className="mb-16">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-300 mb-6 flex items-center gap-3">
              <Lock className="h-6 w-6 text-emerald-500" />
              {isDE ? "Sicherheit & Datenschutz" : "Security & Data Protection"}
            </h2>
            <div className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 p-6">
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  {
                    icon: Server,
                    title: isDE ? "EU-Datenhaltung" : "EU Data Hosting",
                    desc: isDE ? "Alle Daten in Frankfurt, Deutschland (Supabase EU)" : "All data in Frankfurt, Germany (Supabase EU)",
                  },
                  {
                    icon: Lock,
                    title: "Row Level Security",
                    desc: isDE ? "Jeder Nutzer sieht nur seine eigenen Daten" : "Each user only sees their own data",
                  },
                  {
                    icon: Shield,
                    title: isDE ? "DSGVO-konform" : "GDPR Compliant",
                    desc: isDE ? "Art. 17 (Loschen) & Art. 20 (Export) implementiert" : "Art. 17 (deletion) & Art. 20 (export) implemented",
                  },
                  {
                    icon: Zap,
                    title: isDE ? "Kein Tracking" : "No Tracking",
                    desc: isDE ? "Keine Cookies, keine Analytics, kein Datenverkauf" : "No cookies, no analytics, no data selling",
                  },
                ].map(({ icon: Icon, title, desc }) => (
                  <div key={title} className="flex items-start gap-3">
                    <Icon className="h-5 w-5 text-emerald-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-300">{title}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </ScrollReveal>

        {/* CTA */}
        <ScrollReveal>
          <div className="text-center">
            <Link
              href={`/${locale}/verify`}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-3 text-white font-medium shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all"
            >
              <FileSearch className="h-4 w-4" />
              {isDE ? "Jetzt Text verifizieren" : "Verify text now"}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
}
