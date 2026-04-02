"use client";

import { useLocale } from "next-intl";
import { useRouter, usePathname } from "next/navigation";
import { routing, type Locale } from "@/i18n/routing";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

export function LocaleSwitcher() {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  const switchLocale = () => {
    const nextLocale: Locale =
      locale === "de" ? "en" : "de";

    // Replace the locale segment in the pathname
    const segments = pathname.split("/");
    if (routing.locales.includes(segments[1] as Locale)) {
      segments[1] = nextLocale;
    } else {
      segments.splice(1, 0, nextLocale);
    }
    router.push(segments.join("/"));
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={switchLocale}
      className="gap-1.5"
      aria-label={`Switch to ${locale === "de" ? "English" : "Deutsch"}`}
    >
      <Globe className="h-4 w-4" />
      <span className="text-xs font-medium uppercase">{locale === "de" ? "EN" : "DE"}</span>
    </Button>
  );
}
