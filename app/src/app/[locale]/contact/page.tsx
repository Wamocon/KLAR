import { setRequestLocale } from "next-intl/server";
import { Mail, MapPin, Clock } from "lucide-react";

export default async function ContactPage({
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
          {isDE ? "Kontakt" : "Contact"}
        </h1>

        <p className="mb-10 text-lg text-gray-600 dark:text-gray-400 leading-relaxed">
          {isDE
            ? "Haben Sie Fragen, Feedback oder benötigen Sie Unterstützung? Wir sind gerne für Sie da."
            : "Have questions, feedback, or need support? We're happy to help."}
        </p>

        <div className="grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: Mail,
              title: isDE ? "E-Mail" : "Email",
              detail: "support@klar.ai",
              desc: isDE ? "Antwort innerhalb von 24 Stunden" : "Response within 24 hours",
            },
            {
              icon: MapPin,
              title: isDE ? "Standort" : "Location",
              detail: isDE ? "Frankfurt, Deutschland" : "Frankfurt, Germany",
              desc: isDE ? "EU-basiert, DSGVO-konform" : "EU-based, GDPR compliant",
            },
            {
              icon: Clock,
              title: isDE ? "Geschäftszeiten" : "Business Hours",
              detail: isDE ? "Mo–Fr, 9–18 Uhr MEZ" : "Mon–Fri, 9 AM–6 PM CET",
              desc: isDE ? "Außer an deutschen Feiertagen" : "Except German public holidays",
            },
          ].map(({ icon: Icon, title, detail, desc }) => (
            <div
              key={title}
              className="rounded-2xl border border-gray-200/60 dark:border-gray-800/60 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm p-6 text-center"
            >
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                <Icon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="mb-1 font-semibold text-slate-800 dark:text-slate-300">{title}</h3>
              <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">{detail}</p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
