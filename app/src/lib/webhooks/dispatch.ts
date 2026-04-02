/**
 * KLAR Webhook Dispatch
 *
 * Sends webhook events to registered org endpoints.
 * Includes HMAC-SHA256 signature for payload verification.
 * Auto-disables webhooks after 10 consecutive failures.
 */

import { createServiceClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import crypto from "crypto";

const MAX_FAILURES = 10;
const TIMEOUT_MS = 5000;

interface WebhookPayload {
  event: string;
  timestamp: string;
  data: Record<string, unknown>;
}

/**
 * Sign a payload with HMAC-SHA256 using the webhook's secret.
 */
function signPayload(payload: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(payload).digest("hex");
}

/**
 * Dispatch an event to all active webhooks for an organization.
 * Fire-and-forget — errors are silently caught and logged.
 */
export async function dispatchWebhook(
  orgId: string,
  event: string,
  data: Record<string, unknown>
): Promise<void> {
  const supabaseAdmin = await createServiceClient();
  const { data: webhooks, error } = await supabaseAdmin
    .from("webhooks")
    .select("id, url, events, secret, failure_count")
    .eq("org_id", orgId)
    .eq("is_active", true);

  if (error || !webhooks?.length) return;

  const matching = webhooks.filter((w) => w.events.includes(event));
  if (matching.length === 0) return;

  const payload: WebhookPayload = {
    event,
    timestamp: new Date().toISOString(),
    data,
  };

  const payloadStr = JSON.stringify(payload);

  await Promise.allSettled(
    matching.map(async (webhook) => {
      const signature = signPayload(payloadStr, webhook.secret);

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

        const response = await fetch(webhook.url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-KLAR-Signature": `sha256=${signature}`,
            "X-KLAR-Event": event,
            "User-Agent": "KLAR-Webhooks/1.0",
          },
          body: payloadStr,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          // Reset failure count on success
          await supabaseAdmin
            .from("webhooks")
            .update({
              failure_count: 0,
              last_triggered_at: new Date().toISOString(),
            })
            .eq("id", webhook.id);
        } else {
          await handleFailure(supabaseAdmin, webhook.id, webhook.failure_count);
        }
      } catch {
        await handleFailure(supabaseAdmin, webhook.id, webhook.failure_count);
      }
    })
  );
}

async function handleFailure(supabaseAdmin: SupabaseClient, webhookId: string, currentFailures: number): Promise<void> {
  const newCount = currentFailures + 1;

  if (newCount >= MAX_FAILURES) {
    // Auto-disable after max failures
    await supabaseAdmin
      .from("webhooks")
      .update({ is_active: false, failure_count: newCount })
      .eq("id", webhookId);
  } else {
    await supabaseAdmin
      .from("webhooks")
      .update({ failure_count: newCount })
      .eq("id", webhookId);
  }
}
