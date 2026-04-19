// ─────────────────────────────────────────────────────────────────────────────
// PATCH : Section "paiement" dans SectionEditor (ProduitsDigitauxPage)
// + Section "paiement" dans la page produit physique
//
// Changements :
//   1. Suppression de l'option "Mobile Money manuel"
//   2. Deux modes : "external" (Lien externe) et "nexora" (Nexora Pay)
//   3. Pour "nexora" : sélecteur de PayLinks déjà créés (récupérés depuis Supabase)
//   4. Le paylink_id sélectionné est sauvegardé dans le produit
//   5. Sur la page de checkout, si payment_mode === "nexora", le client est
//      redirigé vers /pay/<paylink.slug> ; au retour avec ?status=success
//      la commande passe à "paiement_effectue: true"
// ─────────────────────────────────────────────────────────────────────────────

// ══════════════════════════════════════════════════════════════════════════════
// 1.  HOOK  –  useNexoraPayLinks
//     À placer dans  src/hooks/useNexoraPayLinks.ts
// ══════════════════════════════════════════════════════════════════════════════
/*
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

export type NexoraPayLink = {
  id: string;
  slug: string;
  nom_produit: string;
  montant: number;
  devise: string;
  url: string;
  statut: "actif" | "inactif";
};

export function useNexoraPayLinks() {
  const [paylinks, setPaylinks] = useState<NexoraPayLink[]>([]);
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const user = getNexoraUser();
      if (!user?.id) { setLoading(false); return; }
      const { data } = await supabase
        .from("nexora_paylinks" as any)
        .select("id, slug, nom_produit, montant, devise, url, statut")
        .eq("user_id", user.id)
        .eq("statut", "actif")
        .order("created_at", { ascending: false });
      setPaylinks((data as NexoraPayLink[]) ?? []);
      setLoading(false);
    };
    load();
  }, []);

  return { paylinks, loading };
}
*/

// ══════════════════════════════════════════════════════════════════════════════
// 2.  REMPLACEMENT  –  Section "paiement" dans <SectionEditor>
//     Remplace le bloc  {sectionKey === "paiement" && ( … )}
//     dans  src/pages/ProduitsDigitauxPage.tsx
// ══════════════════════════════════════════════════════════════════════════════
/*
  Ajoute ces imports en haut du fichier :
    import { useNexoraPayLinks } from "@/hooks/useNexoraPayLinks";
    import { formatPrix } from "@/lib/devise-utils";   // déjà présent

  Dans le composant SectionEditor, ajoute le hook :
    const { paylinks: nexoraPaylinks, loading: nexoraLoading } = useNexoraPayLinks();

  Puis remplace TOUT le bloc {sectionKey === "paiement" && ( … )} par le code ci-dessous :
*/

// ─── SECTION PAIEMENT ─────────────────────────────────────────────────────────
/*
{sectionKey === "paiement" && (
  <div className="space-y-4">

    {/* Mode : Lien externe *\/}
    <button
      type="button"
      onClick={() => setForm(p => ({ ...p, payment_mode: "external", nexora_paylink_id: "" }))}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
        form.payment_mode === "external"
          ? "border-violet-500 bg-violet-500/8"
          : "border-white/8 hover:border-white/15"
      }`}
    >
      <span className="text-2xl">🔗</span>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm">Lien externe</p>
        <p className="text-xs text-slate-500">Wave, PayDunya, CinetPay, Stripe...</p>
      </div>
      {form.payment_mode === "external" && (
        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
      )}
    </button>

    {form.payment_mode === "external" && (
      <div className="bg-white/5 rounded-2xl p-4 border border-white/8 space-y-2">
        <label className="block text-sm font-semibold text-slate-300">URL de paiement</label>
        <input
          value={form.paiement_lien}
          onChange={e => setForm(p => ({ ...p, paiement_lien: e.target.value }))}
          placeholder="https://pay.wave.com/m/..."
          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm
                     focus:outline-none focus:border-blue-500 placeholder-slate-600 transition-colors"
        />
      </div>
    )}

    {/* Mode : Nexora Pay *\/}
    <button
      type="button"
      onClick={() => setForm(p => ({ ...p, payment_mode: "nexora", paiement_lien: "" }))}
      className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all ${
        form.payment_mode === "nexora"
          ? "border-violet-500 bg-violet-500/8"
          : "border-white/8 hover:border-white/15"
      }`}
    >
      <span className="text-2xl">⚡</span>
      <div className="flex-1">
        <p className="font-semibold text-white text-sm">NEXORA Pay</p>
        <p className="text-xs text-slate-500">Utilisez un de vos PayLinks actifs</p>
      </div>
      {form.payment_mode === "nexora" && (
        <CheckCircle className="w-5 h-5 text-violet-400 flex-shrink-0" />
      )}
    </button>

    {form.payment_mode === "nexora" && (
      <div className="space-y-3">
        {nexoraLoading ? (
          <div className="flex items-center justify-center py-8 gap-3">
            <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
            <span className="text-slate-400 text-sm">Chargement de vos PayLinks...</span>
          </div>
        ) : nexoraPaylinks.length === 0 ? (
          <div className="bg-violet-950/40 border border-violet-800/40 rounded-2xl p-6 text-center space-y-3">
            <span className="text-3xl">🔗</span>
            <p className="font-semibold text-violet-300 text-sm">Aucun PayLink actif trouvé</p>
            <p className="text-xs text-slate-500">
              Créez d'abord un PayLink sur la page{" "}
              <strong className="text-violet-400">NEXORA PayLink</strong>.
            </p>
          </div>
        ) : (
          <>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
              Choisir un PayLink
            </p>
            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {nexoraPaylinks.map(pl => {
                const isSelected = form.nexora_paylink_id === pl.id;
                return (
                  <button
                    key={pl.id}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, nexora_paylink_id: pl.id, nexora_paylink_url: pl.url }))}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border-2 text-left transition-all ${
                      isSelected
                        ? "border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10"
                        : "border-white/8 hover:border-white/20 bg-white/3"
                    }`}
                  >
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                      isSelected ? "bg-violet-500" : "bg-white/8"
                    }`}>
                      <span className="text-base">⚡</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-white text-sm truncate">{pl.nom_produit}</p>
                      <p className="text-xs text-slate-500 truncate">{pl.url}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-black text-violet-400 text-sm">
                        {new Intl.NumberFormat("fr-FR").format(pl.montant)} {pl.devise}
                      </p>
                      {isSelected && <CheckCircle className="w-4 h-4 text-violet-400 ml-auto mt-0.5" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {form.nexora_paylink_id && (
              <div className="bg-violet-950/30 border border-violet-800/30 rounded-xl p-3 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <p className="text-xs text-violet-300">
                  PayLink sélectionné. Les clients seront redirigés vers votre page de paiement Nexora.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    )}

  </div>
)}
*/

// ══════════════════════════════════════════════════════════════════════════════
// 3.  MISE À JOUR  –  Interfaces & emptyForm
//     Dans  ProduitsDigitauxPage.tsx
// ══════════════════════════════════════════════════════════════════════════════
/*
  Dans l'interface ProduitDigital, remplace :
    moyens_paiement: PaymentMethod[];
    payment_mode: "external" | "manual" | "nexora" | null;
  par :
    moyens_paiement: PaymentMethod[];
    payment_mode: "external" | "nexora" | null;
    nexora_paylink_id?: string | null;
    nexora_paylink_url?: string | null;

  Dans emptyForm, remplace :
    payment_mode: "manual" as "external" | "manual" | "nexora",
    paiement_lien: "", moyens_paiement: [] as PaymentMethod[],
  par :
    payment_mode: "external" as "external" | "nexora",
    paiement_lien: "",
    moyens_paiement: [] as PaymentMethod[],
    nexora_paylink_id: "",
    nexora_paylink_url: "",
*/

// ══════════════════════════════════════════════════════════════════════════════
// 4.  MISE À JOUR  –  handleSubmit dans ProduitsDigitauxPage
//     Ajouter les nouveaux champs dans le payload
// ══════════════════════════════════════════════════════════════════════════════
/*
  Dans const payload = { … }, ajoute / remplace :

    payment_mode: form.payment_mode,
    paiement_lien: form.payment_mode === "external" ? (form.paiement_lien || null) : null,
    moyens_paiement: [],                              // plus utilisé
    nexora_paylink_id: form.payment_mode === "nexora" ? (form.nexora_paylink_id || null) : null,
    nexora_paylink_url: form.payment_mode === "nexora" ? (form.nexora_paylink_url || null) : null,
*/

// ══════════════════════════════════════════════════════════════════════════════
// 5.  MISE À JOUR  –  handleEdit dans ProduitsDigitauxPage
//     Pré-remplir les nouveaux champs lors de l'édition
// ══════════════════════════════════════════════════════════════════════════════
/*
  Dans handleEdit(p: ProduitDigital), ajoute dans setForm({ … }) :

    payment_mode: (p.payment_mode as "external" | "nexora") || "external",
    nexora_paylink_id: (p as any).nexora_paylink_id || "",
    nexora_paylink_url: (p as any).nexora_paylink_url || "",
    moyens_paiement: [],
*/

// ══════════════════════════════════════════════════════════════════════════════
// 6.  PAGE CHECKOUT  –  Gestion payment_mode === "nexora"
//     Dans la page produit (digital ou physique côté client)
//     Quand le client clique "Acheter", si payment_mode === "nexora" :
//       → redirect vers nexora_paylink_url + ?ref=<orderId>&return_url=<currentUrl>
//     PayLinkCheckoutPage retourne déjà ?status=success&ref=…
//     → La commande peut être mise à jour : paiement_effectue = true
// ══════════════════════════════════════════════════════════════════════════════
/*
  Exemple dans la page d'achat produit digital (côté public) :

  const handleBuy = async () => {
    // 1. Créer la commande en base avec statut "pending"
    const { data: order } = await supabase
      .from("commandes")
      .insert({ produit_id, acheteur_id, statut: "pending", paiement_effectue: false })
      .select()
      .single();

    if (produit.payment_mode === "nexora" && produit.nexora_paylink_url) {
      // 2. Rediriger vers le PayLink avec ref = order.id
      const returnUrl = encodeURIComponent(
        `${window.location.origin}/shop/${boutiqueSlug}/digital/${produitId}?order=${order.id}&status=success`
      );
      window.location.href = `${produit.nexora_paylink_url}?ref=${order.id}&return_url=${returnUrl}`;
    } else if (produit.payment_mode === "external" && produit.paiement_lien) {
      window.open(produit.paiement_lien, "_blank");
    }
  };

  // Écouter le retour depuis PayLink (useEffect sur searchParams) :
  useEffect(() => {
    const status = searchParams.get("status");
    const orderId = searchParams.get("order");
    if (status === "success" && orderId) {
      supabase
        .from("commandes")
        .update({ statut: "payee", paiement_effectue: true })
        .eq("id", orderId)
        .then(() => {
          toast({ title: "✅ Paiement confirmé !" });
        });
    }
  }, [searchParams]);
*/

// ══════════════════════════════════════════════════════════════════════════════
// 7.  MIGRATION SQL  –  Colonnes à ajouter sur la table "produits"
// ══════════════════════════════════════════════════════════════════════════════
/*
  ALTER TABLE produits
    ADD COLUMN IF NOT EXISTS nexora_paylink_id  UUID    REFERENCES nexora_paylinks(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS nexora_paylink_url TEXT;

  -- Supprimer la contrainte enum si elle existe sur payment_mode
  -- (le mode "manual" n'est plus utilisé, mais on garde la compatibilité)
*/

export {};
