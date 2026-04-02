"use client";

import Link from "next/link";
import { useLocale, useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import {
  Menu,
  X,
  LayoutDashboard,
  History,
  FileSearch,
  LogIn,
  LogOut,
  Zap,
  Settings,
  Trophy,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "./theme-toggle";
import { LocaleSwitcher } from "./locale-switcher";
import { KlarLogo } from "@/components/ui/klar-logo";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = `/${locale}`;
  };

  const navLinks = user
    ? [
        { href: `/${locale}/verify`, label: t("verify"), icon: FileSearch },
        { href: `/${locale}/dashboard`, label: t("dashboard"), icon: LayoutDashboard },
        { href: `/${locale}/history`, label: t("history"), icon: History },
        { href: `/${locale}/compliance`, label: locale === "de" ? "Compliance" : "Compliance", icon: Shield },
        { href: `/${locale}/benchmark`, label: locale === "de" ? "Benchmark" : "Benchmark", icon: Trophy },
        { href: `/${locale}/settings`, label: locale === "de" ? "Einstellungen" : "Settings", icon: Settings },
        { href: `/${locale}/tools`, label: "Tools", icon: Zap },
      ]
    : [
        { href: `/${locale}/benchmark`, label: locale === "de" ? "Benchmark" : "Benchmark", icon: Trophy },
        { href: `/${locale}/tools`, label: "Tools", icon: Zap },
      ];

  const isActive = (href: string) => pathname === href;

  return (
    <header className="sticky top-0 z-50 w-full glass dark:glass-dark transition-all duration-300">
      {/* Skip to content link for keyboard/screen reader users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[60] focus:rounded-lg focus:bg-emerald-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
      >
        {locale === "de" ? "Zum Inhalt springen" : "Skip to main content"}
      </a>
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          href={`/${locale}`}
          className="group flex items-center gap-2.5 transition-opacity hover:opacity-90"
        >
          <KlarLogo size={32} className="transition-transform group-hover:scale-105" />
          <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
            KLAR
          </span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden items-center gap-2 md:flex" aria-label="Main navigation">
          {navLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              <Button
                variant={isActive(link.href) ? "secondary" : "ghost"}
                size="sm"
                className="gap-1.5"
              >
                <link.icon className="h-4 w-4" />
                {link.label}
              </Button>
            </Link>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden items-center gap-1 md:flex">
          <LocaleSwitcher />
          <ThemeToggle />
          {user ? (
            <Button variant="ghost" size="sm" onClick={handleLogout} className="gap-1.5">
              <LogOut className="h-4 w-4" />
              {t("logout")}
            </Button>
          ) : (
            <Link href={`/${locale}/auth/login`}>
              <Button variant="default" size="sm" className="gap-1.5">
                <LogIn className="h-4 w-4" />
                {t("login")}
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Menu Toggle */}
        <div className="flex items-center gap-1 md:hidden">
          <LocaleSwitcher />
          <ThemeToggle />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Menu"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="border-t border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950 md:hidden">
          <nav className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Button
                  variant={isActive(link.href) ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Button>
              </Link>
            ))}
            <div className="mt-2 border-t border-gray-200 pt-2 dark:border-gray-800">
              {user ? (
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2"
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                >
                  <LogOut className="h-4 w-4" />
                  {t("logout")}
                </Button>
              ) : (
                <Link
                  href={`/${locale}/auth/login`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="default" className="w-full gap-2">
                    <LogIn className="h-4 w-4" />
                    {t("login")}
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
