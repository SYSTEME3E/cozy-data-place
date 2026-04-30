import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import BoutiqueLayout from "@/components/BoutiqueLayout";
import { getNexoraUser } from "@/lib/nexora-auth";
import { useNavigate } from "react-router-dom";
import { formatPrix } from "@/lib/devise-utils";
import {
  Users, Search, Phone, Mail, MessageCircle,
  MapPin, ShoppingBag, Calendar, TrendingUp,
  ChevronRight, X,
} from "lucide-react";

interface Customer {
  id: string;
  full_name: string;
  email: string | null;
  phone_number: string | null;
  address: string | null;
  first_order_at: string;
  last_order_at: string | null;
  total_orders: number;
  total_spent: number;
  devise: string;
  orders: Order[];
}

interface Order {
  id: string;
  numero: string;
  total: number;
  devise: string;
  statut: string;
  created_at: string;
  items: Array<{ nom_produit: string; quantite: number; montant: number }>;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function groupCommandesIntoCustomers(commandes: any[], devise: string): Customer[] {
  const map = new Map<string, Customer>();

  for (const cmd of commandes) {
    const key = cmd.client_email || cmd.client_tel || cmd.client_nom;
    if (!key) continue;

    if (!map.has(key)) {
      map.set(key, {
        id: key,
        full_name: cmd.client_nom || "Client inconnu",
        email: cmd.client_email || null,
        phone_number: cmd.client_tel || null,
        address: cmd.client_adresse || null,
        first_order_at: cmd.created_at,
        last_order_at: cmd.created_at,
        total_orders: 0,
        total_spent: 0,
        devise,
        orders: [],
      });
    }

    const cust = map.get(key)!;
    cust.total_orders += 1;
    cust.total_spent += cmd.total || 0;

    if (cmd.created_at > (cust.last_order_at || "")) {
      cust.last_order_at = cmd.created_at;
    }
    if (cmd.created_at < cust.first_order_at) {
      cust.first_order_at = cmd.created_at;
    }

    cust.orders.push({
      id: cmd.id,
      numero: cmd.numero,
      total: cmd.total,
      devise: cmd.devise,
      statut: cmd.statut,
      created_at: cmd.created_at,
      items: Array.isArray(cmd.items) ? cmd.items : [],
    });
  }

  for (const cust of map.values()) {
    cust.orders.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  return Array.from(map.values()).sort((a, b) =>
    (b.last_order_at || "").localeCompare(a.last_order_at || "")
  );
}

function CustomerSheet({ customer, onClose }: { customer: Customer; onClose: () => void }) {
  const handleWhatsApp = () => {
    if (!customer.phone_number) return;
    const num = customer.phone_number.replace(/[^0-9+]/g, "").replace(/^\+/, "");
    window.open(`https://wa.me/${num}?text=Bonjour ${customer.full_name}, je vous contacte depuis NEXORA.`, "_blank");
  };

  const handleEmail = () => {
    if (!customer.email) return;
    window.open(`mailto:${customer.email}?subject=Message depuis NEXORA`, "_blank");
  };

  const handleCall = () => {
    if (!customer.phone_number) return;
    window.open(`tel:${customer.phone_number}`, "_blank");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white dark:bg-gray-900 w-full md:max-w-lg md:rounded-3xl rounded-t-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        <div className="relative p-6 pb-4 border-b border-gray-100 dark:border-gray-800">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 transition-colors">
            <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          </button>
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-[#1D4ED8] flex items-center justify-center text-white font-black text-lg flex-shrink-0">
              {getInitials(customer.full_name)}
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100">{customer.full_name}</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">Client depuis {formatDate(customer.first_order_at)}</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-3 gap-3 p-4">
            {[
              { label: "Commandes", value: customer.total_orders, icon: ShoppingBag, color: "text-[#305CDE]", bg: "bg-blue-50 dark:bg-blue-950/30" },
              { label: "Dépensé", value: formatPrix(customer.total_spent, customer.devise), icon: TrendingUp, color: "text-[#008000]", bg: "bg-green-50 dark:bg-green-950/30" },
              { label: "Dernier achat", value: customer.last_order_at ? formatDate(customer.last_order_at) : "—", icon: Calendar, color: "text-[#305CDE]", bg: "bg-[#305CDE]/5 dark:bg-[#305CDE]/20" },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-2xl p-3 text-center`}>
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <p className={`text-sm font-black ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          <div className="px-4 pb-4 space-y-2">
            <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Coordonnées</p>
            {customer.phone_number && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="w-8 h-8 rounded-lg bg-[#008000] dark:bg-[#008000]/30 flex items-center justify-center flex-shrink-0">
                  <Phone className="w-4 h-4 text-[#008000]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Téléphone / WhatsApp</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 font-mono">{customer.phone_number}</p>
                </div>
              </div>
            )}
            {customer.email && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="w-8 h-8 rounded-lg bg-[#305CDE] dark:bg-[#305CDE]/30 flex items-center justify-center flex-shrink-0">
                  <Mail className="w-4 h-4 text-[#305CDE]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400">Email</p>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">{customer.email}</p>
                </div>
              </div>
            )}
            {customer.address && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800">
                <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-orange-600" />
                </div>
                <div className="flex-1">
                  <p className="text-xs text-gray-400">Adresse</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">{customer.address}</p>
                </div>
              </div>
            )}
          </div>

          <div className="px-4 pb-6">
            <p className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Historique achats</p>
            {customer.orders.length === 0 ? (
              <div className="text-center py-6 text-gray-400 dark:text-gray-600">
                <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">Aucune commande trouvée</p>
              </div>
            ) : (
              <div className="space-y-2">
                {customer.orders.map(o => (
                  <div key={o.id} className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{o.numero}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                        o.statut === "livree" ? "bg-green-100 text-[#008000]" :
                        o.statut === "annulee" ? "bg-red-100 text-red-700" :
                        "bg-blue-100 text-[#305CDE]"
                      }`}>{o.statut.replace(/_/g, " ")}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-gray-500 dark:text-gray-400">{formatDate(o.created_at)}</p>
                      <p className="text-sm font-black text-[#FF1A00]">{formatPrix(o.total, o.devise)}</p>
                    </div>
                    {o.items && o.items.length > 0 && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
                        {o.items.map(i => `${i.nom_produit} ×${i.quantite}`).join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-100 dark:border-gray-800 grid grid-cols-3 gap-2">
          <button onClick={handleEmail} disabled={!customer.email}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 hover:bg-[#1D4ED8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors group">
            <Mail className="w-5 h-5 text-[#1D4ED8] group-hover:text-white" />
            <span className="text-xs font-semibold text-[#1D4ED8] dark:text-[#1D4ED8] group-hover:text-white">Email</span>
          </button>
          <button onClick={handleWhatsApp} disabled={!customer.phone_number}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-green-50 dark:bg-green-950/30 hover:bg-[#008000] disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
            <MessageCircle className="w-5 h-5 text-[#008000]" />
            <span className="text-xs font-semibold text-[#008000] dark:text-[#008000]">WhatsApp</span>
          </button>
          <button onClick={handleCall} disabled={!customer.phone_number}
            className="flex flex-col items-center gap-1 p-3 rounded-2xl bg-[#1D4ED8]/10 dark:bg-[#1D4ED8]/20 hover:bg-[#1D4ED8] hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors group">
            <Phone className="w-5 h-5 text-[#1D4ED8] group-hover:text-white" />
            <span className="text-xs font-semibold text-[#1D4ED8] dark:text-[#1D4ED8] group-hover:text-white">Appeler</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const navigate = useNavigate();
  const [boutique, setBoutique] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);

      const user = getNexoraUser();
      if (!user) { navigate("/nexora"); return; }

      // 1. Récupérer la boutique via user_id
      const { data: b, error: bErr } = await (supabase as any)
        .from("boutiques")
        .select("id,nom,slug,devise,user_id")
        .eq("user_id", user.id)
        .or("actif.eq.true,actif.is.null")
        .maybeSingle();

      if (bErr) {
        setError("Impossible de charger la boutique : " + bErr.message);
        setLoading(false);
        return;
      }

      if (!b) {
        setError("Aucune boutique trouvée pour ce compte.");
        setLoading(false);
        return;
      }

      setBoutique(b);

      // 2. Récupérer toutes les commandes de la boutique
      const { data: commandes, error: cErr } = await (supabase as any)
        .from("commandes")
        .select("id,numero,total,devise,statut,created_at,items,client_nom,client_email,client_tel,client_adresse")
        .eq("boutique_id", b.id)
        .order("created_at", { ascending: false });

      if (cErr) {
        setError("Impossible de charger les commandes : " + cErr.message);
        setLoading(false);
        return;
      }

      // 3. Construire la liste clients depuis les commandes
      const clientsList = groupCommandesIntoCustomers(commandes || [], b.devise || "XOF");
      setCustomers(clientsList);
      setLoading(false);
    };

    load();
  }, [navigate]);

  const filtered = customers.filter(c =>
    c.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (c.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.phone_number || "").includes(search)
  );

  return (
    <BoutiqueLayout boutiqueName={boutique?.nom} boutiqueSlug={boutique?.slug}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Users className="w-6 h-6 text-[#FF1A00]" /> Mes Clients
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
              {customers.length} client{customers.length !== 1 ? "s" : ""} au total
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-4 rounded-2xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
            ⚠️ {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total clients", value: customers.length },
            { label: "Avec téléphone", value: customers.filter(c => c.phone_number).length },
            { label: "Avec email", value: customers.filter(c => c.email).length },
          ].map(s => (
            <div key={s.label} className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-xs text-[#305CDE] font-semibold mb-1">{s.label}</p>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{s.value}</p>
            </div>
          ))}
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom, email, téléphone..."
            className="w-full pl-11 pr-4 py-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:border-[#1D4ED8] transition-colors shadow-sm"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
            </button>
          )}
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 rounded-full border-4 border-[#FF1A00] border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400 dark:text-gray-600">
            <Users className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <h3 className="text-lg font-semibold">{search ? "Aucun résultat" : "Aucun client encore"}</h3>
            <p className="text-sm mt-1">{search ? "Essayez un autre terme de recherche" : "Les clients apparaîtront ici après leurs commandes"}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map(customer => (
              <button
                key={customer.id}
                onClick={() => setSelectedCustomer(customer)}
                className="w-full text-left bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-[#1D4ED8] dark:hover:border-[#1D4ED8] hover:shadow-md transition-all p-4 flex items-center gap-4"
              >
                <div className="w-11 h-11 rounded-xl bg-[#1D4ED8] flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                  {getInitials(customer.full_name)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-900 dark:text-gray-100 text-sm truncate">{customer.full_name}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {customer.phone_number && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Phone className="w-3 h-3 text-[#008000]" />
                        {customer.phone_number}
                      </span>
                    )}
                    {customer.email && !customer.phone_number && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Mail className="w-3 h-3 text-[#305CDE]" />
                        {customer.email}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-right flex-shrink-0 hidden sm:block">
                  <p className="text-sm font-black text-[#FF1A00]">{customer.total_orders} cmd</p>
                  {customer.last_order_at && (
                    <p className="text-xs text-gray-400">{formatDate(customer.last_order_at)}</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedCustomer && (
        <CustomerSheet
          customer={selectedCustomer}
          onClose={() => setSelectedCustomer(null)}
        />
      )}
    </BoutiqueLayout>
  );
}
