// Send a Web Push notification to all (or filtered) stored subscriptions.
// Uses web-push via esm.sh with VAPID keys from environment secrets.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore - Deno ESM
import webpush from "https://esm.sh/web-push@3.6.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PushBody {
  title: string;
  body: string;
  url?: string;
  userIds?: string[]; // optional filter
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const VAPID_PUBLIC = Deno.env.get("VAPID_PUBLIC_KEY");
    const VAPID_PRIVATE = Deno.env.get("VAPID_PRIVATE_KEY");
    const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@acadex.app";

    if (!VAPID_PUBLIC || !VAPID_PRIVATE) {
      return new Response(JSON.stringify({ error: "VAPID keys not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);

    const payload = (await req.json()) as PushBody;
    if (!payload?.title || !payload?.body) {
      return new Response(JSON.stringify({ error: "title and body required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let q = supabase.from("push_subscriptions").select("*");
    if (payload.userIds && payload.userIds.length > 0) {
      q = q.in("user_id", payload.userIds);
    }
    const { data: subs, error } = await q;
    if (error) throw error;

    const message = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || "/",
    });

    let sent = 0;
    let removed = 0;
    const stale: string[] = [];

    await Promise.all(
      (subs || []).map(async (s: any) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            message
          );
          sent++;
        } catch (err: any) {
          if (err?.statusCode === 404 || err?.statusCode === 410) {
            stale.push(s.endpoint);
          } else {
            console.error("push error", err?.statusCode, err?.body);
          }
        }
      })
    );

    if (stale.length > 0) {
      await supabase.from("push_subscriptions").delete().in("endpoint", stale);
      removed = stale.length;
    }

    return new Response(JSON.stringify({ sent, removed, total: subs?.length || 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error(e);
    return new Response(JSON.stringify({ error: e?.message || "unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
