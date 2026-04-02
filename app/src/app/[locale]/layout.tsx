import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { routing } from "@/i18n/routing";
import { Providers } from "@/components/providers";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { ToastProvider } from "@/components/ui/toast";

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://klar.ai";
  const altLocale = locale === "de" ? "en" : "de";

  return {
    title: `KLAR — ${t("tagline")}`,
    description: t("subtitle"),
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        [locale]: `${baseUrl}/${locale}`,
        [altLocale]: `${baseUrl}/${altLocale}`,
        "x-default": `${baseUrl}/en`,
      },
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);

  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <Providers>
      <NextIntlClientProvider locale={locale} messages={messages}>
        <ToastProvider>
          <Header />
          <main id="main-content" className="flex-1">{children}</main>
          <Footer />
        </ToastProvider>
      </NextIntlClientProvider>
    </Providers>
  );
}
