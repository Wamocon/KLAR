"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  User, Download, Trash2, AlertTriangle, Loader2,
  Key, Plus, Copy, Check, Eye, EyeOff, Building2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";
import type { Profile, ApiKey } from "@/types";

export default function SettingsPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _t = useTranslations("common");
  const locale = useLocale();
  const router = useRouter();
  const supabase = createClient();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // API Keys state
  const [apiKeys, setApiKeys] = useState<Pick<ApiKey, "id" | "name" | "key_prefix" | "scopes" | "rate_limit_per_minute" | "total_requests" | "last_used_at" | "expires_at" | "is_active" | "created_at">[]>([]);
  const [showCreateKey, setShowCreateKey] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(["verify"]);
  const [newKeyExpiry, setNewKeyExpiry] = useState<number | "">(90);
  const [creatingKey, setCreatingKey] = useState(false);
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const canCreateKeys = profile && ["pro", "team", "enterprise"].includes(profile.plan);

  const loadApiKeys = useCallback(async () => {
    try {
      const res = await fetch("/api/keys");
      if (res.ok) {
        const data = await res.json();
        setApiKeys(data.keys || []);
      }
    } catch {
      // Silent
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push(`/${locale}/auth/login`);
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
      setLoading(false);
    };
    load();
    loadApiKeys();
  }, [supabase, locale, router, loadApiKeys]);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch("/api/account");
      if (res.ok) {
        const data = await res.json();
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `klar-data-export-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch {
      // Silent fail
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    if (deleteText !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (res.ok) {
        await supabase.auth.signOut();
        router.push(`/${locale}`);
      }
    } catch {
      setDeleting(false);
    }
  };

  const handleCreateKey = async () => {
    if (!newKeyName.trim() || newKeyScopes.length === 0) return;
    setCreatingKey(true);
    try {
      const res = await fetch("/api/keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newKeyName.trim(),
          scopes: newKeyScopes,
          expires_in_days: newKeyExpiry || undefined,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewRawKey(data.raw_key);
        setNewKeyName("");
        setNewKeyScopes(["verify"]);
        setNewKeyExpiry(90);
        await loadApiKeys();
      }
    } catch {
      // Silent
    } finally {
      setCreatingKey(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    try {
      const res = await fetch(`/api/keys?id=${keyId}`, { method: "DELETE" });
      if (res.ok) {
        await loadApiKeys();
      }
    } catch {
      // Silent
    }
  };

  const handleCopyKey = async (key: string) => {
    await navigator.clipboard.writeText(key);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setNewKeyScopes((prev) =>
      prev.includes(scope)
        ? prev.filter((s) => s !== scope)
        : [...prev, scope]
    );
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-40" />

      <div className="mx-auto max-w-2xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
          {locale === "de" ? "Kontoeinstellungen" : "Account Settings"}
        </h1>

        {/* Profile Info */}
        <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User className="h-4 w-4" />
              {locale === "de" ? "Profil" : "Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Email</span>
              <span className="font-medium">{profile?.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">{locale === "de" ? "Plan" : "Plan"}</span>
              <span className="font-medium capitalize">{profile?.plan || "free"}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {locale === "de" ? "Verifizierungen diesen Monat" : "Verifications this month"}
              </span>
              <span className="font-medium">{profile?.monthly_verification_count || 0}</span>
            </div>
          </CardContent>
        </Card>

        {/* Data Export (GDPR Article 20) */}
        <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4" />
              {locale === "de" ? "Datenexport" : "Data Export"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {locale === "de"
                ? "Laden Sie eine vollständige Kopie aller Ihrer Daten herunter (DSGVO Art. 20)."
                : "Download a complete copy of all your data (GDPR Article 20)."}
            </p>
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={exporting}
              isLoading={exporting}
              className="gap-2 rounded-xl"
            >
              <Download className="h-4 w-4" />
              {locale === "de" ? "Daten exportieren (JSON)" : "Export Data (JSON)"}
            </Button>
          </CardContent>
        </Card>

        {/* API Keys Management */}
        <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center justify-between text-base">
              <span className="flex items-center gap-2">
                <Key className="h-4 w-4" />
                {locale === "de" ? "API-Schlüssel" : "API Keys"}
              </span>
              {canCreateKeys && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowCreateKey(!showCreateKey); setNewRawKey(null); }}
                  className="gap-1 rounded-lg text-xs"
                >
                  <Plus className="h-3 w-3" />
                  {locale === "de" ? "Neu" : "New"}
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!canCreateKeys && (
              <p className="text-sm text-gray-500">
                {locale === "de"
                  ? "API-Schlüssel sind ab dem Pro-Plan verfügbar."
                  : "API keys are available on Pro plans and above."}
              </p>
            )}

            {/* New key display (shown once after creation) */}
            {newRawKey && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                <div className="flex items-start gap-2 mb-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                  <p className="text-sm font-medium text-emerald-700 dark:text-emerald-400">
                    {locale === "de"
                      ? "Speichern Sie diesen Schlüssel sicher. Er wird nicht erneut angezeigt."
                      : "Save this key securely. It will not be shown again."}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded bg-gray-900 px-3 py-2 text-xs font-mono text-emerald-400 overflow-x-auto">
                    {showKey ? newRawKey : "klar_••••••••_••••••••••••••••••••••••"}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowKey(!showKey)}
                    className="shrink-0"
                  >
                    {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyKey(newRawKey)}
                    className="shrink-0"
                  >
                    {copiedKey ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            )}

            {/* Create key form */}
            {showCreateKey && !newRawKey && (
              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800 space-y-3">
                <input
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder={locale === "de" ? "Schlüsselname (z.B. Chrome-Extension)" : "Key name (e.g. Chrome Extension)"}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900 focus:ring-2 focus:ring-blue-500/20"
                  maxLength={100}
                />
                <div>
                  <p className="mb-2 text-xs text-gray-500">
                    {locale === "de" ? "Berechtigungen:" : "Scopes:"}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {["verify", "batch", "export", "compliance"].map((scope) => (
                      <button
                        key={scope}
                        onClick={() => toggleScope(scope)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          newKeyScopes.includes(scope)
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                            : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {scope}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 shrink-0">
                    {locale === "de" ? "Ablauf (Tage):" : "Expires (days):"}
                  </label>
                  <input
                    type="number"
                    value={newKeyExpiry}
                    onChange={(e) => setNewKeyExpiry(e.target.value ? parseInt(e.target.value) : "")}
                    min={1}
                    max={365}
                    className="w-20 rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm dark:border-gray-800 dark:bg-gray-900"
                  />
                  <span className="text-xs text-gray-400">
                    {locale === "de" ? "(leer = kein Ablauf)" : "(empty = no expiry)"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleCreateKey}
                    disabled={!newKeyName.trim() || newKeyScopes.length === 0 || creatingKey}
                    isLoading={creatingKey}
                    size="sm"
                    className="gap-1 rounded-lg"
                  >
                    <Key className="h-3 w-3" />
                    {locale === "de" ? "Erstellen" : "Create"}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowCreateKey(false)}
                    className="rounded-lg"
                  >
                    {locale === "de" ? "Abbrechen" : "Cancel"}
                  </Button>
                </div>
              </div>
            )}

            {/* Existing keys list */}
            {apiKeys.length > 0 && (
              <div className="space-y-2">
                {apiKeys.map((key) => (
                  <div
                    key={key.id}
                    className={`flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm ${
                      key.is_active
                        ? "border-gray-200 dark:border-gray-800"
                        : "border-gray-100 opacity-50 dark:border-gray-900"
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{key.name}</span>
                        <code className="text-xs text-gray-400">{key.key_prefix}…</code>
                        {!key.is_active && (
                          <span className="text-xs text-red-400">
                            {locale === "de" ? "Widerrufen" : "Revoked"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-400">
                        <span>{key.scopes.join(", ")}</span>
                        <span>•</span>
                        <span>{key.total_requests.toLocaleString()} {locale === "de" ? "Anfragen" : "requests"}</span>
                        {key.last_used_at && (
                          <>
                            <span>•</span>
                            <span>
                              {locale === "de" ? "Zuletzt:" : "Last:"}{" "}
                              {new Date(key.last_used_at).toLocaleDateString(locale)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    {key.is_active && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeKey(key.id)}
                        className="shrink-0 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canCreateKeys && apiKeys.length === 0 && !showCreateKey && (
              <p className="text-sm text-gray-400">
                {locale === "de"
                  ? "Noch keine API-Schlüssel. Erstellen Sie einen für die API oder Browser-Extension."
                  : "No API keys yet. Create one for API access or the browser extension."}
              </p>
            )}
          </CardContent>
        </Card>

        {/* Organization Link (if member) */}
        {profile?.org_id && (
          <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4" />
                {locale === "de" ? "Organisation" : "Organization"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={() => router.push(`/${locale}/settings/org`)}
                className="gap-2 rounded-xl"
              >
                <Building2 className="h-4 w-4" />
                {locale === "de" ? "Organisationseinstellungen" : "Organization Settings"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Account Deletion (GDPR Article 17) */}
        <Card className="border-red-200/60 dark:border-red-900/40 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-red-600 dark:text-red-400">
              <Trash2 className="h-4 w-4" />
              {locale === "de" ? "Konto löschen" : "Delete Account"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              {locale === "de"
                ? "Alle Ihre Daten werden unwiderruflich gelöscht — Profil, Verifizierungen, Bewertungen und Prüfprotokolle (DSGVO Art. 17)."
                : "All your data will be permanently deleted — profile, verifications, reviews, and audit logs (GDPR Article 17)."}
            </p>

            {!deleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setDeleteConfirm(true)}
                className="gap-2 rounded-xl border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900 dark:hover:bg-red-950/30"
              >
                <Trash2 className="h-4 w-4" />
                {locale === "de" ? "Konto löschen…" : "Delete account…"}
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-red-200 bg-red-50/50 p-4 dark:border-red-900/50 dark:bg-red-950/20">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
                  <p className="text-sm font-medium text-red-700 dark:text-red-400">
                    {locale === "de"
                      ? 'Geben Sie "DELETE" ein, um die Löschung zu bestätigen:'
                      : 'Type "DELETE" to confirm:'}
                  </p>
                </div>
                <input
                  type="text"
                  value={deleteText}
                  onChange={(e) => setDeleteText(e.target.value)}
                  placeholder="DELETE"
                  className="w-full rounded-lg border border-red-200 bg-white px-3 py-2 text-sm dark:border-red-900 dark:bg-gray-900 focus:ring-2 focus:ring-red-500/20"
                />
                <div className="flex gap-2">
                  <Button
                    onClick={handleDelete}
                    disabled={deleteText !== "DELETE" || deleting}
                    isLoading={deleting}
                    className="gap-1 rounded-lg bg-red-600 text-white hover:bg-red-700"
                    size="sm"
                  >
                    <Trash2 className="h-3 w-3" />
                    {locale === "de" ? "Endgültig löschen" : "Permanently delete"}
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => { setDeleteConfirm(false); setDeleteText(""); }}
                    size="sm"
                    className="rounded-lg"
                  >
                    {locale === "de" ? "Abbrechen" : "Cancel"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
