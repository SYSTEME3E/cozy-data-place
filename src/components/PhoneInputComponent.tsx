import { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Phone } from "lucide-react";

export interface CountryOption {
  code: string;   // ISO code ex: "BJ"
  name: string;
  flag: string;   // emoji drapeau
  dialCode: string; // ex: "+229"
}

export const COUNTRIES: CountryOption[] = [
  { code: "BJ", name: "Bénin",             flag: "🇧🇯", dialCode: "+229" },
  { code: "CI", name: "Côte d'Ivoire",     flag: "🇨🇮", dialCode: "+225" },
  { code: "SN", name: "Sénégal",           flag: "🇸🇳", dialCode: "+221" },
  { code: "ML", name: "Mali",              flag: "🇲🇱", dialCode: "+223" },
  { code: "BF", name: "Burkina Faso",      flag: "🇧🇫", dialCode: "+226" },
  { code: "NE", name: "Niger",             flag: "🇳🇪", dialCode: "+227" },
  { code: "TG", name: "Togo",             flag: "🇹🇬", dialCode: "+228" },
  { code: "GH", name: "Ghana",            flag: "🇬🇭", dialCode: "+233" },
  { code: "NG", name: "Nigeria",          flag: "🇳🇬", dialCode: "+234" },
  { code: "CM", name: "Cameroun",         flag: "🇨🇲", dialCode: "+237" },
  { code: "GA", name: "Gabon",            flag: "🇬🇦", dialCode: "+241" },
  { code: "CD", name: "Congo (RDC)",      flag: "🇨🇩", dialCode: "+243" },
  { code: "CG", name: "Congo",            flag: "🇨🇬", dialCode: "+242" },
  { code: "GN", name: "Guinée",           flag: "🇬🇳", dialCode: "+224" },
  { code: "GW", name: "Guinée-Bissau",    flag: "🇬🇼", dialCode: "+245" },
  { code: "SL", name: "Sierra Leone",     flag: "🇸🇱", dialCode: "+232" },
  { code: "LR", name: "Liberia",          flag: "🇱🇷", dialCode: "+231" },
  { code: "MR", name: "Mauritanie",       flag: "🇲🇷", dialCode: "+222" },
  { code: "GM", name: "Gambie",           flag: "🇬🇲", dialCode: "+220" },
  { code: "CV", name: "Cap-Vert",         flag: "🇨🇻", dialCode: "+238" },
  { code: "MA", name: "Maroc",            flag: "🇲🇦", dialCode: "+212" },
  { code: "DZ", name: "Algérie",          flag: "🇩🇿", dialCode: "+213" },
  { code: "TN", name: "Tunisie",          flag: "🇹🇳", dialCode: "+216" },
  { code: "EG", name: "Égypte",           flag: "🇪🇬", dialCode: "+20"  },
  { code: "ZA", name: "Afrique du Sud",   flag: "🇿🇦", dialCode: "+27"  },
  { code: "KE", name: "Kenya",            flag: "🇰🇪", dialCode: "+254" },
  { code: "ET", name: "Éthiopie",         flag: "🇪🇹", dialCode: "+251" },
  { code: "TZ", name: "Tanzanie",         flag: "🇹🇿", dialCode: "+255" },
  { code: "RW", name: "Rwanda",           flag: "🇷🇼", dialCode: "+250" },
  { code: "UG", name: "Ouganda",          flag: "🇺🇬", dialCode: "+256" },
  { code: "FR", name: "France",           flag: "🇫🇷", dialCode: "+33"  },
  { code: "BE", name: "Belgique",         flag: "🇧🇪", dialCode: "+32"  },
  { code: "CH", name: "Suisse",           flag: "🇨🇭", dialCode: "+41"  },
  { code: "DE", name: "Allemagne",        flag: "🇩🇪", dialCode: "+49"  },
  { code: "GB", name: "Royaume-Uni",      flag: "🇬🇧", dialCode: "+44"  },
  { code: "US", name: "États-Unis",       flag: "🇺🇸", dialCode: "+1"   },
  { code: "CA", name: "Canada",           flag: "🇨🇦", dialCode: "+1"   },
  { code: "BR", name: "Brésil",           flag: "🇧🇷", dialCode: "+55"  },
  { code: "CN", name: "Chine",            flag: "🇨🇳", dialCode: "+86"  },
  { code: "IN", name: "Inde",             flag: "🇮🇳", dialCode: "+91"  },
];

export function getCountryByCode(code: string): CountryOption | undefined {
  return COUNTRIES.find(c => c.code === code);
}

/** Retire l'indicatif en début de chaîne si présent, pour éviter doublons */
function stripDialCode(value: string, dialCode: string): string {
  const stripped = value.trim();
  if (stripped.startsWith(dialCode)) {
    return stripped.slice(dialCode.length).trimStart();
  }
  return stripped;
}

interface PhoneInputComponentProps {
  label: string;
  required?: boolean;
  value: string;
  onChange: (fullNumber: string, localNumber: string, country: CountryOption) => void;
  selectedCountry: CountryOption;
  onCountryChange: (country: CountryOption) => void;
  placeholder?: string;
  className?: string;
  error?: string;
}


export default function PhoneInputComponent({
  label,
  required = false,
  value,
  onChange,
  selectedCountry,
  onCountryChange,
  placeholder = "XX XX XX XX",
  className = "",
  error,
}: PhoneInputComponentProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = COUNTRIES.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.dialCode.includes(search) ||
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    if (open && searchRef.current) {
      setTimeout(() => searchRef.current?.focus(), 50);
    }
  }, [open]);

  const handleSelectCountry = (country: CountryOption) => {
    onCountryChange(country);
    const local = stripDialCode(value, selectedCountry.dialCode);
    const full = local ? `${country.dialCode} ${local}` : "";
    onChange(full, local, country);
    setOpen(false);
    setSearch("");
  };

  const handleLocalInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // On retire l'indicatif si l'utilisateur le tape lui-même
    const local = stripDialCode(raw, selectedCountry.dialCode);
    const full = local ? `${selectedCountry.dialCode} ${local}` : "";
    onChange(full, local, selectedCountry);
  };

  // Valeur affichée dans l'input : le numéro sans indicatif
  const displayValue = stripDialCode(value, selectedCountry.dialCode);

  return (
    <div className={`space-y-1 ${className}`}>
      <label className="text-xs font-semibold text-gray-600 dark:text-gray-400 block">
        {label} {required && <span className="text-pink-500">*</span>}
      </label>
      <div className="flex gap-2 relative" ref={dropdownRef}>
        {/* Sélecteur pays */}
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-3 rounded-xl border text-sm font-medium transition-all flex-shrink-0 ${
            open
              ? "border-pink-400 bg-pink-50 dark:bg-pink-950/30"
              : "border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 hover:border-pink-300"
          } text-gray-700 dark:text-gray-200`}
          style={{ minWidth: "110px" }}
        >
          <span className="text-base">{selectedCountry.flag}</span>
          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{selectedCountry.dialCode}</span>
          <ChevronDown className={`w-3 h-3 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {/* Dropdown pays */}
        {open && (
          <div className="absolute top-full left-0 mt-1 z-50 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-64 overflow-hidden">
            <div className="p-2 border-b border-gray-100 dark:border-gray-800">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  ref={searchRef}
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un pays..."
                  className="w-full pl-8 pr-3 py-2 text-xs rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 outline-none focus:border-pink-400 text-gray-800 dark:text-gray-200"
                />
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto">
              {filtered.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Aucun pays trouvé</p>
              ) : (
                filtered.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    onClick={() => handleSelectCountry(country)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                      selectedCountry.code === country.code ? "bg-pink-50 dark:bg-pink-950/30" : ""
                    }`}
                  >
                    <span className="text-base">{country.flag}</span>
                    <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{country.name}</span>
                    <span className="text-xs font-mono text-gray-400">{country.dialCode}</span>
                    {selectedCountry.code === country.code && (
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-500 flex-shrink-0" />
                    )}
                  </button>
                ))
              )}
            </div>
          </div>
        )}

        {/* Input numéro */}
        <div className="flex-1 relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="tel"
            value={displayValue}
            onChange={handleLocalInput}
            placeholder={placeholder}
            className={`w-full pl-9 pr-4 py-3 rounded-xl border text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-colors bg-gray-50 dark:bg-gray-800 ${
              error
                ? "border-red-400 focus:border-red-400"
                : "border-gray-200 dark:border-gray-700 focus:border-pink-400"
            }`}
          />
        </div>
      </div>

      
      {/* Aperçu format international */}
      {displayValue && (
        <p className="text-xs text-gray-400 dark:text-gray-500 pl-1">
          Format international : <span className="font-mono text-gray-600 dark:text-gray-400">{selectedCountry.dialCode} {displayValue}</span>
        </p>
      )}
      {error && <p className="text-xs text-red-500 pl-1">{error}</p>}
    </div>
  );
}
