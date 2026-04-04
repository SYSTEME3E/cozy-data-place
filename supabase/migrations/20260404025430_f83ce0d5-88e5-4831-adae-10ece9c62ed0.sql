
-- =============================================
-- NEXORA DATABASE SCHEMA - All Tables
-- =============================================

-- 1. nexora_users (referenced by many tables)
CREATE TABLE public.nexora_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  admin_features JSONB,
  admin_password TEXT,
  avatar_url TEXT,
  badge_premium BOOLEAN NOT NULL DEFAULT false,
  blocked_at TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  email TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  last_login TIMESTAMPTZ,
  nom_prenom TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_plain TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  premium_expires_at TIMESTAMPTZ,
  premium_since TIMESTAMPTZ,
  remember_token TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  suspended_at TIMESTAMPTZ,
  suspended_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  username TEXT NOT NULL
);
ALTER TABLE public.nexora_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow public read nexora_users" ON public.nexora_users FOR SELECT USING (true);
CREATE POLICY "Allow public insert nexora_users" ON public.nexora_users FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update nexora_users" ON public.nexora_users FOR UPDATE USING (true);
CREATE POLICY "Allow public delete nexora_users" ON public.nexora_users FOR DELETE USING (true);

-- 2. app_users
CREATE TABLE public.app_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_hash TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL,
  features JSONB NOT NULL DEFAULT '{}',
  is_active BOOLEAN NOT NULL DEFAULT true,
  login_token TEXT,
  nom TEXT NOT NULL,
  theme_color TEXT NOT NULL DEFAULT '#3b82f6',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all app_users" ON public.app_users FOR ALL USING (true) WITH CHECK (true);

-- 3. profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  access_code_hash TEXT NOT NULL DEFAULT '',
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT NOT NULL DEFAULT '',
  nom TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all profiles" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- 4. abonnements
CREATE TABLE public.abonnements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_fin TIMESTAMPTZ,
  devise TEXT NOT NULL DEFAULT 'XOF',
  mode_paiement TEXT,
  montant NUMERIC NOT NULL DEFAULT 0,
  plan TEXT NOT NULL DEFAULT 'free',
  reference_paiement TEXT,
  statut TEXT NOT NULL DEFAULT 'actif',
  user_id UUID REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.abonnements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all abonnements" ON public.abonnements FOR ALL USING (true) WITH CHECK (true);

-- 5. categories
CREATE TABLE public.categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  icone TEXT,
  nom TEXT NOT NULL
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all categories" ON public.categories FOR ALL USING (true) WITH CHECK (true);

-- 6. boutiques
CREATE TABLE public.boutiques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actif BOOLEAN NOT NULL DEFAULT true,
  adresse TEXT NOT NULL DEFAULT '',
  api_conversion_actif BOOLEAN NOT NULL DEFAULT false,
  api_conversion_token TEXT NOT NULL DEFAULT '',
  banniere_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  devise TEXT NOT NULL DEFAULT 'XOF',
  domaine_actif BOOLEAN NOT NULL DEFAULT false,
  domaine_personnalise TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  logo_url TEXT,
  nom TEXT NOT NULL,
  notifications_actives BOOLEAN NOT NULL DEFAULT true,
  pays TEXT NOT NULL DEFAULT 'Bénin',
  pixel_actif BOOLEAN NOT NULL DEFAULT false,
  pixel_facebook_id TEXT NOT NULL DEFAULT '',
  slug TEXT NOT NULL,
  telephone TEXT NOT NULL DEFAULT '',
  type_boutique TEXT NOT NULL DEFAULT 'physique',
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE,
  ville TEXT NOT NULL DEFAULT '',
  whatsapp TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.boutiques ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all boutiques" ON public.boutiques FOR ALL USING (true) WITH CHECK (true);

-- 7. produits
CREATE TABLE public.produits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  actif BOOLEAN NOT NULL DEFAULT true,
  boutique_id UUID NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  categorie TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  dimensions TEXT,
  fichier_nom TEXT,
  fichier_taille TEXT,
  fichier_url TEXT,
  livraison_automatique BOOLEAN NOT NULL DEFAULT false,
  mode_tarification TEXT,
  modules JSONB NOT NULL DEFAULT '[]',
  moyens_paiement JSONB NOT NULL DEFAULT '[]',
  nb_telechargements INTEGER,
  nom TEXT NOT NULL,
  paiement_lien TEXT,
  paiement_reception BOOLEAN NOT NULL DEFAULT false,
  photos JSONB,
  poids TEXT,
  politique_confidentialite TEXT,
  politique_remboursement TEXT,
  prix NUMERIC NOT NULL,
  prix_promo NUMERIC,
  protection_antipiratage BOOLEAN NOT NULL DEFAULT false,
  reseaux_sociaux JSONB NOT NULL DEFAULT '[]',
  seo_description TEXT,
  seo_titre TEXT,
  sku TEXT,
  stock INTEGER NOT NULL DEFAULT 0,
  stock_illimite BOOLEAN NOT NULL DEFAULT false,
  tags JSONB NOT NULL DEFAULT '[]',
  type TEXT NOT NULL DEFAULT 'physique',
  type_digital TEXT,
  type_produit TEXT NOT NULL DEFAULT 'physique',
  updated_at TIMESTAMPTZ DEFAULT now(),
  vedette BOOLEAN NOT NULL DEFAULT false
);
ALTER TABLE public.produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all produits" ON public.produits FOR ALL USING (true) WITH CHECK (true);

-- 8. commandes
CREATE TABLE public.commandes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  acheteur_id UUID REFERENCES public.nexora_users(id),
  boutique_id UUID NOT NULL REFERENCES public.boutiques(id) ON DELETE CASCADE,
  client_adresse TEXT,
  client_email TEXT,
  client_nom TEXT NOT NULL,
  client_tel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  items JSONB NOT NULL DEFAULT '[]',
  kkiapay_id TEXT,
  montant NUMERIC NOT NULL DEFAULT 0,
  numero TEXT NOT NULL,
  produit_id UUID REFERENCES public.produits(id),
  statut TEXT NOT NULL DEFAULT 'en_attente',
  statut_paiement TEXT NOT NULL DEFAULT 'en_attente',
  total NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.commandes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all commandes" ON public.commandes FOR ALL USING (true) WITH CHECK (true);

-- 9. variations_produit
CREATE TABLE public.variations_produit (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  nom TEXT NOT NULL,
  produit_id UUID NOT NULL REFERENCES public.produits(id) ON DELETE CASCADE,
  valeurs JSONB NOT NULL DEFAULT '[]'
);
ALTER TABLE public.variations_produit ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all variations_produit" ON public.variations_produit FOR ALL USING (true) WITH CHECK (true);

-- 10. articles_facture & factures
CREATE TABLE public.factures (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_adresse TEXT,
  client_contact TEXT,
  client_email TEXT,
  client_ifu TEXT,
  client_nom TEXT NOT NULL,
  client_pays TEXT,
  client_tel TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_echeance TIMESTAMPTZ,
  date_emission TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_facture TEXT,
  devise TEXT NOT NULL DEFAULT 'XOF',
  heure_facture TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  mode_paiement TEXT,
  note TEXT,
  notes TEXT,
  numero TEXT NOT NULL,
  sous_total NUMERIC NOT NULL DEFAULT 0,
  statut TEXT NOT NULL DEFAULT 'brouillon',
  taxe NUMERIC NOT NULL DEFAULT 0,
  total NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE,
  vendeur_adresse TEXT,
  vendeur_contact TEXT,
  vendeur_email TEXT,
  vendeur_ifu TEXT,
  vendeur_nom TEXT,
  vendeur_pays TEXT
);
ALTER TABLE public.factures ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all factures" ON public.factures FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.articles_facture (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  facture_id UUID NOT NULL REFERENCES public.factures(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL DEFAULT 0,
  nom TEXT NOT NULL,
  ordre INTEGER,
  prix_unitaire NUMERIC NOT NULL DEFAULT 0,
  quantite INTEGER NOT NULL DEFAULT 1
);
ALTER TABLE public.articles_facture ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all articles_facture" ON public.articles_facture FOR ALL USING (true) WITH CHECK (true);

-- 11. avis_produits
CREATE TABLE public.avis_produits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annonce_id UUID,
  commentaire TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  note INTEGER NOT NULL DEFAULT 5,
  produit_id UUID,
  user_id UUID NOT NULL,
  user_nom TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.avis_produits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all avis_produits" ON public.avis_produits FOR ALL USING (true) WITH CHECK (true);

-- 12. chat_messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_archived BOOLEAN NOT NULL DEFAULT false,
  is_read BOOLEAN NOT NULL DEFAULT false,
  sender TEXT NOT NULL DEFAULT 'user',
  user_id UUID NOT NULL
);
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);

-- 13. coffre_fort
CREATE TABLE public.coffre_fort (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  email_identifiant TEXT,
  mot_de_passe_visible TEXT,
  nom TEXT NOT NULL,
  note TEXT,
  ordre INTEGER,
  site_url TEXT,
  telephone TEXT,
  type_entree TEXT NOT NULL DEFAULT 'mot_de_passe',
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.coffre_fort ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all coffre_fort" ON public.coffre_fort FOR ALL USING (true) WITH CHECK (true);

-- 14. crypto_offers
CREATE TABLE public.crypto_offers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  allowed_countries JSONB NOT NULL DEFAULT '[]',
  available NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  crypto TEXT NOT NULL,
  custom_crypto_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  max_amount NUMERIC NOT NULL DEFAULT 0,
  min_amount NUMERIC NOT NULL DEFAULT 0,
  network_fee NUMERIC NOT NULL DEFAULT 0,
  payment_methods JSONB NOT NULL DEFAULT '[]',
  rate NUMERIC NOT NULL DEFAULT 0,
  seller_id UUID NOT NULL,
  seller_name TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wallet_address TEXT
);
ALTER TABLE public.crypto_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all crypto_offers" ON public.crypto_offers FOR ALL USING (true) WITH CHECK (true);

-- 15. crypto_orders
CREATE TABLE public.crypto_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_fcfa NUMERIC NOT NULL DEFAULT 0,
  buyer_country TEXT,
  buyer_id UUID NOT NULL,
  buyer_name TEXT NOT NULL DEFAULT '',
  buyer_whatsapp TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  crypto TEXT NOT NULL,
  network_fee NUMERIC NOT NULL DEFAULT 0,
  offer_id UUID,
  order_number TEXT NOT NULL,
  payment_message TEXT,
  seller_id UUID NOT NULL,
  seller_name TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  total_fcfa NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  wallet_addr TEXT NOT NULL DEFAULT ''
);
ALTER TABLE public.crypto_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all crypto_orders" ON public.crypto_orders FOR ALL USING (true) WITH CHECK (true);

-- 16. crypto_sellers
CREATE TABLE public.crypto_sellers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  active_days INTEGER NOT NULL DEFAULT 0,
  allowed_countries JSONB NOT NULL DEFAULT '[]',
  allowed_cryptos JSONB NOT NULL DEFAULT '[]',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  daily_limit NUMERIC NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  max_sell NUMERIC NOT NULL DEFAULT 0,
  min_sell NUMERIC NOT NULL DEFAULT 0,
  payment_lien TEXT,
  payment_numero TEXT,
  payment_reseau TEXT,
  reserve NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL,
  whatsapp TEXT
);
ALTER TABLE public.crypto_sellers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all crypto_sellers" ON public.crypto_sellers FOR ALL USING (true) WITH CHECK (true);

-- 17. depenses
CREATE TABLE public.depenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annee_num INTEGER,
  categorie TEXT NOT NULL DEFAULT 'Autre',
  created_at TIMESTAMPTZ DEFAULT now(),
  date_depense TIMESTAMPTZ NOT NULL DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  mois_num INTEGER,
  montant NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  semaine_num INTEGER,
  titre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.depenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all depenses" ON public.depenses FOR ALL USING (true) WITH CHECK (true);

-- 18. entrees
CREATE TABLE public.entrees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  annee_num INTEGER,
  categorie TEXT NOT NULL DEFAULT 'Autre',
  created_at TIMESTAMPTZ DEFAULT now(),
  date_entree TIMESTAMPTZ NOT NULL DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  mois_num INTEGER,
  montant NUMERIC NOT NULL DEFAULT 0,
  note TEXT,
  semaine_num INTEGER,
  titre TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.entrees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all entrees" ON public.entrees FOR ALL USING (true) WITH CHECK (true);

-- 19. investissements
CREATE TABLE public.investissements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contrat_accepte BOOLEAN NOT NULL DEFAULT false,
  contrat_date TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_debut TIMESTAMPTZ NOT NULL DEFAULT now(),
  date_objectif TIMESTAMPTZ,
  description TEXT,
  devise TEXT NOT NULL DEFAULT 'XOF',
  montant_actuel NUMERIC NOT NULL DEFAULT 0,
  montant_objectif NUMERIC NOT NULL DEFAULT 0,
  nom TEXT NOT NULL,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  type_investissement TEXT NOT NULL DEFAULT 'epargne',
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.investissements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all investissements" ON public.investissements FOR ALL USING (true) WITH CHECK (true);

-- 20. versements_investissement
CREATE TABLE public.versements_investissement (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_versement TIMESTAMPTZ NOT NULL DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  investissement_id UUID NOT NULL REFERENCES public.investissements(id) ON DELETE CASCADE,
  montant NUMERIC NOT NULL,
  note TEXT,
  type TEXT NOT NULL DEFAULT 'versement',
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.versements_investissement ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all versements_investissement" ON public.versements_investissement FOR ALL USING (true) WITH CHECK (true);

-- 21. liens_contacts
CREATE TABLE public.liens_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  nom TEXT NOT NULL,
  ordre INTEGER,
  type_entree TEXT NOT NULL DEFAULT 'lien',
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE,
  valeur TEXT NOT NULL
);
ALTER TABLE public.liens_contacts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all liens_contacts" ON public.liens_contacts FOR ALL USING (true) WITH CHECK (true);

-- 22. medias
CREATE TABLE public.medias (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  nom TEXT NOT NULL,
  taille_bytes BIGINT,
  type_media TEXT NOT NULL DEFAULT 'image',
  url TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.medias ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all medias" ON public.medias FOR ALL USING (true) WITH CHECK (true);

-- 23. nexora_annonces_immo
CREATE TABLE public.nexora_annonces_immo (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  auteur_nom TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  description TEXT,
  favoris JSONB NOT NULL DEFAULT '[]',
  images JSONB,
  prix NUMERIC NOT NULL DEFAULT 0,
  quartier TEXT,
  statut TEXT NOT NULL DEFAULT 'active',
  titre TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'location',
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE,
  ville TEXT NOT NULL DEFAULT '',
  whatsapp TEXT
);
ALTER TABLE public.nexora_annonces_immo ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_annonces_immo" ON public.nexora_annonces_immo FOR ALL USING (true) WITH CHECK (true);

-- 24. nexora_logs
CREATE TABLE public.nexora_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  action TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  details TEXT,
  user_id UUID REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.nexora_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_logs" ON public.nexora_logs FOR ALL USING (true) WITH CHECK (true);

-- 25. nexora_notifications
CREATE TABLE public.nexora_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  lu BOOLEAN NOT NULL DEFAULT false,
  message TEXT NOT NULL,
  titre TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'info',
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.nexora_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_notifications" ON public.nexora_notifications FOR ALL USING (true) WITH CHECK (true);

-- 26. nexora_payouts
CREATE TABLE public.nexora_payouts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL DEFAULT 0,
  amount_net NUMERIC NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency TEXT NOT NULL DEFAULT 'XOF',
  frais NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB,
  moneroo_code TEXT,
  moneroo_id TEXT,
  nom_beneficiaire TEXT,
  numero TEXT,
  pays TEXT,
  reseau TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL DEFAULT 'payout',
  user_id UUID NOT NULL
);
ALTER TABLE public.nexora_payouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_payouts" ON public.nexora_payouts FOR ALL USING (true) WITH CHECK (true);

-- 27. nexora_sessions
CREATE TABLE public.nexora_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_admin_session BOOLEAN NOT NULL DEFAULT false,
  session_token TEXT NOT NULL,
  user_id UUID REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.nexora_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_sessions" ON public.nexora_sessions FOR ALL USING (true) WITH CHECK (true);

-- 28. nexora_transactions
CREATE TABLE public.nexora_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL DEFAULT 0,
  checkout_url TEXT,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  currency TEXT NOT NULL DEFAULT 'XOF',
  frais NUMERIC NOT NULL DEFAULT 0,
  metadata JSONB,
  moneroo_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  type TEXT NOT NULL DEFAULT 'payment',
  user_id UUID NOT NULL
);
ALTER TABLE public.nexora_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_transactions" ON public.nexora_transactions FOR ALL USING (true) WITH CHECK (true);

-- 29. nexora_transfert_comptes
CREATE TABLE public.nexora_transfert_comptes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  solde NUMERIC NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL
);
ALTER TABLE public.nexora_transfert_comptes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all nexora_transfert_comptes" ON public.nexora_transfert_comptes FOR ALL USING (true) WITH CHECK (true);

-- 30. prets
CREATE TABLE public.prets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_echeance TIMESTAMPTZ,
  date_pret TIMESTAMPTZ NOT NULL DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  montant NUMERIC NOT NULL,
  montant_rembourse NUMERIC NOT NULL DEFAULT 0,
  nom_personne TEXT NOT NULL,
  nom_temoin TEXT,
  note TEXT,
  objectif TEXT NOT NULL DEFAULT '',
  signature_emprunteur TEXT,
  signature_preteur TEXT,
  signature_temoin TEXT,
  statut TEXT NOT NULL DEFAULT 'en_cours',
  type TEXT NOT NULL DEFAULT 'pret',
  updated_at TIMESTAMPTZ DEFAULT now(),
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.prets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all prets" ON public.prets FOR ALL USING (true) WITH CHECK (true);

-- 31. remboursements
CREATE TABLE public.remboursements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMPTZ DEFAULT now(),
  date_remboursement TIMESTAMPTZ NOT NULL DEFAULT now(),
  devise TEXT NOT NULL DEFAULT 'XOF',
  montant NUMERIC NOT NULL,
  note TEXT,
  pret_id UUID NOT NULL REFERENCES public.prets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.nexora_users(id) ON DELETE CASCADE
);
ALTER TABLE public.remboursements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all remboursements" ON public.remboursements FOR ALL USING (true) WITH CHECK (true);
