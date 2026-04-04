import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, Home, Heart, User, Menu, X } from "lucide-react";

export default function Navbar() {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    navigate(`/?search=${encodeURIComponent(search)}`);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center gap-4">

        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 flex-shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center">
            <Home className="w-4 h-4 text-white" />
          </div>
          <span className="font-black text-xl text-gray-900 hidden sm:block">Nexora</span>
        </Link>

        {/* Recherche */}
        <form onSubmit={handleSearch} className="flex-1 max-w-xl">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher une propriété, une ville..."
              className="w-full pl-10 pr-4 h-10 rounded-full border border-gray-300 bg-gray-50 text-sm focus:outline-none focus:border-violet-400 focus:bg-white transition-all"
            />
          </div>
        </form>

        {/* Actions desktop */}
        <div className="hidden sm:flex items-center gap-2">
          <Link to="/favoris"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <Heart className="w-4 h-4" /> Favoris
          </Link>
          <Link to="/mes-annonces"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors">
            <User className="w-4 h-4" /> Mes annonces
          </Link>
          <Link to="/publier"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-semibold hover:opacity-90 transition-opacity shadow-md">
            <Plus className="w-4 h-4" /> Publier
          </Link>
        </div>

        {/* Menu mobile */}
        <button onClick={() => setMenuOpen(!menuOpen)}
          className="sm:hidden w-9 h-9 rounded-lg flex items-center justify-center hover:bg-gray-100">
          {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Menu mobile déroulant */}
      {menuOpen && (
        <div className="sm:hidden bg-white border-t border-gray-100 px-4 py-3 space-y-2">
          <Link to="/favoris" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Heart className="w-4 h-4 text-red-400" /> Mes favoris
          </Link>
          <Link to="/mes-annonces" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50">
            <User className="w-4 h-4 text-violet-400" /> Mes annonces
          </Link>
          <Link to="/publier" onClick={() => setMenuOpen(false)}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-semibold">
            <Plus className="w-4 h-4" /> Publier une annonce
          </Link>
        </div>
      )}
    </nav>
  );
}
