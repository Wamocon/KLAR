"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import Link from "next/link";
import { Shield, Mail, Lock, User, AlertCircle, CheckCircle2, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const t = useTranslations("auth");
  const locale = useLocale();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("weakPassword"));
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName, locale },
        emailRedirectTo: `${window.location.origin}/api/auth/callback?locale=${locale}`,
      },
    });

    if (error) {
      setError(t("signupError"));
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
  };

  if (success) {
    return (
      <div className="relative flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark" />
        <div className="w-full max-w-md text-center animate-fade-in">
          <div className="glass dark:glass-dark rounded-3xl p-10 shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <h2 className="mt-6 text-xl font-bold text-gray-900 dark:text-white">
              {t("signupSuccess")}
            </h2>
            <p className="mt-3 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              {locale === "de"
                ? "Bitte überprüfen Sie Ihre E-Mail und klicken Sie auf den Bestätigungslink."
                : "Please check your email and click the confirmation link."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const inputClasses = "pl-10 h-11 rounded-xl border-gray-200/80 bg-white/50 backdrop-blur-sm dark:border-gray-700/80 dark:bg-gray-900/50 focus:ring-2 focus:ring-emerald-500/20";

  return (
    <div className="relative flex min-h-[calc(100vh-12rem)] items-center justify-center px-4 py-12 overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark" />
      <div className="absolute top-1/3 right-[10%] -z-10 h-72 w-72 animate-float rounded-full bg-gradient-to-br from-emerald-400/20 to-teal-500/10 blur-[80px]" />
      <div className="absolute bottom-1/4 left-[10%] -z-10 h-64 w-64 animate-float-delayed rounded-full bg-gradient-to-tr from-blue-400/15 to-emerald-300/15 blur-[70px]" />

      <div className="w-full max-w-md animate-fade-in">
        <div className="glass dark:glass-dark rounded-3xl p-8 shadow-2xl shadow-emerald-900/5">
          {/* Logo */}
          <div className="mb-8 text-center">
            <Link href={`/${locale}`} className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 transition-transform hover:scale-105">
              <Shield className="h-7 w-7" />
            </Link>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t("signupTitle")}
            </h2>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {t("hasAccount")}{" "}
              <Link
                href={`/${locale}/auth/login`}
                className="font-semibold text-emerald-600 hover:text-emerald-500 dark:text-emerald-400"
              >
                {t("loginLink")}
              </Link>
            </p>
          </div>

          <form onSubmit={handleSignup} className="space-y-5">
            <div>
              <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {locale === "de" ? "Vollständiger Name" : "Full name"}
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="name" type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} className={inputClasses} autoComplete="name" />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("email")}
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClasses} required autoComplete="email" />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("password")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className={`${inputClasses} pr-10`} required minLength={8} autoComplete="new-password" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {t("confirmPassword")}
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <Input id="confirmPassword" type={showConfirm ? "text" : "password"} placeholder="••••••••" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className={`${inputClasses} pr-10`} required minLength={8} autoComplete="new-password" />
                <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" tabIndex={-1}>
                  {showConfirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
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
              {t("signupButton")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
