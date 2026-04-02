"use client";

import { useState, useEffect, useCallback } from "react";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Building2, Users, Mail, Loader2, Plus, Trash2, Crown,
  Shield, UserMinus, Link2, Webhook, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Organization, OrgMember } from "@/types";

interface Invitation {
  id: string;
  email: string;
  role: string;
  expires_at: string;
  created_at: string;
}

interface WebhookItem {
  id: string;
  url: string;
  events: string[];
  is_active: boolean;
  failure_count: number;
  last_triggered_at: string | null;
  created_at: string;
}

export default function OrgSettingsPage() {
  const locale = useLocale();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [org, setOrg] = useState<Organization | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [members, setMembers] = useState<OrgMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [webhooks, setWebhooks] = useState<WebhookItem[]>([]);

  // Invite form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [inviting, setInviting] = useState(false);

  // Webhook form
  const [showWebhookForm, setShowWebhookForm] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState("");
  const [webhookEvents, setWebhookEvents] = useState<string[]>(["verification.completed"]);
  const [creatingWebhook, setCreatingWebhook] = useState(false);
  const [newWebhookSecret, setNewWebhookSecret] = useState<string | null>(null);

  const loadOrg = useCallback(async () => {
    try {
      const res = await fetch("/api/org");
      if (res.ok) {
        const data = await res.json();
        setOrg(data.org);
        setRole(data.role);
        if (!data.org) {
          router.push(`/${locale}/settings`);
          return;
        }
      }
    } catch {
      router.push(`/${locale}/settings`);
    }
    setLoading(false);
  }, [locale, router]);

  const loadMembers = useCallback(async () => {
    const res = await fetch("/api/org/members");
    if (res.ok) {
      const data = await res.json();
      setMembers(data.members || []);
    }
  }, []);

  const loadInvitations = useCallback(async () => {
    const res = await fetch("/api/org/invite");
    if (res.ok) {
      const data = await res.json();
      setInvitations(data.invitations || []);
    }
  }, []);

  const loadWebhooks = useCallback(async () => {
    const res = await fetch("/api/webhooks");
    if (res.ok) {
      const data = await res.json();
      setWebhooks(data.webhooks || []);
    }
  }, []);

  useEffect(() => {
    loadOrg();
    loadMembers();
    loadInvitations();
    loadWebhooks();
  }, [loadOrg, loadMembers, loadInvitations, loadWebhooks]);

  const handleInvite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const res = await fetch("/api/org/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      });
      if (res.ok) {
        setInviteEmail("");
        await loadInvitations();
      }
    } catch {
      // Silent
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    const res = await fetch(`/api/org/members?user_id=${userId}`, { method: "DELETE" });
    if (res.ok) {
      await loadMembers();
    }
  };

  const handleRevokeInvite = async (inviteId: string) => {
    const res = await fetch(`/api/org/invite?id=${inviteId}`, { method: "DELETE" });
    if (res.ok) {
      await loadInvitations();
    }
  };

  const handleCreateWebhook = async () => {
    if (!webhookUrl.trim() || webhookEvents.length === 0) return;
    setCreatingWebhook(true);
    try {
      const res = await fetch("/api/webhooks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: webhookUrl.trim(), events: webhookEvents }),
      });
      if (res.ok) {
        const data = await res.json();
        setNewWebhookSecret(data.signing_secret);
        setWebhookUrl("");
        setWebhookEvents(["verification.completed"]);
        await loadWebhooks();
      }
    } catch {
      // Silent
    } finally {
      setCreatingWebhook(false);
    }
  };

  const handleDeleteWebhook = async (webhookId: string) => {
    const res = await fetch(`/api/webhooks?id=${webhookId}`, { method: "DELETE" });
    if (res.ok) {
      await loadWebhooks();
    }
  };

  const toggleWebhookEvent = (event: string) => {
    setWebhookEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]
    );
  };

  const isAdmin = role === "owner" || role === "admin";

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!org) return null;

  const roleIcon = (r: string) => {
    if (r === "owner") return <Crown className="h-3.5 w-3.5 text-amber-500" />;
    if (r === "admin") return <Shield className="h-3.5 w-3.5 text-blue-500" />;
    return null;
  };

  return (
    <div className="relative min-h-screen">
      <div className="absolute inset-0 -z-10 bg-mesh-light dark:bg-mesh-dark opacity-40" />

      <div className="mx-auto max-w-2xl animate-fade-in px-4 py-10 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-500 bg-clip-text text-transparent dark:from-slate-200 dark:to-slate-400">
          <span className="flex items-center gap-3">
            <Building2 className="h-7 w-7" />
            {org.name}
          </span>
        </h1>

        {/* Org Info */}
        <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              {locale === "de" ? "Organisation" : "Organization"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Slug</span>
              <span className="font-mono text-xs">{org.slug}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Plan</span>
              <span className="font-medium capitalize">{org.plan}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {locale === "de" ? "Sitze" : "Seats"}
              </span>
              <span className="font-medium">
                {members.length} / {org.max_seats}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">
                {locale === "de" ? "Ihre Rolle" : "Your role"}
              </span>
              <span className="flex items-center gap-1 font-medium capitalize">
                {roleIcon(role!)} {role}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="h-4 w-4" />
              {locale === "de" ? "Mitglieder" : "Members"}
              <span className="ml-auto text-xs font-normal text-gray-400">
                {members.length} / {org.max_seats}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">
                      {member.full_name || member.email || locale === "de" ? "Unbenannt" : "Unnamed"}
                    </span>
                    {roleIcon(member.role)}
                    <span className="text-xs text-gray-400 capitalize">{member.role}</span>
                  </div>
                  {member.email && (
                    <p className="text-xs text-gray-400 truncate">{member.email}</p>
                  )}
                </div>
                {isAdmin && member.role !== "owner" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="shrink-0 text-red-500 hover:text-red-600"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            ))}

            {/* Invite form */}
            {isAdmin && (
              <div className="mt-4 rounded-lg border border-dashed border-gray-300 p-3 dark:border-gray-700">
                <p className="mb-2 text-xs font-medium text-gray-500">
                  {locale === "de" ? "Mitglied einladen" : "Invite member"}
                </p>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="flex-1 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm dark:border-gray-800 dark:bg-gray-900"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-xs dark:border-gray-800 dark:bg-gray-900"
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                  <Button
                    onClick={handleInvite}
                    disabled={!inviteEmail.trim() || inviting}
                    isLoading={inviting}
                    size="sm"
                    className="gap-1 rounded-lg"
                  >
                    <Plus className="h-3 w-3" />
                    {locale === "de" ? "Einladen" : "Invite"}
                  </Button>
                </div>
              </div>
            )}

            {/* Pending invitations */}
            {invitations.length > 0 && (
              <div className="mt-3 space-y-1">
                <p className="text-xs font-medium text-gray-400">
                  {locale === "de" ? "Ausstehende Einladungen" : "Pending invitations"}
                </p>
                {invitations.map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border border-dashed border-gray-200 px-3 py-2 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-2">
                      <Mail className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm">{inv.email}</span>
                      <span className="text-xs text-gray-400 capitalize">{inv.role}</span>
                    </div>
                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRevokeInvite(inv.id)}
                        className="text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webhooks */}
        {isAdmin && (
          <Card className="mb-6 border-gray-200/60 dark:border-gray-800/60 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="flex items-center justify-between text-base">
                <span className="flex items-center gap-2">
                  <Webhook className="h-4 w-4" />
                  Webhooks
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setShowWebhookForm(!showWebhookForm); setNewWebhookSecret(null); }}
                  className="gap-1 rounded-lg text-xs"
                >
                  <Plus className="h-3 w-3" />
                  {locale === "de" ? "Neu" : "New"}
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* New secret display */}
              {newWebhookSecret && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-3 dark:border-emerald-900/50 dark:bg-emerald-950/20">
                  <div className="flex items-start gap-2 mb-1">
                    <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
                    <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                      {locale === "de"
                        ? "Signaturschlüssel (nur jetzt sichtbar):"
                        : "Signing secret (shown once):"}
                    </p>
                  </div>
                  <code className="block rounded bg-gray-900 px-3 py-2 text-xs font-mono text-emerald-400 break-all">
                    {newWebhookSecret}
                  </code>
                </div>
              )}

              {/* Create webhook form */}
              {showWebhookForm && !newWebhookSecret && (
                <div className="rounded-lg border border-gray-200 p-3 dark:border-gray-800 space-y-3">
                  <input
                    type="url"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    placeholder="https://your-server.com/webhook"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-800 dark:bg-gray-900"
                  />
                  <div>
                    <p className="mb-2 text-xs text-gray-500">Events:</p>
                    <div className="flex flex-wrap gap-2">
                      {[
                        "verification.completed",
                        "batch.completed",
                        "member.joined",
                        "member.removed",
                        "report.generated",
                      ].map((event) => (
                        <button
                          key={event}
                          onClick={() => toggleWebhookEvent(event)}
                          className={`px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                            webhookEvents.includes(event)
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : "bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400"
                          }`}
                        >
                          {event}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={handleCreateWebhook}
                    disabled={!webhookUrl.trim() || webhookEvents.length === 0 || creatingWebhook}
                    isLoading={creatingWebhook}
                    size="sm"
                    className="gap-1 rounded-lg"
                  >
                    <Link2 className="h-3 w-3" />
                    {locale === "de" ? "Erstellen" : "Create"}
                  </Button>
                </div>
              )}

              {/* Existing webhooks */}
              {webhooks.map((wh) => (
                <div
                  key={wh.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2.5 dark:border-gray-800"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-mono truncate">{wh.url}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{wh.events.join(", ")}</span>
                      {wh.failure_count > 0 && (
                        <span className="text-amber-500">{wh.failure_count} failures</span>
                      )}
                      {!wh.is_active && (
                        <span className="text-red-400">
                          {locale === "de" ? "Deaktiviert" : "Disabled"}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteWebhook(wh.id)}
                    className="shrink-0 text-red-500"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}

              {webhooks.length === 0 && !showWebhookForm && (
                <p className="text-sm text-gray-400">
                  {locale === "de"
                    ? "Keine Webhooks konfiguriert."
                    : "No webhooks configured."}
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
