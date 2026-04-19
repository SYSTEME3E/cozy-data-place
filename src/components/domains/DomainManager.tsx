// src/components/domains/DomainManager.tsx
// Composant principal de gestion des domaines personnalisés

import { useState } from "react";
import {
  Globe, Plus, Trash2, RefreshCw, CheckCircle2,
  Clock, AlertCircle, Copy, ChevronDown, ChevronUp,
  ExternalLink, Shield, Zap, X, Info
} from "lucide-react";
import { useDomains, type Domain, type PageType } from "@/hooks/useDomains";
import { useToast } from "@/hooks/use-toast";

// ── Helpers visuels ────────────────────────────────────────

const STATUS_CONFIG: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  pending: {
    label: "En attente",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: <Clock className="w-3.5 h-3.5" />,
  },
  verified: {
    label: "Vérifié",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  active: {
    label: "Actif",
    color: "text-emerald-600",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: <CheckCircle2 className="w-3.5 h-3.5" />,
  },
  error: {
    label: "Erreur",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <AlertCircle className="w-3.5 h-3.5" />,
  },
};

const PAGE_TYPE_LABELS: Record<PageType, string> = {
  boutique: "🛍️ Boutique",
  immobilier: "🏠 Immobilier",
  tunnel: "⚡ Tunnel de vente",
};

// ── Sous-composant : Badge statut ─────────────────────────

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.pending;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color} ${cfg.border}`}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ── Sous-composant : Instructions DNS ─────────────────────

function DNSInstructionsPanel({ domain }: { domain: Domain }) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);

  const APP_HOSTNAME = import.meta.env.VITE_APP_HOSTNAME || "app.nexora.com";
  const SERVER_IP    = import.meta.env.VITE_SERVER_IP    || "X.X.X.X";

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copié !", description: text });
  };

  const CopyRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0">
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <p className="text-sm font-mono text-gray-800 truncate">{value}</p>
      </div>
      <button
        onClick={() => copy(value)}
        className="flex-shrink-0 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <Copy className="w-3.5 h-3.5" />
      </button>
    </div>
  );

  return (
    <div className="mt-3 rounded-xl border border-gray-200 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-sm font-semibold text-gray-700"
      >
        <span className="flex items-center gap-2">
          <Info className="w-4 h-4 text-blue-500" />
          Instructions de configuration DNS
        </span>
        {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>

      {open && (
        <div className="p-4 space-y-5 bg-white">

          {/* Étape 1 : Vérification TXT */}
          {domain.status === "pending" && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-white text-xs font-black flex items-center justify-center">1</span>
                <p className="text-sm font-bold text-gray-700">Vérification de propriété (enregistrement TXT)</p>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Ajoutez cet enregistrement TXT chez votre registrar (Namecheap, GoDaddy, OVH…)
              </p>
              <div className="bg-gray-50 rounded-xl p-3">
                <CopyRow label="Type" value="TXT" />
                <CopyRow label="Hôte / Name" value={domain.domain_name} />
                <CopyRow label="Valeur / Value" value={domain.verification_token} />
                <CopyRow label="TTL" value="3600" />
              </div>
            </div>
          )}

          {/* Étape 2 : CNAME */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-xs font-black flex items-center justify-center">
                {domain.status === "pending" ? "2" : "1"}
              </span>
              <p className="text-sm font-bold text-gray-700">Pointer vers Nexora (CNAME recommandé)</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Pour <strong>www.{domain.domain_name}</strong> — recommandé si votre registrar le supporte
            </p>
            <div className="bg-blue-50 rounded-xl p-3">
              <CopyRow label="Type" value="CNAME" />
              <CopyRow label="Hôte / Name" value={`www.${domain.domain_name}`} />
              <CopyRow label="Valeur / Value" value={APP_HOSTNAME} />
              <CopyRow label="TTL" value="3600" />
            </div>
          </div>

          {/* Étape 2 alternative : A record */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs font-black flex items-center justify-center">
                {domain.status === "pending" ? "2b" : "1b"}
              </span>
              <p className="text-sm font-bold text-gray-700">Alternative : A Record (domaine racine)</p>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Pour le domaine racine <strong>{domain.domain_name}</strong> sans www
            </p>
            <div className="bg-purple-50 rounded-xl p-3">
              <CopyRow label="Type" value="A" />
              <CopyRow label="Hôte / Name" value={domain.domain_name} />
              <CopyRow label="Valeur / Value" value={SERVER_IP} />
              <CopyRow label="TTL" value="3600" />
            </div>
          </div>

          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
            <Clock className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              <strong>Propagation DNS :</strong> Les changements DNS peuvent prendre de 5 minutes à 48 heures selon votre registrar.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sous-composant : Carte domaine ────────────────────────

function DomainCard({ domain, onVerify, onCheckDNS, onDelete, actionLoading }: {
  domain: Domain;
  onVerify: () => void;
  onCheckDNS: () => void;
  onDelete: () => void;
  actionLoading: string | null;
}) {
  const isVerifying   = actionLoading === domain.id;
  const isCheckingDNS = actionLoading === domain.id + "-dns";
  const isDeleting    = actionLoading === domain.id + "-delete";
  const isLoading     = isVerifying || isCheckingDNS || isDeleting;

  return (
    <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center flex-shrink-0">
            <Globe className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-gray-800 text-sm truncate">{domain.domain_name}</p>
            <div className="flex items-center gap-1 mt-0.5 flex-wrap">
              <span className="text-xs bg-pink-50 text-pink-600 font-medium px-1.5 py-0.5 rounded-md">🛍️ Boutique</span>
              <span className="text-xs bg-green-50 text-green-600 font-medium px-1.5 py-0.5 rounded-md">🏠 Immobilier</span>
              <span className="text-xs bg-yellow-50 text-yellow-600 font-medium px-1.5 py-0.5 rounded-md">⚡ Tunnel</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <StatusBadge status={domain.status} />
          {domain.status === "active" && (
            <a
              href={`https://${domain.domain_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="px-4 py-3 space-y-3">

        {/* SSL Badge */}
        {domain.status === "active" && (
          <div className={`flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-lg w-fit ${
            domain.ssl_status === "active"
              ? "bg-emerald-50 text-emerald-700"
              : "bg-amber-50 text-amber-700"
          }`}>
            <Shield className="w-3.5 h-3.5" />
            {domain.ssl_status === "active" ? "SSL Actif (HTTPS)" : "SSL en cours…"}
          </div>
        )}

        {/* Boutons d'action selon le statut */}
        <div className="flex gap-2 flex-wrap">
          {domain.status === "pending" && (
            <button
              onClick={onVerify}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-500 text-white text-xs font-bold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {isVerifying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <CheckCircle2 className="w-3.5 h-3.5" />
              )}
              {isVerifying ? "Vérification…" : "Vérifier la propriété"}
            </button>
          )}

          {domain.status === "verified" && (
            <button
              onClick={onCheckDNS}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold hover:bg-indigo-600 active:scale-95 transition-all disabled:opacity-50"
            >
              {isCheckingDNS ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5" />
              )}
              {isCheckingDNS ? "Vérification DNS…" : "Vérifier le DNS"}
            </button>
          )}

          {domain.status === "active" && (
            <button
              onClick={onCheckDNS}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-gray-100 text-gray-600 text-xs font-bold hover:bg-gray-200 active:scale-95 transition-all disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCheckingDNS ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          )}

          <button
            onClick={onDelete}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 text-red-500 text-xs font-bold hover:bg-red-100 active:scale-95 transition-all disabled:opacity-50 ml-auto"
          >
            {isDeleting ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Trash2 className="w-3.5 h-3.5" />
            )}
            Supprimer
          </button>
        </div>

        {/* Instructions DNS */}
        <DNSInstructionsPanel domain={domain} />
      </div>
    </div>
  );
}

// ── Formulaire d'ajout ─────────────────────────────────────

function AddDomainForm({ onAdd, loading }: {
  onAdd: (domain: string) => Promise<void>;
  loading: boolean;
}) {
  const [domain, setDomain] = useState("");
  const [open, setOpen]     = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domain.trim()) return;
    await onAdd(domain.trim());
    setDomain("");
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-blue-200 text-blue-500 hover:border-blue-400 hover:bg-blue-50 font-semibold text-sm transition-all"
      >
        <Plus className="w-4 h-4" /> Ajouter un domaine personnalisé
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <p className="font-bold text-gray-800 text-sm flex items-center gap-2">
          <Globe className="w-4 h-4 text-blue-500" /> Nouveau domaine
        </p>
        <button type="button" onClick={() => setOpen(false)} className="p-1 rounded-lg hover:bg-gray-200 text-gray-400">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div>
        <label className="text-xs font-semibold text-gray-600">Nom de domaine *</label>
        <input
          value={domain}
          onChange={e => setDomain(e.target.value)}
          placeholder="monsite.com"
          required
          className="mt-1 w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:border-blue-400 transition-colors"
        />
        <p className="text-xs text-gray-400 mt-1">Sans http:// ni www — ex: monsite.com</p>
      </div>

      {/* Info : le domaine couvre automatiquement les 3 types */}
      <div className="flex items-start gap-2 bg-white border border-blue-100 rounded-xl p-3">
        <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          Votre domaine couvrira automatiquement <strong>Boutique</strong>, <strong>Immobilier</strong> et <strong>Tunnel de vente</strong>.
        </p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="submit"
          disabled={loading || !domain.trim()}
          className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-bold hover:bg-blue-600 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {loading ? "Ajout en cours…" : "Ajouter le domaine"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-100 transition-colors"
        >
          Annuler
        </button>
      </div>
    </form>
  );
}

// ══════════════════════════════════════════════════════════
// COMPOSANT PRINCIPAL
// ══════════════════════════════════════════════════════════

export default function DomainManager() {
  const { toast } = useToast();
  const {
    domains, loading, actionLoading, error,
    addDomain, verifyDomain, checkDNS, deleteDomain,
  } = useDomains();

  const handleAdd = async (domain: string) => {
    try {
      const result = await addDomain(domain);
      toast({
        title: "✅ Domaine ajouté !",
        description: `Configurez maintenant votre DNS pour ${result.domain.domain_name}`,
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
      throw err;
    }
  };

  const handleVerify = async (domainId: string) => {
    try {
      const result = await verifyDomain(domainId);
      toast({
        title: result.success ? "✅ Vérifié !" : "⏳ Pas encore",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erreur DNS", description: err.message, variant: "destructive" });
    }
  };

  const handleCheckDNS = async (domainId: string) => {
    try {
      const result = await checkDNS(domainId);
      toast({
        title: result.success ? "✅ DNS configuré !" : "⏳ DNS en attente",
        description: result.message,
        variant: result.success ? "default" : "destructive",
      });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (domainId: string, domainName: string) => {
    if (!confirm(`Supprimer ${domainName} ? Cette action est irréversible.`)) return;
    try {
      await deleteDomain(domainId);
      toast({ title: "Domaine supprimé" });
    } catch (err: any) {
      toast({ title: "Erreur", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-4">
      {/* En-tête section */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
          <Globe className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="font-black text-gray-800">Domaines personnalisés</h3>
          <p className="text-xs text-gray-400">Connectez votre propre nom de domaine à vos pages Nexora</p>
        </div>
      </div>

      {/* Formulaire ajout */}
      <AddDomainForm
        onAdd={handleAdd}
        loading={actionLoading === "add"}
      />

      {/* Erreur globale */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Liste des domaines */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="rounded-2xl border border-gray-100 bg-gray-50 h-24 animate-pulse" />
          ))}
        </div>
      ) : domains.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <Globe className="w-10 h-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Aucun domaine configuré</p>
          <p className="text-xs mt-1">Ajoutez votre premier domaine personnalisé</p>
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map(domain => (
            <DomainCard
              key={domain.id}
              domain={domain}
              actionLoading={actionLoading}
              onVerify={() => handleVerify(domain.id)}
              onCheckDNS={() => handleCheckDNS(domain.id)}
              onDelete={() => handleDelete(domain.id, domain.domain_name)}
            />
          ))}
        </div>
      )}

      {/* Note de bas de section */}
      <div className="flex items-start gap-2 bg-gray-50 border border-gray-200 rounded-xl p-3">
        <Shield className="w-4 h-4 text-gray-400 flex-shrink-0 mt-0.5" />
        <p className="text-xs text-gray-500">
          <strong>SSL automatique :</strong> Un certificat HTTPS est généré automatiquement dès que votre domaine est actif.
          Tous les domaines sont protégés contre le spoofing grâce à la vérification TXT.
        </p>
      </div>
    </div>
  );
}
