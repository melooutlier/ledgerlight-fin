// Scheduled job: forwards the managed cron call to the existing
// melfy-notifications Edge Function, which owns the Web Push delivery logic.
import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";

export const Route = createFileRoute("/api/public/jobs/melfy-notifications")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        const authFailure = await authenticateCronRequest(request);
        if (authFailure) return authFailure;

        const base = process.env["SUPABASE_URL"];
        const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
        if (!base || !serviceKey) {
          return Response.json({ error: "Server configuration error" }, { status: 500 });
        }
        try {
          const upstream = await fetch(`${base}/functions/v1/melfy-notifications`, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-cron-secret": serviceKey },
            body: JSON.stringify({ action: "process" }),
          });
          const text = await upstream.text();
          return new Response(text, {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        } catch (error) {
          console.error("melfy-notifications forward failed", error);
          return Response.json({ error: "Falha ao contactar o processador de notificações." }, { status: 502 });
        }
      },
    },
  },
});
