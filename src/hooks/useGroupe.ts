import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

export interface GroupeConfig {
  id: string;
  nom: string;
  logo_url: string;
  description: string;
  est_ouvert: boolean;
}


export interface GroupeMembre {
  id: string;
  user_id: string;
  nom_prenom: string;
  username: string;
  avatar_url?: string | null;
  role: "admin" | "membre";
  est_en_ligne: boolean;
  derniere_activite: string;
  rejoint_le: string;
  micro_coupe: boolean;
}

export interface GroupeMessage {
  id: string;
  user_id: string;
  nom_prenom: string;
  username: string;
  avatar_url?: string | null;
  contenu: string | null;
  type: "texte" | "image" | "video" | "audio" | "fichier" | "sticker";
  media_url?: string | null;
  media_nom?: string | null;
  media_taille?: number | null;
  media_duree?: number | null;
  vue_unique: boolean;
  vue_unique_lu: boolean;
  modifie: boolean;
  supprime: boolean;
  reactions: { emoji: string; user_id: string }[];
  created_at: string;
  updated_at: string;
}

export function useGroupe() {
  const user = getNexoraUser();
  const [config, setConfig] = useState<GroupeConfig | null>(null);
  const [messages, setMessages] = useState<GroupeMessage[]>([]);
  const [membres, setMembres] = useState<GroupeMembre[]>([]);
  const [monProfil, setMonProfil] = useState<GroupeMembre | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);
  const channelRef = useRef<any>(null);

  const db = supabase as any;

  // ── Charger config + membres + messages ──────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    const [{ data: cfg }, { data: msgs }, { data: mbrs }] = await Promise.all([
      db.from("groupe_config").select("*").maybeSingle(),
      db.from("groupe_messages").select("*").order("created_at", { ascending: true }),
      db.from("groupe_membres").select("*").order("rejoint_le", { ascending: true }),
    ]);

    if (cfg)  setConfig(cfg);
    setMessages(msgs || []);
    const membresList = mbrs || [];
    setMembres(membresList);
    setMonProfil(membresList.find((m: GroupeMembre) => m.user_id === user.id) || null);
    setLoading(false);
  }, [user?.id]);

  // ── Rejoindre le groupe ──────────────────────────────────────────────────────
  const rejoindre = useCallback(async () => {
    if (!user) return;
    const isAdmin = user.is_admin;

    const { data, error } = await db.from("groupe_membres").upsert({
      user_id: user.id,
      nom_prenom: user.nom_prenom,
      username: user.username,
      avatar_url: user.avatar_url || null,
      role: isAdmin ? "admin" : "membre",
      est_en_ligne: true,
      derniere_activite: new Date().toISOString(),
    }, { onConflict: "user_id" }).select().single();

    if (error) {
      console.error("Erreur rejoindre:", error);
      return;
    }

    // On applique le profil réel retourné par Supabase (pas un temp id)
    if (data) {
      setMonProfil(data);
      setMembres(prev => {
        if (prev.find(m => m.user_id === data.user_id)) {
          return prev.map(m => m.user_id === data.user_id ? data : m);
        }
        return [...prev, data];
      });
    }

    // Recharger les messages et membres en arrière-plan sans toucher à monProfil
    const [{ data: msgs }, { data: mbrs }] = await Promise.all([
      db.from("groupe_messages").select("*").order("created_at", { ascending: true }),
      db.from("groupe_membres").select("*").order("rejoint_le", { ascending: true }),
    ]);
    if (msgs) setMessages(msgs);
    if (mbrs) {
      setMembres(mbrs);
      // Retrouver le profil dans la liste fraîche sans écraser si absent
      const monMembreFrais = mbrs.find((m: GroupeMembre) => m.user_id === user.id);
      if (monMembreFrais) setMonProfil(monMembreFrais);
    }
  }, [user]);

  // ── Quitter le groupe ────────────────────────────────────────────────────────
  const quitter = useCallback(async () => {
    if (!user) return;
    await db.from("groupe_membres").delete().eq("user_id", user.id);
    setMonProfil(null);
  }, [user]);

  // ── Envoyer un message ───────────────────────────────────────────────────────
  const envoyerMessage = useCallback(async (opts: {
    contenu?: string;
    type?: GroupeMessage["type"];
    media_url?: string;
    media_nom?: string;
    media_taille?: number;
    media_duree?: number;
    vue_unique?: boolean;
  }) => {
    if (!user || !monProfil) return;
    const payload = {
      user_id: user.id,
      nom_prenom: user.nom_prenom,
      username: user.username,
      avatar_url: user.avatar_url || null,
      contenu: opts.contenu || null,
      type: opts.type || "texte",
      media_url: opts.media_url || null,
      media_nom: opts.media_nom || null,
      media_taille: opts.media_taille || null,
      media_duree: opts.media_duree || null,
      vue_unique: opts.vue_unique || false,
      vue_unique_lu: false,
      modifie: false,
      supprime: false,
      reactions: [],
    };
    const { data } = await db.from("groupe_messages").insert(payload).select().single();
    if (data) setMessages(prev => [...prev, data]);
    return data;
  }, [user, monProfil]);

  // ── Modifier un message ──────────────────────────────────────────────────────
  const modifierMessage = useCallback(async (id: string, contenu: string) => {
    const { data } = await db.from("groupe_messages")
      .update({ contenu, modifie: true, updated_at: new Date().toISOString() })
      .eq("id", id).select().single();
    if (data) setMessages(prev => prev.map(m => m.id === id ? data : m));
  }, []);

  // ── Supprimer un message ─────────────────────────────────────────────────────
  const supprimerMessage = useCallback(async (id: string) => {
    await db.from("groupe_messages")
      .update({ supprime: true, contenu: null, media_url: null })
      .eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, supprime: true, contenu: null, media_url: null } : m));
  }, []);

  // ── Upload média ─────────────────────────────────────────────────────────────
  const uploadMedia = useCallback(async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop();
    const path = `groupe/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;
    setUploadProgress(10);
    const { data, error } = await db.storage.from("groupe-medias").upload(path, file, {
      cacheControl: "3600", upsert: false,
    });
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 1000);
    if (error) return null;
    const { data: urlData } = db.storage.from("groupe-medias").getPublicUrl(path);
    return urlData?.publicUrl || null;
  }, []);

  // ── Actions admin ────────────────────────────────────────────────────────────
  const expulserMembre = useCallback(async (userId: string) => {
    await db.from("groupe_membres").delete().eq("user_id", userId);
    setMembres(prev => prev.filter(m => m.user_id !== userId));
  }, []);

  const nommerAdmin = useCallback(async (userId: string) => {
    await db.from("groupe_membres").update({ role: "admin" }).eq("user_id", userId);
    setMembres(prev => prev.map(m => m.user_id === userId ? { ...m, role: "admin" as const } : m));
  }, []);

  const retirerAdmin = useCallback(async (userId: string) => {
    await db.from("groupe_membres").update({ role: "membre" }).eq("user_id", userId);
    setMembres(prev => prev.map(m => m.user_id === userId ? { ...m, role: "membre" as const } : m));
  }, []);

  const ouvrirFermerGroupe = useCallback(async (ouvert: boolean) => {
    await db.from("groupe_config").update({ est_ouvert: ouvert }).eq("id", config?.id);
    setConfig(prev => prev ? { ...prev, est_ouvert: ouvert } : prev);
  }, [config?.id]);

  const couperMicro = useCallback(async (userId: string, coupe: boolean) => {
    await db.from("groupe_membres").update({ micro_coupe: coupe }).eq("user_id", userId);
    setMembres(prev => prev.map(m => m.user_id === userId ? { ...m, micro_coupe: coupe } : m));
  }, []);

  // ── Marquer vue unique ────────────────────────────────────────────────────────
  const marquerVueUnique = useCallback(async (id: string) => {
    await db.from("groupe_messages").update({ vue_unique_lu: true }).eq("id", id);
    setMessages(prev => prev.map(m => m.id === id ? { ...m, vue_unique_lu: true } : m));
  }, []);

  // ── Realtime ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    load();

    // Marquer en ligne
    db.from("groupe_membres").update({
      est_en_ligne: true, derniere_activite: new Date().toISOString()
    }).eq("user_id", user.id);

    // Subscription realtime
    const channel = db.channel("groupe-realtime")
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "groupe_messages"
      }, (payload: any) => {
        setMessages(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "groupe_messages"
      }, (payload: any) => {
        setMessages(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "groupe_membres"
      }, (payload: any) => {
        setMembres(prev => {
          if (prev.find(m => m.id === payload.new.id)) return prev;
          return [...prev, payload.new];
        });
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "groupe_membres"
      }, (payload: any) => {
        setMembres(prev => prev.map(m => m.id === payload.new.id ? payload.new : m));
        if (payload.new.user_id === user.id) setMonProfil(payload.new);
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "groupe_membres"
      }, (payload: any) => {
        setMembres(prev => prev.filter(m => m.id !== payload.old.id));
        // Ne pas réinitialiser monProfil ici : c'est géré par quitter() explicitement
        // pour éviter qu'un upsert (DELETE+INSERT interne) ferme la page
      })
      .on("postgres_changes", {
        event: "UPDATE", schema: "public", table: "groupe_config"
      }, (payload: any) => {
        setConfig(payload.new);
      })
      .subscribe();

    
    channelRef.current = channel;

    // Heartbeat online
    const heartbeat = setInterval(() => {
      db.from("groupe_membres").update({
        est_en_ligne: true, derniere_activite: new Date().toISOString()
      }).eq("user_id", user.id);
    }, 30000);

    // Marquer hors ligne au départ
    const handleUnload = () => {
      db.from("groupe_membres").update({ est_en_ligne: false }).eq("user_id", user.id);
    };
    window.addEventListener("beforeunload", handleUnload);

    return () => {
      clearInterval(heartbeat);
      window.removeEventListener("beforeunload", handleUnload);
      db.removeChannel(channel);
    };
  }, [user?.id]);

  const isAdmin = monProfil?.role === "admin";
  const estMembre = !!monProfil;
  const nbConnectes = membres.filter(m => m.est_en_ligne).length;

  return {
    config, messages, membres, monProfil, loading,
    isAdmin, estMembre, nbConnectes, uploadProgress,
    load, rejoindre, quitter,
    envoyerMessage, modifierMessage, supprimerMessage,
    uploadMedia, marquerVueUnique,
    expulserMembre, nommerAdmin, retirerAdmin,
    ouvrirFermerGroupe, couperMicro,
  };
}
