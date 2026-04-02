"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(t("loginError"));
      setLoading(false);
      return;
    }

    router.push(`/${locale}/dashboard`);
  };

  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark" />
      <div className="absolute top-1/4 left-[15%] -z-10 h-72 w-72 animate-float rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/10 blur-[80px]" />
      <div className="absolute bottom-1/3 right-[15%] -z-10 h-64 w-64 animate-float-delayed rounded-full bg-gradient-to-tr from-blue-400/15 to-emerald-300/15 blur-[70px]" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="glass dark:glass-dark rounded-3xl p-8 shadow-2xl shadow-emerald-900/5">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href={`/${locale}`} className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105">
              <Shield className="h-7 w-7" />
            </Link>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("loginTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("noAccount")}{" "}
              <Link
                href={`/${locale}/auth/signup`}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                {t("signupLink")}
              </Link>
            </p>
          </div>

          {/* Email/Password Login */}
          <form onSubmit={handleEmailLogin} className="space-y-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10 h-11 rounded-xl border-gray-200/80 bg-white/50 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10 pr-10 h-11 rounded-xl border-gray-200/80 bg-white/50 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20"
                  required
                  minLength={8}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <div className="mt-1.5 text-right">
                <button
                  type="button"
                  onClick={async () => {
                    if (!email) {
                      setError(t("forgotPasswordEnterEmail"));
                      return;
                    }
                    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
                      redirectTo: `${window.location.origin}/${locale}/auth/login`,
                    });
                    if (resetError) {
                      setError(resetError.message);
                    } else {
                      setError("");
                      alert(locale === "de" ? "Passwort-Reset-Link wurde per E-Mail gesendet." : "Password reset link sent to your email.");
                    }
                  }}
                  className="text-xs text-emerald-600 hover:text-emerald-500 dark:text-emerald-400 hover:underline"
                >
                  {t("forgotPassword")}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50/80 p-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400 backdrop-blur-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white font-semibold shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 transition-all duration-300 hover:from-emerald-600 hover:to-teal-700"
              isLoading={loading}
            >
              {t("loginButton")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
