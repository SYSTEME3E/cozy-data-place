import { useState, useMemo } from "react";
import { Search, X } from "lucide-react";

const CATEGORIES = [
  { id: "recents", label: "🕐", title: "Récents" },
  { id: "smileys", label: "😀", title: "Smileys & Personnes" },
  { id: "nature", label: "🐶", title: "Nature" },
  { id: "food", label: "🍎", title: "Nourriture" },
  { id: "activity", label: "⚽", title: "Activités" },
  { id: "travel", label: "🚗", title: "Voyages" },
  { id: "objects", label: "💡", title: "Objets" },
  { id: "symbols", label: "💯", title: "Symboles" },
  { id: "flags", label: "🏳️", title: "Drapeaux" },
];

const EMOJIS: Record<string, string[]> = {
  smileys: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","🙃","😉","😊","😇","🥰","😍","🤩","😘","😗","☺️","😚","😙","🥲","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","🤐","🤨","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🤧","🥵","🥶","🥴","😵","🤯","🤠","🥳","🥸","😎","🤓","🧐","😕","😟","🙁","☹️","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖","😺","😸","😹","😻","😼","😽","🙀","😿","😾"],
  nature: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐔","🐧","🐦","🐤","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🪱","🐛","🦋","🐌","🐞","🐜","🦟","🦗","🪲","🐢","🐍","🦎","🦖","🦕","🐙","🦑","🦐","🦞","🦀","🐡","🐠","🐟","🐬","🐳","🐋","🦈","🐊","🐅","🐆","🦓","🦍","🦧","🦣","🐘","🦛","🦏","🐪","🐫","🦒","🦘","🦬","🐃","🐂","🐄","🐎","🐖","🐏","🐑","🦙","🐐","🦌","🐕","🐩","🦮","🐈","🐓","🦃","🦤","🦚","🦜","🦢","🦩","🕊️","🐇","🦝","🦨","🦡","🦫","🦦","🦥","🐁","🐀","🐿️","🦔"],
  food: ["🍏","🍎","🍐","🍊","🍋","🍌","🍉","🍇","🍓","🫐","🍈","🍒","🍑","🥭","🍍","🥥","🥝","🍅","🍆","🥑","🫑","🥦","🥬","🥒","🌶️","🫒","🧄","🧅","🥔","🍠","🥐","🥯","🍞","🥖","🥨","🧀","🥚","🍳","🧈","🥞","🧇","🥓","🥩","🍗","🍖","🌭","🍔","🍟","🍕","🫓","🥪","🥙","🧆","🌮","🌯","🫔","🥗","🥘","🫕","🥫","🍝","🍜","🍲","🍛","🍣","🍱","🥟","🦪","🍤","🍙","🍚","🍘","🍥","🥮","🍢","🧁","🍰","🎂","🍮","🍭","🍬","🍫","🍿","🍩","🍪","🌰","🥜","🍯","🧃","🥤","🧋","🍵","☕","🫖","🍺","🍻","🥂","🍷","🥃","🍸","🍹","🧉","🍾"],
  activity: ["⚽","🏀","🏈","⚾","🥎","🎾","🏐","🏉","🥏","🎱","🏓","🏸","🏒","🏑","🥍","🏏","🪃","🥅","⛳","🪁","🏹","🎣","🤿","🥊","🥋","🎽","🛹","🛼","🛷","⛸️","🥌","🎿","⛷️","🏂","🪂","🏋️","🤼","🤸","🤺","🤾","🏇","⛹️","🏊","🏄","🚣","🧘","🏆","🥇","🥈","🥉","🎖️","🏅","🎗️","🎫","🎟️","🎪","🤹","🎭","🩰","🎨","🎬","🎤","🎧","🎼","🎵","🎶","🪗","🎷","🎺","🎸","🪕","🎻","🥁","🪘","🎹"],
  travel: ["🚗","🚕","🚙","🚌","🚎","🏎️","🚓","🚑","🚒","🚐","🛻","🚚","🚛","🚜","🏍️","🛵","🛺","🚲","🛴","🛹","🛼","🚏","🛣️","🛤️","⛽","🚨","🚥","🚦","🛑","🚧","⚓","🛟","⛵","🚤","🛥️","🛳️","⛴️","🚢","✈️","🛩️","🛫","🛬","🪂","💺","🚁","🛸","🚀","🛶","🏖️","🏕️","🌋","🗻","🏔️","🗺️","🧭","🏛️","🏗️","🏘️","🏠","🏡","🏢","🏣","🏤","🏥","🏦","🏨","🏩","🏪","🏫","🏬","🏭","🏯","🏰","🗼","🗽","🗾","🎌"],
  objects: ["⌚","📱","📲","💻","⌨️","🖥️","🖨️","🖱️","🖲️","🕹️","🗜️","💽","💾","💿","📀","📷","📸","📹","🎥","📽️","🎞️","📞","☎️","📟","📠","📺","📻","🧭","⏱️","⏲️","⏰","🕰️","⌛","⏳","📡","🔋","🔌","💡","🔦","🕯️","🗑️","🔧","🔨","⚒️","🛠️","⛏️","🔩","🗡️","⚔️","🛡️","🪚","🔫","🪃","🏹","🪤","🔑","🗝️","🔐","🔏","🔒","🔓","🪣","💊","💉","🩺","🩹","🩻","🩼","🩺","🧪","🌡️","🧬","🔬","🔭","🛒","🪞","🪟","🛋️","🪑","🚪","🛏️","🧸","🪆","🖼️","🧩","🪅","🪄","🃏","🀄","🎴","🎲","🎯","🎳"],
  symbols: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","☮️","✝️","☪️","🕉️","☸️","✡️","🔯","🕎","☯️","☦️","🛐","⛎","♈","♉","♊","♋","♌","♍","♎","♏","♐","♑","♒","♓","🆔","⚛️","🉑","☢️","☣️","📴","📳","🈶","🈚","🈸","🈺","🈷️","✴️","🆚","💮","🉐","㊙️","㊗️","🈴","🈵","🈹","🈲","🅰️","🅱️","🆎","🆑","🅾️","🆘","❌","⭕","🛑","⛔","📛","🚫","💯","💢","♨️","🚷","🚯","🚳","🚱","🔞","📵","🚭","❗","❕","❓","❔","‼️","⁉️","🔅","🔆","🔱","⚜️","🔰","♻️","✅","🈯","💹","❎","🌐","💠","Ⓜ️","🌀","💤","🏧","🉑","🈹","🈚","🈶"],
  flags: ["🏳️","🏴","🚩","🏁","🏳️‍🌈","🏳️‍⚧️","🇦🇨","🇦🇩","🇦🇪","🇦🇫","🇦🇬","🇦🇮","🇦🇱","🇦🇲","🇦🇴","🇦🇶","🇦🇷","🇦🇸","🇦🇹","🇦🇺","🇧🇯","🇧🇷","🇨🇦","🇨🇮","🇨🇲","🇨🇳","🇨🇴","🇨🇩","🇫🇷","🇩🇪","🇬🇭","🇬🇳","🇮🇳","🇮🇹","🇯🇵","🇰🇪","🇲🇦","🇲🇱","🇲🇽","🇳🇬","🇳🇪","🇷🇺","🇸🇳","🇿🇦","🇪🇸","🇹🇬","🇺🇳","🇺🇸","🇬🇧","🇺🇦","🇹🇷","🇸🇦","🇵🇭","🇧🇫"],
};


const STICKERS = ["💀","🔥","💯","✨","⭐","🌟","💫","⚡","🌈","🎉","🎊","🎁","🏆","💎","👑","🦁","🐉","🦋","🌺","🌸","🌻","🌹","🍀","🌙","☀️","❄️","💥","🌊","🌪️","🎵","🎮","🚀","💪","👊","✌️","🤝","🙏","❤️‍🔥","💘","💌","🥰","😎","🤩","🥳","🤯","🤑","💸","💰","🪙","💍","💄","👓","🎭","🃏"];

interface Props {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: Props) {
  const [tab, setTab] = useState<"emoji" | "sticker">("emoji");
  const [categorie, setCategorie] = useState("smileys");
  const [recherche, setRecherche] = useState("");
  const [recents, setRecents] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("emoji_recents") || "[]"); } catch { return []; }
  });

  const handleSelect = (emoji: string) => {
    const updated = [emoji, ...recents.filter(e => e !== emoji)].slice(0, 30);
    setRecents(updated);
    localStorage.setItem("emoji_recents", JSON.stringify(updated));
    onSelect(emoji);
  };

  const emojisAffiches = useMemo(() => {
    if (recherche) {
      return Object.values(EMOJIS).flat().filter(e => e.includes(recherche));
    }
    if (categorie === "recents") return recents;
    return EMOJIS[categorie] || [];
  }, [categorie, recherche, recents]);

  return (
    <div className="bg-[#1f2c34] border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
      style={{ width: 320, maxHeight: 420 }}>

      {/* Tabs */}
      <div className="flex border-b border-white/5">
        <button onClick={() => setTab("emoji")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === "emoji" ? "text-white border-b-2 border-[#25d366]" : "text-gray-400"}`}>
          Emoji
        </button>
        <button onClick={() => setTab("sticker")}
          className={`flex-1 py-3 text-sm font-bold transition-colors ${tab === "sticker" ? "text-white border-b-2 border-[#25d366]" : "text-gray-400"}`}>
          Stickers
        </button>
        <button onClick={onClose} className="px-3 text-gray-400 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {tab === "emoji" ? (
        <>
          {/* Search */}
          <div className="px-3 py-2">
            <div className="flex items-center gap-2 bg-[#111b21] rounded-xl px-3 py-2">
              <Search className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
              <input value={recherche} onChange={e => setRecherche(e.target.value)}
                placeholder="Rechercher un emoji..."
                className="bg-transparent text-sm text-white placeholder-gray-500 flex-1 outline-none" />
            </div>
          </div>

          {/* Catégories */}
          {!recherche && (
            <div className="flex border-b border-white/5 px-2 overflow-x-auto gap-1 py-1">
              {CATEGORIES.map(cat => (
                <button key={cat.id}
                  onClick={() => setCategorie(cat.id)}
                  title={cat.title}
                  className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-base transition-colors ${
                    categorie === cat.id ? "bg-[#25d366]/20" : "hover:bg-white/5"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          )}

          {/* Grille emojis */}
          <div className="grid grid-cols-8 gap-0.5 p-2 overflow-y-auto" style={{ maxHeight: 240 }}>
            {emojisAffiches.length === 0 ? (
              <div className="col-span-8 text-center text-gray-500 text-sm py-8">Aucun résultat</div>
            ) : emojisAffiches.map((emoji, i) => (
              <button key={`${emoji}-${i}`}
                onClick={() => handleSelect(emoji)}
                className="w-9 h-9 flex items-center justify-center text-xl hover:bg-white/10 rounded-lg transition-colors"
              >
                {emoji}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* Stickers */
        <div className="grid grid-cols-6 gap-1 p-3 overflow-y-auto" style={{ maxHeight: 320 }}>
          {STICKERS.map((s, i) => (
            <button key={i}
              onClick={() => { handleSelect(s); }}
              className="w-12 h-12 flex items-center justify-center text-3xl hover:bg-white/10 rounded-xl transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
