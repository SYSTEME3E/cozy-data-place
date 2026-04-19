/**
 * NEXORA — Supabase Edge Function : generate-video-token
 * Fichier : supabase/functions/generate-video-token/index.ts
 *
 * Deploy : supabase functions deploy generate-video-token
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": Deno.env.get("FRONTEND_URL") ?? "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-device-fingerprint",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const TOKEN_TTL_SECONDS = 300; // 5 minutes
const MAX_DEVICES = 3;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return errorResponse("Non authentifié", 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return errorResponse("Token invalide", 401);

    const { videoId, courseId, deviceFingerprint } = await req.json();
    if (!videoId || !courseId || !deviceFingerprint) return errorResponse("Paramètres manquants", 400);

    // Vérification achat + rôle admin
    const [purchaseRes, profileRes] = await Promise.all([
      adminClient.from("formation_purchases").select("id").eq("user_id", user.id).eq("formation_id", courseId).eq("status", "completed").maybeSingle(),
      adminClient.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    ]);

    const isAdmin = profileRes.data?.role === "admin";
    if (!purchaseRes.data && !isAdmin) return errorResponse("Accès non autorisé à cette formation", 403);

    // Progression séquentielle
    if (!isAdmin) {
      const { data: lecon } = await adminClient.from("formation_lecons").select("ordre, module_id").eq("id", videoId).single();
      if (lecon && lecon.ordre > 1) {
        const { data: prevLecon } = await adminClient.from("formation_lecons").select("id").eq("module_id", lecon.module_id).eq("ordre", lecon.ordre - 1).maybeSingle();
        if (prevLecon) {
          const { data: prevProgress } = await adminClient.from("video_progress").select("status").eq("user_id", user.id).eq("video_id", prevLecon.id).maybeSingle();
          if (!prevProgress || prevProgress.status !== "completed") return errorResponse("Terminez la leçon précédente d'abord", 403);
        }
      }
    }

    // Limite multi-appareils
    const { data: devices } = await adminClient.from("user_devices").select("fingerprint, last_seen").eq("user_id", user.id).order("last_seen", { ascending: false });
    const knownDevices = devices ?? [];
    const isKnownDevice = knownDevices.some((d: any) => d.fingerprint === deviceFingerprint);

    if (!isKnownDevice) {
      if (knownDevices.length >= MAX_DEVICES && !isAdmin) return errorResponse(`Limite de ${MAX_DEVICES} appareils atteinte.`, 403);
      await adminClient.from("user_devices").upsert({ user_id: user.id, fingerprint: deviceFingerprint, last_seen: new Date().toISOString(), ip: req.headers.get("x-forwarded-for") ?? "unknown", user_agent: req.headers.get("user-agent") ?? "unknown" }, { onConflict: "user_id,fingerprint" });
    } else {
      await adminClient.from("user_devices").update({ last_seen: new Date().toISOString() }).eq("user_id", user.id).eq("fingerprint", deviceFingerprint);
    }

    // Récupérer storage_path
    const { data: leconData } = await adminClient.from("formation_lecons").select("storage_path").eq("id", videoId).single();
    if (!leconData?.storage_path) return errorResponse("Vidéo introuvable dans le stockage", 404);

    // Générer URL signée
    const { data: signedUrlData, error: signError } = await adminClient.storage.from("videos-securisees").createSignedUrl(leconData.storage_path, TOKEN_TTL_SECONDS);
    if (signError || !signedUrlData?.signedUrl) return errorResponse("Impossible de générer le token d'accès", 500);

    // Log audit
    adminClient.from("video_access_logs").insert({ user_id: user.id, video_id: videoId, course_id: courseId, device_fingerprint: deviceFingerprint, ip: req.headers.get("x-forwarded-for") ?? "unknown" });

    return new Response(
      JSON.stringify({ signedUrl: signedUrlData.signedUrl, expiresAt: new Date(Date.now() + TOKEN_TTL_SECONDS * 1000).toISOString(), ttl: TOKEN_TTL_SECONDS }),
      { headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" } }
    );
  } catch (err) {
    console.error("Erreur:", err);
    return errorResponse("Erreur interne", 500);
  }
});

function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } });
}
