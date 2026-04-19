import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft, Plus, Package, Edit3, Trash2,
  Eye, MoreVertical, ShoppingBag, TrendingUp,
  Copy, ToggleLeft, ToggleRight
} from "lucide-react";

const demoProducts = [
  {
    id: "1",
    name: "Formation Dropshipping 2025",
    type: "digital",
    price: 5000,
    originalPrice: 10000,
    sales: 87,
    revenue: "435 000 FCFA",
    active: true,
    emoji: "📦",
  },
  {
    id: "2",
    name: "Guide Marketing WhatsApp",
    type: "digital",
    price: 2000,
    originalPrice: 2000,
    sales: 134,
    revenue: "268 000 FCFA",
    active: true,
    emoji: "📱",
  },
  {
    id: "3",
    name: "Pack Templates Canva",
    type: "digital",
    price: 1500,
    originalPrice: 3000,
    sales: 52,
    revenue: "78 000 FCFA",
    active: false,
    emoji: "🎨",
  },
];

function ProductCard({ product, onEdit, onDelete, onToggle, onDuplicate }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${product.active ? "border-gray-100" : "border-gray-100 opacity-70"}`}>
      <div className="flex items-start gap-3 p-4">
        {/* Emoji / image */}
        <div className="w-14 h-14 bg-violet-50 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">
          {product.emoji}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <div className="font-black text-gray-900 text-sm truncate">{product.name}</div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs bg-violet-100 text-violet-700 font-bold px-2 py-0.5 rounded-lg capitalize">
                  {product.type === "digital" ? "📥 Digital" : "📫 Physique"}
                </span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${product.active ? "bg-emerald-50 text-emerald-600" : "bg-gray-100 text-gray-400"}`}>
                  {product.active ? "● Actif" : "○ Inactif"}
                </span>
              </div>
            </div>

            {/* Menu */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-7 h-7 rounded-lg bg-gray-50 flex items-center justify-center hover:bg-gray-100"
              >
                <MoreVertical className="w-3.5 h-3.5 text-gray-400" />
              </button>
              {menuOpen && (
                <div className="absolute right-0 top-9 w-44 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1">
                  {[
                    { icon: Edit3, label: "Modifier", action: onEdit },
                    { icon: Copy, label: "Dupliquer", action: onDuplicate },
                    { icon: product.active ? ToggleLeft : ToggleRight, label: product.active ? "Désactiver" : "Activer", action: onToggle },
                    { icon: Trash2, label: "Supprimer", action: onDelete, danger: true },
                  ].map(item => (
                    <button
                      key={item.label}
                      onClick={() => { item.action(); setMenuOpen(false); }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors ${item.danger ? "text-red-500" : "text-gray-700"}`}
                    >
                      <item.icon className="w-3.5 h-3.5" /> {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Prix */}
          <div className="flex items-center gap-2 mt-2">
            <span className="font-black text-gray-900">{product.price.toLocaleString()} FCFA</span>
            {product.originalPrice > product.price && (
              <span className="text-xs text-gray-400 line-through">{product.originalPrice.toLocaleString()} FCFA</span>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-4">
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <ShoppingBag className="w-3.5 h-3.5 text-violet-500" />
          <span className="font-bold">{product.sales}</span>
          <span className="text-gray-400">ventes</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-600">
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
          <span className="font-bold text-emerald-600">{product.revenue}</span>
        </div>
      </div>
    </div>
  );
}

export default function ProductList() {
  const navigate = useNavigate();
  const [products, setProducts] = useState(demoProducts);

  const deleteProduct = (id) => setProducts(p => p.filter(x => x.id !== id));
  const toggleProduct = (id) => setProducts(p => p.map(x => x.id === id ? { ...x, active: !x.active } : x));
  const duplicateProduct = (id) => {
    const original = products.find(p => p.id === id);
    if (!original) return;
    setProducts(p => [...p, { ...original, id: Date.now().toString(), name: original.name + " (copie)", active: false }]);
  };

  const totalRevenue = products.reduce((acc, p) => acc + p.sales * p.price, 0);
  const totalSales = products.reduce((acc, p) => acc + p.sales, 0);

  return (
    <div className="min-h-screen bg-gray-50" style={{ fontFamily: "'DM Sans', sans-serif" }}>

      {/* Header */}
      <div className="bg-white border-b border-gray-100 px-4 py-4 sticky top-0 z-20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/funnels")} className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center">
              <ArrowLeft className="w-4 h-4 text-gray-600" />
            </button>
            <div>
              <h1 className="font-black text-gray-900">Mes Produits</h1>
              <p className="text-xs text-gray-400">{products.length} produits</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/funnels/products/create")}
            className="flex items-center gap-1.5 bg-violet-600 text-white text-sm font-bold px-4 py-2.5 rounded-xl"
          >
            <Plus className="w-4 h-4" /> Ajouter
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-4 space-y-4">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Produits", value: products.length, color: "#7C3AED" },
            { label: "Ventes", value: totalSales, color: "#059669" },
            { label: "Revenus", value: (totalRevenue / 1000).toFixed(0) + "K FCFA", color: "#D97706" },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-2xl border border-gray-100 p-3 text-center">
              <div className="text-xl font-black" style={{ color: s.color }}>{s.value}</div>
              <div className="text-xs text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Produits */}
        <div className="space-y-3">
          {products.map(p => (
            <ProductCard
              key={p.id}
              product={p}
              onEdit={() => navigate(`/funnels/products/create?id=${p.id}`)}
              onDelete={() => deleteProduct(p.id)}
              onToggle={() => toggleProduct(p.id)}
              onDuplicate={() => duplicateProduct(p.id)}
            />
          ))}
        </div>

        {products.length === 0 && (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <div className="font-bold text-gray-400">Aucun produit</div>
            <button
              onClick={() => navigate("/funnels/products/create")}
              className="mt-3 text-violet-600 font-bold text-sm"
            >
              Créer votre premier produit →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
