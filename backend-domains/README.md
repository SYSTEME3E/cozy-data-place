# 🌐 Nexora — Custom Domain Mapping

Système complet de domaines personnalisés pour la plateforme Nexora.

---

## 📁 Structure des fichiers

```
backend-domains/
├── server.js                    # API Express Node.js
├── domainRouter.js              # Middleware routage dynamique
├── 001_create_domains_table.sql # Migration Supabase
├── .env.example                 # Variables d'environnement
└── package.json

src/
├── components/domains/
│   └── DomainManager.tsx        # UI complète (déjà intégré)
└── hooks/
    ├── useDomains.ts            # Hook API domaines (déjà intégré)
    └── useDomainContext.ts      # Détection domaine personnalisé (déjà intégré)
```

---

## 🚀 Déploiement en 5 étapes

### Étape 1 — Migration Supabase

1. Aller dans **Supabase Dashboard → SQL Editor**
2. Coller et exécuter le contenu de `001_create_domains_table.sql`
3. Vérifier que la table `domains` est créée dans **Table Editor**

---

### Étape 2 — Déployer l'API backend

**Déploiement Railway (recommandé)**

```bash
# 1. Créer un nouveau projet Railway
# 2. Connecter ce repo GitHub ou déposer les fichiers
# 3. Configurer les variables d'environnement (voir Étape 3)
# 4. Railway détecte automatiquement Node.js et lance npm start
```

**Déploiement manuel (VPS)**

```bash
cd backend-domains
npm install
cp .env.example .env
# Éditer .env avec vos valeurs
npm start
```

**Déploiement avec PM2 (production VPS)**

```bash
npm install -g pm2
pm2 start server.js --name nexora-domains
pm2 startup
pm2 save
```

---

### Étape 3 — Variables d'environnement (API backend)

Configurer ces variables sur Railway / Render / votre VPS :

| Variable | Obligatoire | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ | URL du projet Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Clé service_role (jamais exposée côté client) |
| `APP_HOSTNAME` | ✅ | Votre domaine ex: `app.nexora.com` |
| `SERVER_IP` | ✅ | IP publique de votre serveur |
| `FRONTEND_URL` | ✅ | URL(s) du frontend séparées par virgule |
| `CLOUDFLARE_API_TOKEN` | ⭕ | Pour SSL automatique |
| `CLOUDFLARE_ZONE_ID` | ⭕ | Zone ID Cloudflare |
| `MAX_DOMAINS_PER_USER` | ⭕ | Défaut: 10 |

---

### Étape 4 — Variables d'environnement (Frontend)

Dans votre fichier `.env` Vite :

```env
# URL de l'API backend domaines
VITE_DOMAIN_API_URL=https://votre-api-domains.railway.app

# Hostname Cloudflare pour CNAME
VITE_APP_HOSTNAME=app.nexora.com

# IP serveur pour A record
VITE_SERVER_IP=1.2.3.4
```

---

### Étape 5 — Intégrer le DomainManager dans les paramètres profil

```tsx
// Dans ProfilPage.tsx ou la section Paramètres
import DomainManager from "@/components/domains/DomainManager";

// Dans le JSX :
<DomainManager />
```

Pour le routage automatique (domaines personnalisés), ajouter dans `App.tsx` :

```tsx
import { DomainContextRouter } from "@/hooks/useDomainContext";

// Dans <App> :
<DomainContextRouter />
```

---

## 🔄 Flux complet utilisateur

```
1. Utilisateur saisit monsite.com
        ↓
2. Backend génère token → nexora-verify-abc123
        ↓
3. Utilisateur ajoute TXT DNS chez Namecheap/GoDaddy
        ↓
4. Clic "Vérifier la propriété"
   → API vérifie dns.resolveTxt("monsite.com")
   → Si token trouvé → status: "verified"
        ↓
5. Utilisateur configure CNAME: www.monsite.com → app.nexora.com
        ↓
6. Clic "Vérifier le DNS"
   → API vérifie dns.resolveCname("www.monsite.com")
   → Si pointe vers nexora → status: "active"
        ↓
7. SSL provisionné automatiquement via Cloudflare For SaaS
        ↓
8. monsite.com → affiche la boutique Nexora de l'utilisateur ✅
```

---

## 🔐 Sécurité

- **Anti-spoofing** : vérification TXT DNS prouve la propriété du domaine
- **Isolation utilisateur** : RLS Supabase + vérification `user_id` sur chaque requête
- **Domaines réservés** : liste noire (nexora.com, vercel.app, etc.)
- **Rate limiting** : max 10 ajouts/min par utilisateur
- **Seuls les domaines `status=active`** sont resolus via `/resolve`
- **Service role** uniquement côté backend (jamais exposé au client)

---

## 🌩️ Configuration Cloudflare For SaaS (SSL automatique)

1. Aller dans **Cloudflare Dashboard → votre zone → SSL/TLS → Custom Hostnames**
2. Activer **Cloudflare for SaaS**
3. Créer un **API Token** avec permissions `Zone → Custom Hostnames → Edit`
4. Copier votre **Zone ID** depuis l'Overview
5. Renseigner `CLOUDFLARE_API_TOKEN` et `CLOUDFLARE_ZONE_ID`

Les certificats sont provisionnés automatiquement lors de l'activation d'un domaine.

---

## 🧪 Tester l'API

```bash
# Health check
curl https://votre-api.railway.app/health

# Résoudre un domaine (public)
curl https://votre-api.railway.app/resolve/monsite.com

# Lister les domaines (authentifié)
curl -H "x-user-id: USER_ID" https://votre-api.railway.app/domains

# Ajouter un domaine
curl -X POST \
  -H "x-user-id: USER_ID" \
  -H "Content-Type: application/json" \
  -d '{"domain_name":"monsite.com","page_type":"boutique","page_slug":"ma-boutique"}' \
  https://votre-api.railway.app/domains

# Vérifier la propriété
curl -X POST \
  -H "x-user-id: USER_ID" \
  https://votre-api.railway.app/domains/DOMAIN_ID/verify

# Vérifier le DNS
curl -X POST \
  -H "x-user-id: USER_ID" \
  https://votre-api.railway.app/domains/DOMAIN_ID/check-dns
```

---

## 📊 Endpoints API résumé

| Méthode | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | ❌ | Healthcheck |
| GET | `/domains` | ✅ | Lister mes domaines |
| POST | `/domains` | ✅ | Ajouter un domaine |
| POST | `/domains/:id/verify` | ✅ | Vérifier propriété TXT |
| POST | `/domains/:id/check-dns` | ✅ | Vérifier CNAME/A |
| DELETE | `/domains/:id` | ✅ | Supprimer un domaine |
| GET | `/resolve/:domain` | ❌ | Résoudre un domaine (proxy) |
