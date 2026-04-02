import { setRequestLocale } from "next-intl/server";

export default async function TermsPage({
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
          {isDE ? "Nutzungsbedingungen" : "Terms of Service"}
        </h1>
        <p className="mb-8 text-sm text-gray-500 dark:text-gray-400">
          {isDE ? "Zuletzt aktualisiert: Januar 2025" : "Last updated: January 2025"}
        </p>

        <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "1. Nutzung des Dienstes" : "1. Use of Service"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "KLAR bietet KI-gestützte Faktenprüfung als Hilfsmittel an. Unsere Ergebnisse dienen als Orientierung und ersetzen keine professionelle Recherche."
                : "KLAR provides AI-powered fact-checking as an assistive tool. Our results serve as guidance and do not replace professional research."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "2. Kontoregistrierung" : "2. Account Registration"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Sie sind für die Sicherheit Ihres Kontos verantwortlich. Verwenden Sie ein starkes Passwort und teilen Sie Ihre Zugangsdaten mit niemandem."
                : "You are responsible for the security of your account. Use a strong password and do not share your credentials with anyone."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "3. Nutzungsgrenzen" : "3. Usage Limits"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Der kostenlose Plan erlaubt bis zu 10 Verifizierungen pro Monat. Höhere Limits sind mit dem Pro- oder Team-Plan verfügbar."
                : "The free plan allows up to 10 verifications per month. Higher limits are available with the Pro or Team plan."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "4. Haftungsausschluss" : "4. Disclaimer"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "KLAR liefert KI-gestützte Analysen ohne Gewähr auf Vollständigkeit oder Richtigkeit. Nutzer sollten Ergebnisse stets kritisch bewerten."
                : "KLAR provides AI-powered analysis without guarantee of completeness or accuracy. Users should always critically evaluate results."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "5. Geistiges Eigentum" : "5. Intellectual Property"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Der KLAR-Dienst und seine Inhalte sind urheberrechtlich geschützt. Die von Ihnen eingereichten Texte verbleiben in Ihrem Eigentum."
                : "The KLAR service and its content are protected by copyright. Text you submit remains your property."}
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {isDE ? "6. Kündigung" : "6. Termination"}
            </h2>
            <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
              {isDE
                ? "Sie können Ihr Konto jederzeit über die Einstellungen löschen. Alle Daten werden gemäß unserer Datenschutzerklärung entfernt."
                : "You may delete your account at any time through the settings page. All data will be removed according to our privacy policy."}
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
