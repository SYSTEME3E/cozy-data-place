import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { playSuccessSound } from "@/lib/app-utils";
import { getNexoraUser } from "@/lib/nexora-auth";
import AppLayout from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Link2, Phone, MessageSquare, ExternalLink, Trash2, Edit2 } from "lucide-react";

type TypeLien = "lien" | "contact";

interface LienContact {
  id: string; type_entree: TypeLien; nom: string; valeur: string; description?: string; ordre: number; created_at: string;
}

function isPhone(val: string) { return /^[\d\s\+\-\(\)]{7,}$/.test(val.trim()); }
function isUrl(val: string) { return val.startsWith("http") || val.startsWith("www.") || val.includes("."); }

export default function LiensPage() {
  const [items, setItems] = useState<LienContact[]>([]);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<TypeLien | "">("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const user = getNexoraUser();
  const userId = user?.id;

  const [form, setForm] = useState({ type_entree: "lien" as TypeLien, nom: "", valeur: "", description: "" });

  useEffect(() => { if (userId) loadItems(); }, [userId]);

  const loadItems = async () => {
    if (!userId) return;
    setLoading(true);
    const { data } = await supabase.from("liens_contacts").select("*").eq("user_id", userId).order("ordre").order("created_at", { ascending: false });
    setItems((data || []) as LienContact[]);
    setLoading(false);
  };

  const filtered = items.filter(i => {
    const q = search.toLowerCase();
    const matchSearch = i.nom.toLowerCase().includes(q) || i.valeur.toLowerCase().includes(q);
    const matchType = filterType ? i.type_entree === filterType : true;
    return matchSearch && matchType;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.valeur || !userId) return;
    const payload: any = { type_entree: form.type_entree, nom: form.nom, valeur: form.valeur, description: form.description || null, user_id: userId };
    let error;
    if (editingId) {
      const { user_id, ...updatePayload } = payload;
      ({ error } = await supabase.from("liens_contacts").update(updatePayload).eq("id", editingId).eq("user_id", userId));
    } else {
      ({ error } = await supabase.from("liens_contacts").insert([payload]));
    }
    if (error) { toast({ title: "Erreur", description: error.message, variant: "destructive" }); }
    else { playSuccessSound(); toast({ title: "✅ Succès !", description: "Enregistré." }); resetForm(); loadItems(); }
  };

  const resetForm = () => { setForm({ type_entree: "lien", nom: "", valeur: "", description: "" }); setShowForm(false); setEditingId(null); };

  const handleEdit = (item: LienContact) => {
    setForm({ type_entree: item.type_entree, nom: item.nom, valeur: item.valeur, description: item.description || "" });
    setEditingId(item.id); setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!userId) return;
    await supabase.from("liens_contacts").delete().eq("id", id).eq("user_id", userId);
    toast({ title: "Supprimé" }); loadItems();
  };

  return (
    <AppLayout searchQuery={search} onSearchChange={setSearch}>
      <div className="space-y-5 animate-fade-in-up">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex-1">
            <h1 className="font-display font-bold text-xl flex items-center gap-2"><Link2 className="w-6 h-6 text-primary" /> Liens & Contacts</h1>
            <p className="text-sm text-muted-foreground">Vos liens importants et contacts</p>
          </div>
          <Button onClick={() => { resetForm(); setShowForm(true); }} size="sm" className="gap-1.5 bg-primary text-primary-foreground"><Plus className="w-4 h-4" /> Ajouter</Button>
        </div>

        {showForm && (
          <div className="bg-card border border-primary/20 rounded-xl p-5 shadow-brand animate-fade-in-up">
            <h3 className="font-display font-bold mb-4 text-primary">{editingId ? "Modifier" : "Nouvel élément"}</h3>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2 flex gap-3">
                {[{ v: "lien" as TypeLien, l: "Lien web", icon: Link2 }, { v: "contact" as TypeLien, l: "Contact", icon: Phone }].map(({ v, l, icon: Icon }) => (
                  <button key={v} type="button" onClick={() => setForm(f => ({ ...f, type_entree: v }))} className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border-2 transition-all ${form.type_entree === v ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}><Icon className="w-4 h-4" /> {l}</button>
                ))}
              </div>
              <Input placeholder="Nom / Libellé *" value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} required />
              <Input placeholder={form.type_entree === "lien" ? "URL (https://...)" : "Numéro de téléphone"} value={form.valeur} onChange={e => setForm(f => ({ ...f, valeur: e.target.value }))} required />
              <Input placeholder="Description (optionnel)" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className="sm:col-span-2" />
              <div className="sm:col-span-2 flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={resetForm}>Annuler</Button>
                <Button type="submit" className="bg-primary text-primary-foreground">✅ Enregistrer</Button>
              </div>
            </form>
          </div>
        )}

        <div className="flex gap-2">
          {[{ v: "" as const, l: "Tout" }, { v: "lien" as TypeLien, l: "Liens" }, { v: "contact" as TypeLien, l: "Contacts" }].map(({ v, l }) => (
            <button key={l} onClick={() => setFilterType(v as any)} className={`px-4 py-1.5 rounded-full text-sm font-semibold ${filterType === v ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}>{l}</button>
          ))}
        </div>

        {loading ? (<div className="p-8 text-center text-muted-foreground">Chargement...</div>) : filtered.length === 0 ? (<div className="p-8 text-center text-muted-foreground">Aucun élément</div>) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(item => {
              const isPhoneVal = isPhone(item.valeur);
              const isUrlVal = isUrl(item.valeur);
              return (
                <div key={item.id} className="bg-card border border-border rounded-xl p-4 card-hover">
                  <div className="flex items-start gap-3 mb-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type_entree === "lien" ? "bg-primary/10 text-primary" : "bg-green-50 text-green-700"}`}>
                      {item.type_entree === "lien" ? <Link2 className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-sm truncate">{item.nom}</div>
                      {item.description && <div className="text-xs text-muted-foreground truncate">{item.description}</div>}
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(item)} className="p-1.5 rounded hover:bg-primary/10 hover:text-primary transition-colors"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 rounded hover:bg-destructive/10 hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isUrlVal ? (
                      <a href={item.valeur.startsWith("http") ? item.valeur : `https://${item.valeur}`} target="_blank" rel="noopener noreferrer" className="flex-1 text-primary text-sm hover:underline truncate flex items-center gap-1">{item.valeur} <ExternalLink className="w-3 h-3 flex-shrink-0" /></a>
                    ) : (<span className="flex-1 text-sm truncate">{item.valeur}</span>)}
                    {isPhoneVal && (
                      <div className="flex gap-1 flex-shrink-0">
                        <a href={`tel:${item.valeur.replace(/\D/g, "")}`} className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"><Phone className="w-3.5 h-3.5" /></a>
                        <a href={`https://wa.me/${item.valeur.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" className="p-1.5 rounded-lg bg-green-50 hover:bg-green-100 text-green-700 transition-colors"><MessageSquare className="w-3.5 h-3.5" /></a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}