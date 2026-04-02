import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { KlarLogo } from "@/components/ui/klar-logo";

export function Footer() {
  const t = useTranslations("footer");
  const locale = useLocale();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-20 border-t border-gray-200/50 bg-white/50 backdrop-blur-2xl dark:border-gray-800/50 dark:bg-gray-950/50">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent dark:via-emerald-400/20"></div>
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 md:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="space-y-6">
            <div className="flex items-center gap-2.5">
              <KlarLogo size={32} />
              <span className="text-lg font-bold bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                KLAR
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t("description")}
            </p>
          </div>

          {/* Product */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("product")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/${locale}/verify`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {locale === "de" ? "Verifizieren" : "Verify"}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}#pricing`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {locale === "de" ? "Preise" : "Pricing"}
                </Link>
              </li>
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("company")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/${locale}/about`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/contact`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("contact")}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              {t("legal")}
            </h3>
            <ul className="space-y-2">
              <li>
                <Link
                  href={`/${locale}/privacy`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("privacy")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/terms`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("terms")}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/imprint`}
                  className="text-sm text-gray-500 transition-colors hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                >
                  {t("imprint")}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-gray-200 pt-8 dark:border-gray-800">
          <p className="text-center text-xs text-gray-400 dark:text-gray-500">
            {t("copyright", { year })}
          </p>
        </div>
      </div>
    </footer>
  );
}
