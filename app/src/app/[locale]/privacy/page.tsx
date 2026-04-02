import { setRequestLocale } from "next-intl/server";

export default async function PrivacyPage({
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
        <h1 className="mb-6 text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
          {isDE ? "Datenschutzerklärung" : "Privacy Policy"}
        </h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          {isDE ? "Zuletzt aktualisiert: Januar 2025" : "Last updated: January 2025"}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "1. Verantwortlicher" : "1. Data Controller"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Verantwortlich für die Datenverarbeitung ist KLAR (Knowledge Legitimacy Audit & Review), Frankfurt am Main, Deutschland."
                : "The data controller is KLAR (Knowledge Legitimacy Audit & Review), Frankfurt am Main, Germany."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "2. Erhobene Daten" : "2. Data We Collect"}
            </h2>
            <ul className="list-disc pl-6 text-gray-600 dark:text-gray-400 space-y-2">
              <li>{isDE ? "E-Mail-Adresse und Passwort (bei Registrierung)" : "Email address and password (upon registration)"}</li>
              <li>{isDE ? "Von Ihnen übermittelte Texte zur Verifizierung" : "Text content you submit for verification"}</li>
              <li>{isDE ? "Verifizierungsergebnisse und Berichte" : "Verification results and reports"}</li>
              <li>{isDE ? "Nutzungsstatistiken (anonymisiert)" : "Usage statistics (anonymized)"}</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "3. Zweck der Datenverarbeitung" : "3. Purpose of Data Processing"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Wir verarbeiten Ihre Daten ausschließlich zur Bereitstellung unserer Faktenprüfungsdienste, zur Verbesserung der Servicequalität und zur Einhaltung gesetzlicher Pflichten."
                : "We process your data solely to provide our fact-checking services, improve service quality, and comply with legal obligations."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "4. Datenspeicherung" : "4. Data Storage"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Alle Daten werden auf Servern in der EU (Frankfurt) gemäß DSGVO gespeichert. Wir verwenden Supabase als Datenbankinfrastruktur mit Verschlüsselung im Ruhezustand."
                : "All data is stored on EU servers (Frankfurt) in compliance with GDPR. We use Supabase as our database infrastructure with encryption at rest."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "5. Ihre Rechte" : "5. Your Rights"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Datenübertragbarkeit. Nutzen Sie die Kontoeinstellungen zum Exportieren oder Löschen Ihrer Daten."
                : "You have the right to access, rectify, delete, and port your data. Use the account settings page to export or delete your data."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-300">
              {isDE ? "6. Kontakt" : "6. Contact"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Bei Fragen zum Datenschutz kontaktieren Sie uns unter: privacy@klar.ai"
                : "For privacy-related inquiries, contact us at: privacy@klar.ai"}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
