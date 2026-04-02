import { setRequestLocale } from "next-intl/server";

export default async function ImprintPage({
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
      <div className="mx-auto max-w-3xl animate-fade-in px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-6 text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
          {isDE ? "Impressum" : "Imprint"}
        </h1>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "Angaben gemäß § 5 TMG" : "Information according to § 5 TMG"}
            </h2>
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <p className="font-medium">KLAR — Knowledge Legitimacy Audit & Review</p>
              <p>Frankfurt am Main</p>
              <p>{isDE ? "Deutschland" : "Germany"}</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "Kontakt" : "Contact"}
            </h2>
            <div className="text-gray-600 dark:text-gray-400 leading-relaxed space-y-1">
              <p>E-Mail: legal@klar.ai</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "Haftungsausschluss" : "Disclaimer"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Trotz sorgfältiger inhaltlicher Kontrolle übernehmen wir keine Haftung für die Inhalte externer Links. Für den Inhalt der verlinkten Seiten sind ausschließlich deren Betreiber verantwortlich."
                : "Despite careful content control, we assume no liability for the content of external links. The operators of the linked pages are solely responsible for their content."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "Streitschlichtung" : "Dispute Resolution"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit: https://ec.europa.eu/consumers/odr"
                : "The European Commission provides a platform for online dispute resolution (ODR): https://ec.europa.eu/consumers/odr"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
