import { useState } from "react";
import {
  X, Users, Crown, Shield, UserMinus, Mic, MicOff,
  LogOut, Lock, Unlock, ChevronRight
} from "lucide-react";
import type { GroupeConfig, GroupeMembre } from "@/hooks/useGroupe";

interface Props {
  config: GroupeConfig;
  membres: GroupeMembre[];
  monProfil: GroupeMembre;
  nbConnectes: number;
  isAdmin: boolean;
  onClose: () => void;
  onQuitter: () => void;
  onExpulser: (userId: string) => void;
  onNommerAdmin: (userId: string) => void;
  onRetirerAdmin: (userId: string) => void;
  onOuvrirFermer: (ouvert: boolean) => void;
  onCouperMicro: (userId: string, coupe: boolean) => void;
}

function Avatar({ src, nom, taille = 40 }: { src?: string | null; nom: string; taille?: number }) {
  const initiale = nom?.charAt(0).toUpperCase() || "?";
  const colors = ["#305CDE", "#8B5CF6", "#EC4899", "#F59E0B", "#10B981", "#EF4444"];
  const color = colors[nom.charCodeAt(0) % colors.length];
  if (src) return (
    <img src={src} alt={nom} style={{ width: taille, height: taille }}
      className="rounded-full object-cover flex-shrink-0" />
  );
  return (
    <div style={{ width: taille, height: taille, background: color }}
      className="rounded-full flex items-center justify-center flex-shrink-0">
      <span style={{ fontSize: taille * 0.4 }} className="text-white font-black">{initiale}</span>
    </div>
  );
}

export default function GroupeInfoPanel({
  config, membres, monProfil, nbConnectes, isAdmin,
  onClose, onQuitter, onExpulser, onNommerAdmin, onRetirerAdmin,
  onOuvrirFermer, onCouperMicro
}: Props) {
  const [confirmQuitter, setConfirmQuitter] = useState(false);
  const [menuMembre, setMenuMembre] = useState<string | null>(null);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#111b21] rounded-t-3xl sm:rounded-3xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col">

        {/* ── Header ── */}
        <div className="relative">
          {/* Fond dégradé */}
          <div className="h-24 bg-gradient-to-b from-[#1f2c34] to-[#111b21]" />
          <button onClick={onClose}
            className="absolute top-3 right-3 p-2 rounded-full bg-black/30 text-white hover:bg-black/50">
            <X className="w-5 h-5" />
          </button>

          {/* Logo + nom centré */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 flex flex-col items-center">
            <img src={config.logo_url} alt={config.nom}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-[#305CDE]/50 shadow-xl" />
          </div>
        </div>

        {/* Nom + statut */}
        <div className="px-5 pt-10 pb-4 text-center border-b border-white/5">
          <h2 className="text-white font-black text-lg leading-tight">{config.nom}</h2>
          {config.description && (
            <p className="text-gray-400 text-xs mt-1">{config.description}</p>
          )}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-[#25d366]" />
              <span className="text-xs text-gray-300">{membres.length} membres</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-[#25d366] animate-pulse" />
              <span className="text-xs text-gray-300">{nbConnectes} en ligne</span>
            </div>
            <div className="flex items-center gap-1.5">
              {config.est_ouvert
                ? <Unlock className="w-3.5 h-3.5 text-[#25d366]" />
                : <Lock className="w-3.5 h-3.5 text-red-400" />
              }
              <span className={`text-xs ${config.est_ouvert ? "text-[#25d366]" : "text-red-400"}`}>
                {config.est_ouvert ? "Ouvert" : "Fermé"}
              </span>
            </div>
          </div>
        </div>

        {/* ── Actions admin ── */}
        {isAdmin && (
          <div className="px-5 py-3 border-b border-white/5">
            <p className="text-[#305CDE] text-xs font-bold uppercase tracking-wider mb-2">
              Administration
            </p>
            <button
              onClick={() => onOuvrirFermer(!config.est_ouvert)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                config.est_ouvert
                  ? "bg-red-500/10 text-red-400 hover:bg-red-500/20"
                  : "bg-[#25d366]/10 text-[#25d366] hover:bg-[#25d366]/20"
              }`}
            >
              <span className="flex items-center gap-2">
                {config.est_ouvert ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                {config.est_ouvert ? "Fermer le groupe" : "Ouvrir le groupe"}
              </span>
              <ChevronRight className="w-4 h-4 opacity-50" />
            </button>
          </div>
        )}

        {/* ── Liste membres ── */}
        <div className="flex-1 overflow-y-auto">
          <p className="px-5 pt-4 pb-2 text-[#305CDE] text-xs font-bold uppercase tracking-wider">
            Membres ({membres.length})
          </p>
          {membres.map(m => (
            <div key={m.id} className="relative">
              <div
                onClick={() => isAdmin && m.user_id !== monProfil.user_id && setMenuMembre(prev => prev === m.user_id ? null : m.user_id)}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-white/5 transition-colors ${
                  isAdmin && m.user_id !== monProfil.user_id ? "cursor-pointer" : ""
                }`}
              >
                <div className="relative">
                  <Avatar src={m.avatar_url} nom={m.nom_prenom} taille={42} />
                  {m.est_en_ligne && (
                    <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#25d366] border-2 border-[#111b21]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white text-sm font-semibold truncate">{m.nom_prenom}</span>
                    {m.user_id === monProfil.user_id && (
                      <span className="text-[10px] text-gray-400">(vous)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {m.role === "admin" && (
                      <span className="flex items-center gap-1 text-[10px] text-[#305CDE] font-bold">
                        <Crown className="w-2.5 h-2.5" />Admin
                      </span>
                    )}
                    {m.micro_coupe && (
                      <span className="flex items-center gap-1 text-[10px] text-red-400">
                        <MicOff className="w-2.5 h-2.5" />Micro coupé
                      </span>
                    )}
                    <span className={`text-[10px] ${m.est_en_ligne ? "text-[#25d366]" : "text-gray-500"}`}>
                      {m.est_en_ligne ? "en ligne" : "hors ligne"}
                    </span>
                  </div>
                </div>
                {isAdmin && m.user_id !== monProfil.user_id && (
                  <ChevronRight className="w-4 h-4 text-gray-600 flex-shrink-0" />
                )}
              </div>

              {/* Menu actions admin pour ce membre */}
              {menuMembre === m.user_id && isAdmin && (
                <div className="mx-5 mb-2 bg-[#1f2c34] rounded-2xl overflow-hidden border border-white/10">
                  {m.role !== "admin" ? (
                    <button
                      onClick={() => { onNommerAdmin(m.user_id); setMenuMembre(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-[#305CDE] hover:bg-white/5 transition-colors"
                    >
                      <Crown className="w-4 h-4" />
                      Nommer administrateur
                    </button>
                  ) : (
                    <button
                      onClick={() => { onRetirerAdmin(m.user_id); setMenuMembre(null); }}
                      className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-amber-400 hover:bg-white/5 transition-colors"
                    >
                      <Shield className="w-4 h-4" />
                      Retirer admin
                    </button>
                  )}
                  <button
                    onClick={() => { onCouperMicro(m.user_id, !m.micro_coupe); setMenuMembre(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-gray-300 hover:bg-white/5 border-t border-white/5 transition-colors"
                  >
                    {m.micro_coupe ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
                    {m.micro_coupe ? "Réactiver micro" : "Couper micro"}
                  </button>
                  <button
                    onClick={() => { onExpulser(m.user_id); setMenuMembre(null); }}
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 border-t border-white/5 transition-colors"
                  >
                    <UserMinus className="w-4 h-4" />
                    Expulser du groupe
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Quitter ── */}
        {monProfil.role !== "admin" && (
          <div className="px-5 py-4 border-t border-white/5">
            {!confirmQuitter ? (
              <button
                onClick={() => setConfirmQuitter(true)}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors font-semibold text-sm"
              >
                <LogOut className="w-4 h-4" />
                Quitter le groupe
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  onClick={() => setConfirmQuitter(false)}
                  className="flex-1 py-3 rounded-2xl border border-white/10 text-gray-300 text-sm font-semibold hover:bg-white/5 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={onQuitter}
                  className="flex-1 py-3 rounded-2xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                >
                  Confirmer
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
