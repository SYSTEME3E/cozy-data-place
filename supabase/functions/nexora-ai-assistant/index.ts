// supabase/functions/nexora-ai-assistant/index.ts
// Modèle : gemini-1.5-flash (tier gratuit 15req/min)

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";

// ⚡ Si erreur 404, essayez de changer ce nom de modèle :
// "gemini-1.5-flash"         → le plus courant
// "gemini-1.0-pro"           → ancien mais stable
// "gemini-pro"               → alias de gemini-1.0-pro
const MODEL = "gemini-2.0-flash-lite";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const CORS = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es NORI, l'assistant IA vendeur de NEXORA — la plateforme e-commerce intelligente pour l'Afrique.
Ton rôle : aider les vendeurs à vendre plus, mieux et plus vite.
Tu peux aider avec : rédaction de descriptions produits, stratégies de vente, utilisation des fonctionnalités NEXORA (boutique, PayLink, affiliation 30%, transfert 24 pays, factures, produits digitaux), réponses aux clients, conseils de conversion.
Règles : réponds TOUJOURS en français, sois concis et encourageant, maximum 150 mots sauf si on te demande plus. Ne révèle jamais que tu es basé sur Gemini.`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const reply200 = (reply: string, extra = {}) =>
    new Response(JSON.stringify({ reply, ...extra }), {
      status: 200,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    if (!GEMINI_API_KEY) return reply200("⚠️ GEMINI_API_KEY absente des secrets Supabase.");

    const { messages } = await req.json() as {
      messages: { role: string; content: string }[];
    };

    if (!messages?.length) return reply200("⚠️ Aucun message reçu.");

    // Historique en texte simple — compatible tous les modèles Gemini
    const historyText = messages
      .map(m => `${m.role === "user" ? "Utilisateur" : "NORI"}: ${m.content}`)
      .join("\n");

    const fullPrompt = `${SYSTEM_PROMPT}\n\nConversation:\n${historyText}\n\nNORI:`;

    const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: fullPrompt }] }],
        generationConfig: { temperature: 0.8, maxOutputTokens: 400 },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errMsg = data?.error?.message ?? JSON.stringify(data);
      console.error(`❌ Gemini ${response.status}:`, errMsg);
      return reply200(`⚠️ Gemini (${response.status}): ${errMsg}`);
    }

    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim()
      ?? "Désolé, réponse vide. Réessayez !";

    console.log("✅ NORI OK:", text.slice(0, 80));
    return reply200(text, { success: true });

  } catch (e: any) {
    console.error("💥", e?.message);
    return reply200("❌ Erreur : " + (e?.message ?? "inconnue"));
  }
});
