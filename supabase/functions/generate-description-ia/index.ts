// supabase/functions/generate-description-ia/index.ts
// ─────────────────────────────────────────────────────────────────
// Edge Function : génère une description produit via Gemini Flash
// La clé API reste côté serveur, jamais exposée au client
// ─────────────────────────────────────────────────────────────────

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`;

const corsHeaders = {
  "Access-Control-Allow-Origin":  "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (!GEMINI_API_KEY) {
      console.error("❌ GEMINI_API_KEY manquant dans les secrets Supabase");
      return new Response(
        JSON.stringify({ error: "Clé API non configurée" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { nom, categorie, prix, keywords, tone } = await req.json();

    if (!nom || nom.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: "Le nom du produit est requis" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const toneMap: Record<string, string> = {
      professionnel: "ton professionnel et factuel, mettant en avant la qualité et la fiabilité",
      chaleureux:    "ton chaleureux et accessible, comme si tu parlais à un ami, créant de la confiance",
      luxe:          "ton prestige et exclusif, valorisant le statut et la qualité premium",
      simple:        "ton direct et efficace, phrases courtes, avantages clairs, sans fioritures",
    };

    const prompt = `Tu es un expert en copywriting pour boutiques en ligne en Afrique de l'Ouest (Bénin, Togo, Côte d'Ivoire, Sénégal).
Rédige une description de produit (3-5 phrases, percutante, adaptée au marché local) pour :
- Nom : ${nom}
${categorie ? `- Catégorie : ${categorie}` : ""}
${prix ? `- Prix : ${prix} FCFA` : ""}
${keywords ? `- Caractéristiques : ${keywords}` : ""}
Utilise un ${toneMap[tone] ?? toneMap["chaleureux"]}.
Réponds UNIQUEMENT avec la description, sans introduction, sans guillemets, sans formatage markdown.`;

    console.log("🤖 Génération Gemini pour produit :", nom);

    const response = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature:     0.8,
          maxOutputTokens: 300,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("❌ Erreur Gemini API :", data);
      return new Response(
        JSON.stringify({ error: data?.error?.message ?? "Erreur API Gemini" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const description = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ?? "";

    if (!description) {
      throw new Error("Réponse vide de Gemini");
    }

    console.log("✅ Description générée, longueur :", description.length);

    return new Response(
      JSON.stringify({ description }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    console.error("❌ Erreur generate-description-ia :", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
