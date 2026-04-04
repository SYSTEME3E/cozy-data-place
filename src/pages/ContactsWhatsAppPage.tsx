import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone, Download, Users, Crown,
  CheckCircle2, AlertCircle, Wifi, WifiOff, UserPlus,
  Contact
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser, hasNexoraPremium } from "@/lib/nexora-auth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContactEntry {
  id: string;
  nom_prenom: string;
  whatsapp: string;
  plan: string;
  created_at: string;
}

interface DownloadRecord {
  last_download_at: string;
  last_download_count: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatWhatsApp(num: string): string {
  // Normalise : retire espaces, tirets, parenthèses
  return num.replace(/[\s\-().]/g, "");
}

/**
 * Génère un fichier .vcf (vCard) pour import dans les contacts téléphoniques
 * Chaque contact aura le nom "Prénom Nexora"
 */
function generateVCF(contacts: ContactEntry[]): string {
  return contacts
    .map((c) => {
      const firstName = c.nom_prenom.split(" ")[0];
      const displayName = `${firstName} Nexora`;
      const tel = formatWhatsApp(c.whatsapp);
      return [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${displayName}`,
        `N:Nexora;${firstName};;;`,
        `TEL;TYPE=CELL,PREF:${tel}`,
        `NOTE:Membre Nexora - ${c.plan}`,
        "END:VCARD",
      ].join("\r\n");
    })
    .join("\r\n");
}

/**
 * Déclenche le téléchargement d'un fichier dans le navigateur
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Composant Principal ──────────────────────────────────────────────────────

export default function ContactsWhatsAppPage() {
  const navigate  = useNavigate();
  const { toast } = useToast();
  const currentUser = getNexoraUser();
  const currentUserId = currentUser?.id;

  const [contacts,       setContacts]       = useState<ContactEntry[]>([]);
  const [downloadRecord, setDownloadRecord] = useState<DownloadRecord | null>(null);
  const [loading,        setLoading]        = useState(true);
  const [downloading,    setDownloading]    = useState(false);
  const [error,          setError]          = useState<string | null>(null);

  // ── Vérification premium ──────────────────────────────────────────────────
  const isPremium = hasNexoraPremium();

  // ── Chargement des données ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUserId || !isPremium) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError(null);

      try {
        const { data: users, error: usersError } = await (supabase as any)
          .from("nexora_users")
          .select("id, nom_prenom, whatsapp, plan, created_at")
          .not("whatsapp", "is", null)
          .neq("whatsapp", "")
          .order("created_at", { ascending: true });

        if (usersError) throw usersError;

        const { data: dlRecord } = await (supabase as any)
          .from("whatsapp_contacts_downloads")
          .select("last_download_at, last_download_count")
          .eq("user_id", currentUserId)
          .maybeSingle();

        if (!cancelled) {
          setContacts(users || []);
          setDownloadRecord(dlRecord || null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError("Impossible de charger les contacts. Vérifiez votre connexion.");
          console.error(err);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    return () => { cancelled = true; };
  }, [currentUserId, isPremium]);

  // ── Calcul des contacts nouveaux vs déjà téléchargés ─────────────────────
  const totalContacts = contacts.length;
  const alreadyDownloaded = downloadRecord?.last_download_count ?? 0;
  const isFirstDownload = !downloadRecord;

  // Les "nouveaux" contacts sont ceux créés après le dernier téléchargement
  const newContacts = downloadRecord
    ? contacts.filter(
        (c) => new Date(c.created_at) > new Date(downloadRecord.last_download_at)
      )
    : contacts;

  const newCount = newContacts.length;

  // ── Téléchargement ────────────────────────────────────────────────────────
  const handleDownload = async (type: "all" | "new") => {
    if (!currentUser) return;

    const targetContacts = type === "all" ? contacts : newContacts;
    if (targetContacts.length === 0) {
      toast({
        title: "Aucun contact à télécharger",
        description: type === "new"
          ? "Il n'y a pas de nouveaux membres depuis votre dernier téléchargement."
          : "Aucun contact avec numéro WhatsApp n'est disponible.",
        variant: "destructive",
      });
      return;
    }

    setDownloading(true);
    try {
      // Générer le fichier VCF
      const vcfContent = generateVCF(targetContacts);
      const date = new Date().toISOString().slice(0, 10);
      const filename =
        type === "all"
          ? `nexora-contacts-${date}.vcf`
          : `nexora-nouveaux-contacts-${date}.vcf`;

      downloadFile(vcfContent, filename, "text/vcard");

      // Mettre à jour ou créer l'enregistrement de téléchargement
      const upsertPayload = {
        user_id: currentUser.id,
        last_download_at: new Date().toISOString(),
        // On enregistre TOUJOURS le total actuel, pas seulement les nouveaux
        last_download_count: totalContacts,
      };

      const { error: upsertError } = await (supabase as any)
        .from("whatsapp_contacts_downloads")
        .upsert(upsertPayload, { onConflict: "user_id" });

      if (upsertError) throw upsertError;

      // Rafraîchir l'état local
      setDownloadRecord({
        last_download_at: upsertPayload.last_download_at,
        last_download_count: totalContacts,
      });

      toast({
        title: `✅ ${targetContacts.length} contact${targetContacts.length > 1 ? "s" : ""} téléchargé${targetContacts.length > 1 ? "s" : ""}`,
        description: "Importez le fichier .vcf dans vos contacts téléphoniques.",
      });
    } catch (err: any) {
      toast({
        title: "Erreur lors du téléchargement",
        description: err.message || "Une erreur inattendue s'est produite.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  // ── PremiumWall ───────────────────────────────────────────────────────────
  if (!isPremium) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-yellow-400 to-orange-400 flex items-center justify-center mb-6 shadow-lg">
            <Crown className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-black text-foreground mb-2">Fonctionnalité Premium</h2>
          <p className="text-muted-foreground text-sm mb-1 max-w-xs">
            L'accès aux contacts WhatsApp est réservé aux membres{" "}
            <span className="font-bold text-yellow-600">Premium</span>.
          </p>
          <p className="text-muted-foreground text-xs mb-8 max-w-xs">
            Passez au plan Boss ou Roi pour accéder à cette fonctionnalité.
          </p>
          <Button
            onClick={() => navigate("/abonnement")}
            className="flex items-center gap-2 bg-gradient-to-r from-yellow-400 to-orange-400 hover:from-yellow-500 hover:to-orange-500 text-white font-bold px-8 py-3 rounded-xl shadow-md"
          >
            <Crown className="w-4 h-4" /> Voir les plans
          </Button>
          <button
            onClick={() => navigate("/dashboard")}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Retour au tableau de bord
          </button>
        </div>
      </AppLayout>
    );
  }

  // ── Rendu Principal ───────────────────────────────────────────────────────
  return (
    <AppLayout>
      <div className="max-w-3xl mx-auto space-y-6">

        {/* ── En-tête ── */}
        <div>
          <h1 className="text-2xl font-black text-foreground flex items-center gap-2">
            <Phone className="w-6 h-6 text-green-500" />
            Contacts WhatsApp
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Exportez les membres Nexora vers votre répertoire
          </p>
        </div>

        {/* ── NB / Note importante ── */}
        <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-5 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm text-foreground">
            <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-black flex-shrink-0">NB</span>
            Note importante
          </div>
          <div className="space-y-2 text-sm text-muted-foreground leading-relaxed">
            <p>
              Nous mettons à votre disposition cette fonctionnalité afin de vous permettre de{" "}
              <strong className="text-foreground">communiquer entre utilisateurs</strong>, de partager des opportunités et de{" "}
              <strong className="text-foreground">promouvoir vos produits via les statuts WhatsApp</strong>.
            </p>
            <p>
              Nous accordons une importance particulière à la{" "}
              <strong className="text-foreground">confidentialité et à la sécurité des données</strong>.
              Chaque utilisateur est entièrement responsable de l'usage qu'il fait des contacts mis à disposition.
              Toute utilisation abusive ou non conforme aux règles engage uniquement la responsabilité de son auteur.
            </p>
            <p>
              Notre objectif est de vous offrir une meilleure{" "}
              <strong className="text-foreground">visibilité à travers les statuts WhatsApp</strong>{" "}
              ainsi que de faciliter les échanges et partenariats entre membres.
            </p>
            <p>
              Nous vous remercions de bien vouloir{" "}
              <strong className="text-foreground">respecter les règles établies</strong>.
            </p>
          </div>
        </div>

        {/* ── Erreur ── */}
        {error && (
          <div className="flex items-center gap-3 bg-destructive/10 border border-destructive/30 rounded-xl p-4 text-destructive text-sm">
            <WifiOff className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* ── Statistiques ── */}
        {!loading && !error && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Total membres */}
            <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground">{totalContacts}</div>
                <div className="text-xs text-muted-foreground">Total membres</div>
              </div>
            </div>

            {/* Nouveaux depuis dernier DL */}
            <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                <UserPlus className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground">{newCount}</div>
                <div className="text-xs text-muted-foreground">
                  {isFirstDownload ? "Disponibles" : "Nouveaux"}
                </div>
              </div>
            </div>

            {/* Déjà téléchargés */}
            <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="w-5 h-5 text-purple-500" />
              </div>
              <div>
                <div className="text-xl font-black text-foreground">{alreadyDownloaded}</div>
                <div className="text-xs text-muted-foreground">Déjà exportés</div>
              </div>
            </div>
          </div>
        )}

        {/* ── Infos sur le dernier téléchargement ── */}
        {downloadRecord && !loading && (
          <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-sm">
            <Wifi className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-muted-foreground">
              Dernier export le{" "}
              <span className="font-semibold text-foreground">
                {new Date(downloadRecord.last_download_at).toLocaleDateString("fr-FR", {
                  day: "2-digit", month: "long", year: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>{" "}
              — {alreadyDownloaded} contact{alreadyDownloaded > 1 ? "s" : ""} exporté{alreadyDownloaded > 1 ? "s" : ""}.
            </div>
          </div>
        )}

        {/* ── Boutons de téléchargement ── */}
        {!loading && !error && (
          <div className="grid sm:grid-cols-2 gap-4">

            {/* Télécharger les nouveaux */}
            <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center flex-shrink-0">
                  <UserPlus className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <div className="font-bold text-foreground text-sm">
                    {isFirstDownload ? "Premier export" : "Nouveaux membres"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {isFirstDownload
                      ? "Tous les contacts disponibles"
                      : "Membres inscrits après votre dernier export"}
                  </div>
                </div>
              </div>

              {newCount > 0 ? (
                <Badge
                  variant="secondary"
                  className="self-start bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20"
                >
                  {newCount} contact{newCount > 1 ? "s" : ""} disponible{newCount > 1 ? "s" : ""}
                </Badge>
              ) : (
                <Badge variant="secondary" className="self-start text-muted-foreground">
                  Aucun nouveau contact
                </Badge>
              )}

              <Button
                onClick={() => handleDownload("new")}
                disabled={downloading || newCount === 0}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                {isFirstDownload ? "Télécharger les contacts" : "Télécharger les nouveaux"}
              </Button>
            </div>

            {/* Télécharger tous les contacts */}
            {!isFirstDownload && (
              <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center flex-shrink-0">
                    <Contact className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-bold text-foreground text-sm">Tous les membres</div>
                    <div className="text-xs text-muted-foreground">
                      Export complet de tous les contacts
                    </div>
                  </div>
                </div>

                <Badge
                  variant="secondary"
                  className="self-start bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
                >
                  {totalContacts} contact{totalContacts > 1 ? "s" : ""} au total
                </Badge>

                <Button
                  onClick={() => handleDownload("all")}
                  disabled={downloading || totalContacts === 0}
                  variant="outline"
                  className="w-full font-semibold flex items-center gap-2 border-blue-500/30 text-blue-600 dark:text-blue-400 hover:bg-blue-500/10"
                >
                  <Download className="w-4 h-4" />
                  Télécharger tout
                </Button>
              </div>
            )}
          </div>
        )}

        {/* ── Skeleton de chargement ── */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-muted dark:bg-gray-800 animate-pulse"
              />
            ))}
          </div>
        )}

        {/* ── Guide d'utilisation ── */}
        {!loading && !error && totalContacts > 0 && (
          <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-amber-700 dark:text-amber-400">
              <AlertCircle className="w-4 h-4" />
              Comment importer les contacts ?
            </div>
            <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
              <li>Téléchargez le fichier <code className="bg-muted px-1 py-0.5 rounded text-xs">.vcf</code> ci-dessus</li>
              <li>
                <strong>Android :</strong> Ouvrez l'appli Contacts → Menu → Importer → Depuis stockage
              </li>
              <li>
                <strong>iPhone :</strong> Ouvrez le fichier .vcf reçu → "Ajouter tous les contacts"
              </li>
              <li>Les contacts apparaîtront avec le format <em>«&nbsp;Prénom Nexora&nbsp;»</em></li>
            </ol>
          </div>
        )}

        {/* ── Liste des contacts ── */}
        {!loading && !error && contacts.length > 0 && (
          <div className="bg-card dark:bg-gray-900 border border-border dark:border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-border dark:border-gray-800">
              <h3 className="font-bold text-sm text-foreground">
                Aperçu des contacts ({totalContacts})
              </h3>
            </div>
            <div className="divide-y divide-border dark:divide-gray-800 max-h-80 overflow-y-auto">
              {contacts.map((contact) => {
                const firstName = contact.nom_prenom.split(" ")[0];
                const isNew =
                  downloadRecord &&
                  new Date(contact.created_at) > new Date(downloadRecord.last_download_at);

                return (
                  <div
                    key={contact.id}
                    className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                      <Phone className="w-4 h-4 text-green-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm text-foreground truncate">
                        {firstName} Nexora
                      </div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {formatWhatsApp(contact.whatsapp)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isNew && (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-green-500/10 text-green-600 dark:text-green-400 border-green-500/20 px-1.5 py-0"
                        >
                          Nouveau
                        </Badge>
                      )}
                      <Badge
                        variant="secondary"
                        className="text-[10px] capitalize px-1.5 py-0"
                      >
                        {contact.plan}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Aucun contact ── */}
        {!loading && !error && totalContacts === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Phone className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-black text-foreground mb-1">
              Aucun fichier disponible à télécharger
            </h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Les membres qui renseignent leur numéro WhatsApp lors de l'inscription apparaîtront ici.
            </p>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
