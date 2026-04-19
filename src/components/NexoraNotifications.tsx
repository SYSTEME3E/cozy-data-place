import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";
import { Bell, X, AlertTriangle, CheckCircle, Info, XCircle, ShoppingBag } from "lucide-react";
import { createPortal } from "react-dom";

interface Notification {
  id: string;
  titre: string;
  message: string;
  type: string;
  lu: boolean;
  created_at: string;
}

const TYPE_CONFIG: Record<string, { bg: string; icon: any; color: string; darkBg: string }> = {
  success:  { bg: "bg-green-50 border-green-200",   darkBg: "dark:bg-green-950/50 dark:border-green-800",   icon: CheckCircle,   color: "text-green-600 dark:text-green-400"  },
  warning:  { bg: "bg-yellow-50 border-yellow-200",  darkBg: "dark:bg-yellow-950/50 dark:border-yellow-800", icon: AlertTriangle, color: "text-yellow-600 dark:text-yellow-400" },
  danger:   { bg: "bg-red-50 border-red-200",        darkBg: "dark:bg-red-950/50 dark:border-red-800",       icon: XCircle,       color: "text-red-600 dark:text-red-400"    },
  info:     { bg: "bg-blue-50 border-blue-200",      darkBg: "dark:bg-blue-950/50 dark:border-blue-800",     icon: Info,          color: "text-blue-600 dark:text-blue-400"    },
  commande: { bg: "bg-pink-50 border-pink-200",      darkBg: "dark:bg-pink-950/50 dark:border-pink-800",     icon: ShoppingBag,   color: "text-pink-600 dark:text-pink-400"    },
};

function playOrderSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, start: number, duration: number, volume = 0.3) => {
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
      gain.gain.setValueAtTime(0, ctx.currentTime + start);
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + start + 0.02);
      gain.gain.linearRampToValueAtTime(0, ctx.currentTime + start + duration);
      osc.start(ctx.currentTime + start); osc.stop(ctx.currentTime + start + duration + 0.05);
    };
    playTone(523, 0.0, 0.15, 0.3); playTone(659, 0.18, 0.15, 0.3);
    playTone(784, 0.36, 0.15, 0.3); playTone(1047, 0.54, 0.3, 0.4);
  } catch {}
}

function playNotifSound() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination); osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(660, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}

export default function NexoraNotifications() {
  const user = getNexoraUser();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen]       = useState(false);
  const [visible, setVisible] = useState<Notification | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bellRef    = useRef<HTMLButtonElement>(null);
  const [panelPos, setPanelPos] = useState({ top: 64, right: 16 });

  const loadNotifs = async () => {
    if (!user?.id) return;
    const { data } = await supabase
      .from("nexora_notifications" as any)
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30);
    setNotifications((data as unknown as Notification[]) || []);
  };

  useEffect(() => {
    if (!user?.id) return;
    loadNotifs();

    const notifChannel = supabase
      .channel("notifs_" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "nexora_notifications",
        filter: `user_id=eq.${user.id}`,
      }, (payload) => {
        const notif = payload.new as Notification;
        setNotifications(prev => [notif, ...prev]);
        showToast(notif);
        if (notif.type === "commande") playOrderSound();
        else playNotifSound();
      })
      .subscribe();

    const commandeChannel = supabase
      .channel("commandes_vendeur_" + user.id)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "commandes" }, async (payload) => {
        const cmd = payload.new as any;
        const { data: boutique } = await supabase.from("boutiques" as any)
          .select("id, nom").eq("id", cmd.boutique_id).eq("user_id", user.id).maybeSingle();
        if (!boutique) return;
        await supabase.from("nexora_notifications" as any).insert({
          user_id: user.id,
          titre: "Nouvelle commande reçue !",
          message: `${cmd.client_nom} vient de commander ${Math.round(cmd.total).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ")} ${cmd.devise || "FCFA"} sur ${(boutique as any).nom}`,
          type: "commande", lu: false,
        });
      })
      .subscribe();

    // ── Canal admin : achats formations ──────────────────────────────────────
    const adminFormationChannel = supabase
      .channel("admin_formation_purchases_" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "formation_purchases",
      }, async (payload) => {
        const purchase = payload.new as any;
        if (purchase.status !== "completed") return;
        // Vérifier si l'utilisateur est admin
        const { data: me } = await supabase
          .from("nexora_users" as any).select("is_admin").eq("id", user.id).maybeSingle();
        if (!(me as any)?.is_admin) return;
        // Récupérer infos formation
        const { data: fm } = await supabase
          .from("formations" as any).select("titre").eq("id", purchase.formation_id).maybeSingle();
        const titre = (fm as any)?.titre ?? "une formation";
        const notif: Notification = {
          id: `fp_${purchase.id}`,
          titre: "🎓 Achat de formation",
          message: `Quelqu'un a acheté "${titre}" — ${purchase.amount} ${purchase.currency || "XOF"}`,
          type: "success",
          lu: false,
          created_at: new Date().toISOString(),
        };
        setNotifications(prev => [notif, ...prev]);
        showToast(notif);
        playOrderSound();
      })
      .subscribe();

    // ── Canal admin : nouvelles commissions ───────────────────────────────────
    const adminCommissionChannel = supabase
      .channel("admin_commissions_" + user.id)
      .on("postgres_changes", {
        event: "INSERT", schema: "public",
        table: "mlm_commissions",
      }, async (payload) => {
        const commission = payload.new as any;
        // Vérifier si l'utilisateur est admin
        const { data: me } = await supabase
          .from("nexora_users" as any).select("is_admin").eq("id", user.id).maybeSingle();
        if (!(me as any)?.is_admin) return;
        const typeLabel = commission.type === "formation" ? "Formation" : "Abonnement";
        const notif: Notification = {
          id: `cm_${commission.id}`,
          titre: `💰 Commission ${typeLabel}`,
          message: `Niveau ${commission.level === 0 ? "Vendeur" : commission.level} — +${commission.amount} ${commission.currency || "XOF"}`,
          type: "success",
          lu: false,
          created_at: new Date().toISOString(),
        };
        setNotifications(prev => [notif, ...prev]);
        showToast(notif);
        playNotifSound();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notifChannel);
      supabase.removeChannel(commandeChannel);
      supabase.removeChannel(adminFormationChannel);
      supabase.removeChannel(adminCommissionChannel);
    };
  }, [user?.id]);

  // Calcule la position du panel par rapport à la cloche
  const handleOpen = () => {
    if (!open && bellRef.current) {
      const rect = bellRef.current.getBoundingClientRect();
      const panelWidth = 320;
      const rightEdge = window.innerWidth - rect.right;
      setPanelPos({
        top: rect.bottom + 8,
        right: Math.max(8, rightEdge - 4),
      });
    }
    setOpen(prev => !prev);
    if (!open) loadNotifs();
  };

  const showToast = (notif: Notification) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setVisible(notif);
    toastTimer.current = setTimeout(() => setVisible(null), 6000);
  };

  const markAsRead = async (id: string) => {
    await supabase.from("nexora_notifications" as any).update({ lu: true }).eq("id", id);
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, lu: true } : n));
  };

  const markAllRead = async () => {
    if (!user?.id) return;
    await supabase.from("nexora_notifications" as any).update({ lu: true }).eq("user_id", user.id).eq("lu", false);
    setNotifications(prev => prev.map(n => ({ ...n, lu: true })));
  };

  const deleteNotif = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("nexora_notifications" as any).delete().eq("id", id);
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const unreadCount = notifications.filter(n => !n.lu).length;

  return (
    <>
      <style>{`
        @keyframes slideDown {
          from { transform: translate(-50%, -30px); opacity: 0; }
          to   { transform: translate(-50%, 0);     opacity: 1; }
        }
        @keyframes notifPanelIn {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>

      {/* ── Toast flottant via portal — au-dessus de TOUT ── */}
      {visible && createPortal(
        <div
          className={`fixed top-4 left-1/2 -translate-x-1/2 w-[92vw] max-w-sm border-2 rounded-2xl p-4 shadow-2xl flex items-start gap-3 ${(TYPE_CONFIG[visible.type] || TYPE_CONFIG.info).bg} ${(TYPE_CONFIG[visible.type] || TYPE_CONFIG.info).darkBg}`}
          style={{ zIndex: 2147483647, animation: "slideDown 0.35s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          {(() => {
            const cfg = TYPE_CONFIG[visible.type] || TYPE_CONFIG.info;
            const Icon = cfg.icon;
            return (
              <>
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${visible.type === "commande" ? "bg-pink-100 dark:bg-pink-900/50" : "bg-white dark:bg-gray-800"} shadow-sm`}>
                  <Icon className={`w-5 h-5 ${cfg.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-black text-sm text-gray-900 dark:text-gray-100">{visible.titre}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5 leading-relaxed">{visible.message}</p>
                </div>
                <button
                  onClick={() => { if (toastTimer.current) clearTimeout(toastTimer.current); setVisible(null); }}
                  className="flex-shrink-0 p-1 rounded-lg hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </>
            );
          })()}
        </div>,
        document.body
      )}

      {/* ── Cloche ── */}
      <div className="relative">
        <button
          ref={bellRef}
          onClick={handleOpen}
          className="relative p-2 rounded-xl hover:bg-muted dark:hover:bg-gray-800 transition-colors"
        >
          <Bell className={`w-5 h-5 ${unreadCount > 0 ? "text-primary" : "dark:text-gray-300"}`} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* ── Panel via portal — TOUJOURS au-dessus de tout le contenu ── */}
        {open && createPortal(
          <>
            {/* Overlay invisible pour fermer en cliquant ailleurs */}
            <div
              style={{ position: "fixed", inset: 0, zIndex: 99998 }}
              onClick={() => setOpen(false)}
            />

            <div
              style={{
                position: "fixed",
                top: panelPos.top,
                right: panelPos.right,
                zIndex: 99999,
                width: 320,
                maxHeight: "min(80vh, 520px)",
                animation: "notifPanelIn 0.2s ease-out",
              }}
              className="bg-card dark:bg-gray-900 border border-border dark:border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-4 border-b border-border dark:border-gray-700 flex items-center justify-between flex-shrink-0">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-primary" />
                  <span className="font-black text-sm dark:text-gray-100">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-black rounded-full flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} className="text-xs text-primary hover:underline font-medium">
                      Tout lire
                    </button>
                  )}
                  <button onClick={() => setOpen(false)}
                    className="p-1 rounded-lg hover:bg-muted dark:hover:bg-gray-800 transition-colors">
                    <X className="w-4 h-4 text-muted-foreground" />
                  </button>
                </div>
              </div>

              {/* Liste scrollable */}
              <div className="overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-sm">
                    <Bell className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p>Aucune notification</p>
                  </div>
                ) : notifications.map(notif => {
                  const cfg  = TYPE_CONFIG[notif.type] || TYPE_CONFIG.info;
                  const Icon = cfg.icon;
                  return (
                    <div
                      key={notif.id}
                      onClick={() => markAsRead(notif.id)}
                      className={`p-4 border-b border-border dark:border-gray-700 cursor-pointer hover:bg-muted/50 dark:hover:bg-gray-800 transition-colors group ${!notif.lu ? "bg-primary/5 dark:bg-primary/10" : ""}`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border-2 ${cfg.bg} ${cfg.darkBg} shadow-sm`}>
                          <Icon className={`w-4 h-4 ${cfg.color}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-1">
                            <p className={`text-sm font-bold leading-tight ${!notif.lu ? "text-foreground dark:text-gray-100" : "text-muted-foreground dark:text-gray-400"}`}>
                              {notif.titre}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                              {!notif.lu && <div className="w-2 h-2 bg-red-500 rounded-full" />}
                              <button
                                onClick={e => deleteNotif(notif.id, e)}
                                className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
                              >
                                <X className="w-3 h-3 text-muted-foreground hover:text-destructive" />
                              </button>
                            </div>
                          </div>
                          <p className="text-xs text-muted-foreground dark:text-gray-400 mt-0.5 leading-relaxed">{notif.message}</p>
                          <p className="text-xs text-muted-foreground dark:text-gray-500 mt-1">
                            {new Date(notif.created_at).toLocaleDateString("fr-FR", {
                              day: "2-digit", month: "short",
                              hour: "2-digit", minute: "2-digit"
                            })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </>,
          document.body
        )}
      </div>
    </>
  );
}
