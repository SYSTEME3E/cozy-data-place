src/lib/Moneroo.ts
// ─────────────────────────────────────────────────────────────────
// Client GeniusPay pour le frontend React
Appelle les Supabase Edge Functions (jamais l’API GeniusPay directement)
// ─────────────────────────────────────────────────────────────────

import { supabase } from « @/integrations/supabase/client « ;
import { getNexoraUser } from « @/lib/nexora-auth » ;

// ─────────────────────────────────────────────
TYPES
// ─────────────────────────────────────────────

type d’exportation PaymentType =
 | « abonnement_premium »
 | « recharge_transfert »
 | « depot_epargne » ;

type d’exportation PayoutType =
 | « retrait_epargne »
 | « retrait_transfert »
 | « retrait_boutique » ;

export interface InitPaymentParams {
 type : TypePaymentType ;
 montant : nombre ; En FCFA (les 100 FCFA de frais sont ajoutés ici)
 monnaie ? : string ;
 payment_method ? : ficelle ; « vague » | « orange_money » | « mtn_money » | « moov_money »
 métadonnées ? : Enregistrement<chaîne, chaîne> ;
}

export interface InitPayoutParams {
 type : PaieType ;
 montant : nombre ; Montant brut demandé (les 3 % sont calculés ici)
 paye : ficelle ;
 Réseau : Corde ; Code réseau ex : « wave », « orange_money », « mtn_money »
 numero_mobile : ficelle ; Ex : « +229 97 00 11 22 »
 nom_beneficiaire : ficelle ;
 métadonnées ? : Enregistrement<chaîne, chaîne> ;
}

export interface GeniusPayResult {
 succès : booléen ;
 erreur ? : chaîne ;
 payment_url ? : ficelle ; Pour les paiements → redirection
 payment_id ? : ficelle ;
 payout_id ? : ficelle ;
 message ? : chaîne ;
}

// ─────────────────────────────────────────────
RÉSEAU CARTOGRAPHIQUE → CODE GENIUSPAY
// ─────────────────────────────────────────────

export const RESEAU_CODES : Enregistrement<chaîne, chaîne> = {
 Codes dirige GeniusPay
 « vague » : « vague »,
 « orange_money » : « orange_money »,
 « mtn_money » : « mtn_money »,
 « moov_money » : « moov_money »,
 Noms affichés → codes
 « Vague » : « vague »,
 « Argent orange » : « orange_money »,
 « MTN MoMo » : « mtn_money »,
 « Moov Money » : « moov_money »,
 Variantes régionales
 « Wave CI » : « wave »,
 « Orange Money CI » : « orange_money »,
 « MTN MoMo CI » : « mtn_money »,
 « Orange Money SN » : « orange_money »,
 « Argent gratuit » : « orange_money »,
 « Flooz » : « moov_money »,
 « T-Money » : « mtn_money »,
};

// ─────────────────────────────────────────────
// FRAIS APPLIQUÉS
Paiement/recharge : +100 fixes FCFA
Retrait/transfert : 3 % du montant
// ─────────────────────────────────────────────

export const FRAIS_PAIEMENT = 100 ; Corrections FCFA
Export const TAUX_RETRAIT = 0,03 ; // 3%

fonction export calcFraisPaiement(_montant : number) : number {
 retour FRAIS_PAIEMENT ;
}

fonction export calcFraisRetrait(montant : number) : number {
 return Math.round(montant * TAUX_RETRAIT) ;
}

// ─────────────────────────────────────────────
// INITIALISER UN PAIEMENT
(recharge, abonnement, dépôt)
// Les 100 FCFA de frais sont ajoutés au montant envoyé à GeniusPay
// ─────────────────────────────────────────────

export async function initPayment(params : InitPaymentParams) : Promise<GeniusPayResult> {
 const user = getNexoraUser() ;
 if ( !user) return { success : false, error : « Utilisateur non connecté » } ;

Montant final = montant + 100 FCFA de frais
 const montantAvecFrais = params.amount + FRAIS_PAIEMENT ;

try {
 const { data, error } = await supabase.functions.invoke(« geniuspay-payment », {
 corps : {
 type : params.type,
 montant : montantAvecFrais,
 amount_net : params.amount,
 monnaie : params.monnaie ?? « XOF »,
 payment_method : params.payment_method,
 user_id : user.id,
 user_email : user.email ?? "",
 user_name : user.nom_prenom ?? « Client NEXORA »,
 user_phone : « »,
 métadonnées : params.metadata ?? {},
 },
 });

si (erreur) erreur de lancer ;
 if ( !data ?. Success) return { success : false, error : data ?. erreur ?? « Erreur paiement » } ;

return {
 Succès : Vrai,
 payment_url : data.payment_url,
 payment_id : data.payment_id,
 };
 } attrape (euh : n’importe lequel) {
 console.error(« initPayment error : », err) ;
 return { Success : False, Error : err.message ?? « Erreur réseau » } ;
 }
}

// ─────────────────────────────────────────────
INITIER UN RETRAIT (paiement)
Les 3 % de frais sont calculés et déduits du montant reçu
// ─────────────────────────────────────────────

export async fonction initPayout(params : InitPayoutParams) : Promise<GeniusPayResult> {
 const user = getNexoraUser() ;
 if ( !user) return { success : false, error : « Utilisateur non connecté » } ;

const frais = calcFraisRetrait(params.amount) ;
 const montantNet = params.amount - frais ;

const parts = params.nom_beneficiaire.trim().split( » « ) ;
 const prénom = parts[0] ?? « Client » ;
 const lastName = parts.slice(1).join( » « ) || » NEXORA » ;

try {
 const { data, error } = await supabase.functions.invoke(« geniuspay-payout », {
 corps : {
 type : params.type,
 montant : params.amount,
 amount_net : montantNet,
 Frais : Frais,
 user_id : user.id,
 user_email : user.email ?? "",
 user_first_name : prénom,
 user_last_name : nomNomDe famille,
 Pays : params.pays,
 réseau : params.reseau,
 numero_mobile : params.numero_mobile.replace(/[\s\-()+]/g, «  »),
 métadonnées : params.metadata ?? {},
 },
 });

si (erreur) erreur de lancer ;
 if ( !data ?. Success) return { success : false, error : data ?. erreur ?? « Erreur retrait » } ;

return {
 Succès : Vrai,
 payout_id : data.payout_id,
 message : data.message,
 };
 } attrape (euh : n’importe lequel) {
 console.error (« initPayout error : », err) ;
 return { Success : False, Error : err.message ?? « Erreur réseau » } ;
 }
}

// ─────────────────────────────────────────────
// REDIRIGER VERS GENIUSPAY CHECKOUT
// ─────────────────────────────────────────────

fonction export redirectToCheckout(payment_url : string) : void {
 window.open(payment_url, « _blank ») ;
}

// ─────────────────────────────────────────────
PAIEMENT COMPLET (init + redirection)
// ─────────────────────────────────────────────

export async function payAndRedirect(params : InitPaymentParams) : Promise<void> {
 const result = await initPayment(params) ;
 if (résultat.succès && result.payment_url) {
 redirectToCheckout(result.payment_url) ;
 } else {
 lancer une nouvelle Error(result.error ?? « Impossible d’initialiser le paiement ») ;
 }
}

// ─────────────────────────────────────────────
// VÉRIFIER UN PAIEMENT APRÈS RETOUR
Appelé sur la page /payment/callback
GeniusPay redirige vers success_url ou error_url
// ─────────────────────────────────────────────

export async verifyPaymentFromCallback() : Promise<{
 statut : ficelle ;
 paymentId : chaîne | nulle ;
 type : chaîne | nulle ;
}> {
 const params = new URLSearchParams(window.location.search) ;
 const reference = params.get(« reference ») ?? params.get(« paymentId ») ?? nulle ;
 type const = params.get(« type ») ;
 GeniusPay redirige vers success_url en cas de succès
 On détecte le succès via la présence du paramètre « reference » dans l’URL
 const isSuccess = params.get(« status ») === « succès »
 || Params.get(« payStatus ») === « terminé »
 || (référence !== null && !params.has(« error »)) ;

return {
 statut : isSuccess ? « succès » : « échoué »,
 paymentId : référence,
 type,
 };
}
