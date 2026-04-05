export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      abonnements: {
        Row: {
          created_at: string
          date_debut: string
          date_fin: string | null
          devise: string
          id: string
          mode_paiement: string | null
          montant: number
          plan: string
          reference_paiement: string | null
          statut: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          devise?: string
          id?: string
          mode_paiement?: string | null
          montant?: number
          plan?: string
          reference_paiement?: string | null
          statut?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          date_debut?: string
          date_fin?: string | null
          devise?: string
          id?: string
          mode_paiement?: string | null
          montant?: number
          plan?: string
          reference_paiement?: string | null
          statut?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "abonnements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      app_users: {
        Row: {
          access_code_hash: string
          avatar_url: string | null
          created_at: string | null
          email: string
          features: Json
          id: string
          is_active: boolean
          login_token: string | null
          nom: string
          theme_color: string
          updated_at: string | null
        }
        Insert: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email: string
          features?: Json
          id?: string
          is_active?: boolean
          login_token?: string | null
          nom: string
          theme_color?: string
          updated_at?: string | null
        }
        Update: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          features?: Json
          id?: string
          is_active?: boolean
          login_token?: string | null
          nom?: string
          theme_color?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      articles_facture: {
        Row: {
          created_at: string | null
          facture_id: string
          id: string
          montant: number
          nom: string
          ordre: number | null
          prix_unitaire: number
          quantite: number
        }
        Insert: {
          created_at?: string | null
          facture_id: string
          id?: string
          montant?: number
          nom: string
          ordre?: number | null
          prix_unitaire?: number
          quantite?: number
        }
        Update: {
          created_at?: string | null
          facture_id?: string
          id?: string
          montant?: number
          nom?: string
          ordre?: number | null
          prix_unitaire?: number
          quantite?: number
        }
        Relationships: [
          {
            foreignKeyName: "articles_facture_facture_id_fkey"
            columns: ["facture_id"]
            isOneToOne: false
            referencedRelation: "factures"
            referencedColumns: ["id"]
          },
        ]
      }
      avis_produits: {
        Row: {
          annonce_id: string | null
          commentaire: string
          created_at: string
          id: string
          note: number
          produit_id: string | null
          user_id: string
          user_nom: string
        }
        Insert: {
          annonce_id?: string | null
          commentaire?: string
          created_at?: string
          id?: string
          note?: number
          produit_id?: string | null
          user_id: string
          user_nom?: string
        }
        Update: {
          annonce_id?: string | null
          commentaire?: string
          created_at?: string
          id?: string
          note?: number
          produit_id?: string | null
          user_id?: string
          user_nom?: string
        }
        Relationships: []
      }
      boutiques: {
        Row: {
          actif: boolean
          adresse: string
          api_conversion_actif: boolean
          api_conversion_token: string
          banniere_url: string | null
          created_at: string | null
          description: string | null
          devise: string
          domaine_actif: boolean
          domaine_personnalise: string
          email: string
          id: string
          logo_url: string | null
          nom: string
          notifications_actives: boolean
          pays: string
          pixel_actif: boolean
          pixel_facebook_id: string
          slug: string
          telephone: string
          type_boutique: string
          updated_at: string | null
          user_id: string
          ville: string
          whatsapp: string
        }
        Insert: {
          actif?: boolean
          adresse?: string
          api_conversion_actif?: boolean
          api_conversion_token?: string
          banniere_url?: string | null
          created_at?: string | null
          description?: string | null
          devise?: string
          domaine_actif?: boolean
          domaine_personnalise?: string
          email?: string
          id?: string
          logo_url?: string | null
          nom: string
          notifications_actives?: boolean
          pays?: string
          pixel_actif?: boolean
          pixel_facebook_id?: string
          slug: string
          telephone?: string
          type_boutique?: string
          updated_at?: string | null
          user_id: string
          ville?: string
          whatsapp?: string
        }
        Update: {
          actif?: boolean
          adresse?: string
          api_conversion_actif?: boolean
          api_conversion_token?: string
          banniere_url?: string | null
          created_at?: string | null
          description?: string | null
          devise?: string
          domaine_actif?: boolean
          domaine_personnalise?: string
          email?: string
          id?: string
          logo_url?: string | null
          nom?: string
          notifications_actives?: boolean
          pays?: string
          pixel_actif?: boolean
          pixel_facebook_id?: string
          slug?: string
          telephone?: string
          type_boutique?: string
          updated_at?: string | null
          user_id?: string
          ville?: string
          whatsapp?: string
        }
        Relationships: [
          {
            foreignKeyName: "boutiques_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          icone: string | null
          id: string
          nom: string
        }
        Insert: {
          created_at?: string | null
          icone?: string | null
          id?: string
          nom: string
        }
        Update: {
          created_at?: string | null
          icone?: string | null
          id?: string
          nom?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          created_at: string
          id: string
          is_archived: boolean
          is_read: boolean
          sender: string
          user_id: string
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          sender?: string
          user_id: string
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          is_archived?: boolean
          is_read?: boolean
          sender?: string
          user_id?: string
        }
        Relationships: []
      }
      coffre_fort: {
        Row: {
          created_at: string | null
          email_identifiant: string | null
          id: string
          mot_de_passe_visible: string | null
          nom: string
          note: string | null
          ordre: number | null
          site_url: string | null
          telephone: string | null
          type_entree: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          email_identifiant?: string | null
          id?: string
          mot_de_passe_visible?: string | null
          nom: string
          note?: string | null
          ordre?: number | null
          site_url?: string | null
          telephone?: string | null
          type_entree?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          email_identifiant?: string | null
          id?: string
          mot_de_passe_visible?: string | null
          nom?: string
          note?: string | null
          ordre?: number | null
          site_url?: string | null
          telephone?: string | null
          type_entree?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "coffre_fort_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      commandes: {
        Row: {
          acheteur_id: string | null
          boutique_id: string
          client_adresse: string | null
          client_email: string | null
          client_nom: string
          client_tel: string | null
          created_at: string | null
          devise: string
          id: string
          items: Json
          kkiapay_id: string | null
          montant: number
          numero: string
          produit_id: string | null
          statut: string
          statut_paiement: string
          total: number
          updated_at: string | null
        }
        Insert: {
          acheteur_id?: string | null
          boutique_id: string
          client_adresse?: string | null
          client_email?: string | null
          client_nom: string
          client_tel?: string | null
          created_at?: string | null
          devise?: string
          id?: string
          items?: Json
          kkiapay_id?: string | null
          montant?: number
          numero: string
          produit_id?: string | null
          statut?: string
          statut_paiement?: string
          total?: number
          updated_at?: string | null
        }
        Update: {
          acheteur_id?: string | null
          boutique_id?: string
          client_adresse?: string | null
          client_email?: string | null
          client_nom?: string
          client_tel?: string | null
          created_at?: string | null
          devise?: string
          id?: string
          items?: Json
          kkiapay_id?: string | null
          montant?: number
          numero?: string
          produit_id?: string | null
          statut?: string
          statut_paiement?: string
          total?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commandes_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      crypto_offers: {
        Row: {
          allowed_countries: Json
          available: number
          created_at: string
          crypto: string
          custom_crypto_name: string | null
          id: string
          is_active: boolean
          max_amount: number
          min_amount: number
          network_fee: number
          payment_methods: Json
          rate: number
          seller_id: string
          seller_name: string
          updated_at: string
          wallet_address: string | null
        }
        Insert: {
          allowed_countries?: Json
          available?: number
          created_at?: string
          crypto: string
          custom_crypto_name?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          network_fee?: number
          payment_methods?: Json
          rate?: number
          seller_id: string
          seller_name?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Update: {
          allowed_countries?: Json
          available?: number
          created_at?: string
          crypto?: string
          custom_crypto_name?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number
          min_amount?: number
          network_fee?: number
          payment_methods?: Json
          rate?: number
          seller_id?: string
          seller_name?: string
          updated_at?: string
          wallet_address?: string | null
        }
        Relationships: []
      }
      crypto_orders: {
        Row: {
          amount: number
          amount_fcfa: number
          buyer_country: string | null
          buyer_id: string
          buyer_name: string
          buyer_whatsapp: string | null
          created_at: string
          crypto: string
          id: string
          network_fee: number
          offer_id: string | null
          order_number: string
          payment_message: string | null
          seller_id: string
          seller_name: string
          status: string
          total_fcfa: number
          updated_at: string
          wallet_addr: string
        }
        Insert: {
          amount?: number
          amount_fcfa?: number
          buyer_country?: string | null
          buyer_id: string
          buyer_name?: string
          buyer_whatsapp?: string | null
          created_at?: string
          crypto: string
          id?: string
          network_fee?: number
          offer_id?: string | null
          order_number: string
          payment_message?: string | null
          seller_id: string
          seller_name?: string
          status?: string
          total_fcfa?: number
          updated_at?: string
          wallet_addr?: string
        }
        Update: {
          amount?: number
          amount_fcfa?: number
          buyer_country?: string | null
          buyer_id?: string
          buyer_name?: string
          buyer_whatsapp?: string | null
          created_at?: string
          crypto?: string
          id?: string
          network_fee?: number
          offer_id?: string | null
          order_number?: string
          payment_message?: string | null
          seller_id?: string
          seller_name?: string
          status?: string
          total_fcfa?: number
          updated_at?: string
          wallet_addr?: string
        }
        Relationships: []
      }
      crypto_sellers: {
        Row: {
          active_days: number
          allowed_countries: Json
          allowed_cryptos: Json
          avatar_url: string | null
          created_at: string
          daily_limit: number
          expires_at: string | null
          id: string
          max_sell: number
          min_sell: number
          payment_lien: string | null
          payment_numero: string | null
          payment_reseau: string | null
          reserve: number
          status: string
          updated_at: string
          user_id: string
          whatsapp: string | null
        }
        Insert: {
          active_days?: number
          allowed_countries?: Json
          allowed_cryptos?: Json
          avatar_url?: string | null
          created_at?: string
          daily_limit?: number
          expires_at?: string | null
          id?: string
          max_sell?: number
          min_sell?: number
          payment_lien?: string | null
          payment_numero?: string | null
          payment_reseau?: string | null
          reserve?: number
          status?: string
          updated_at?: string
          user_id: string
          whatsapp?: string | null
        }
        Update: {
          active_days?: number
          allowed_countries?: Json
          allowed_cryptos?: Json
          avatar_url?: string | null
          created_at?: string
          daily_limit?: number
          expires_at?: string | null
          id?: string
          max_sell?: number
          min_sell?: number
          payment_lien?: string | null
          payment_numero?: string | null
          payment_reseau?: string | null
          reserve?: number
          status?: string
          updated_at?: string
          user_id?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      depenses: {
        Row: {
          annee_num: number | null
          categorie: string
          created_at: string | null
          date_depense: string
          devise: string
          id: string
          mois_num: number | null
          montant: number
          note: string | null
          semaine_num: number | null
          titre: string
          user_id: string
        }
        Insert: {
          annee_num?: number | null
          categorie?: string
          created_at?: string | null
          date_depense?: string
          devise?: string
          id?: string
          mois_num?: number | null
          montant?: number
          note?: string | null
          semaine_num?: number | null
          titre: string
          user_id: string
        }
        Update: {
          annee_num?: number | null
          categorie?: string
          created_at?: string | null
          date_depense?: string
          devise?: string
          id?: string
          mois_num?: number | null
          montant?: number
          note?: string | null
          semaine_num?: number | null
          titre?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "depenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      entrees: {
        Row: {
          annee_num: number | null
          categorie: string
          created_at: string | null
          date_entree: string
          devise: string
          id: string
          mois_num: number | null
          montant: number
          note: string | null
          semaine_num: number | null
          titre: string
          user_id: string
        }
        Insert: {
          annee_num?: number | null
          categorie?: string
          created_at?: string | null
          date_entree?: string
          devise?: string
          id?: string
          mois_num?: number | null
          montant?: number
          note?: string | null
          semaine_num?: number | null
          titre: string
          user_id: string
        }
        Update: {
          annee_num?: number | null
          categorie?: string
          created_at?: string | null
          date_entree?: string
          devise?: string
          id?: string
          mois_num?: number | null
          montant?: number
          note?: string | null
          semaine_num?: number | null
          titre?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      factures: {
        Row: {
          client_adresse: string | null
          client_contact: string | null
          client_email: string | null
          client_ifu: string | null
          client_nom: string
          client_pays: string | null
          client_tel: string | null
          created_at: string | null
          date_echeance: string | null
          date_emission: string
          date_facture: string | null
          devise: string
          heure_facture: string | null
          id: string
          items: Json
          mode_paiement: string | null
          note: string | null
          notes: string | null
          numero: string
          sous_total: number
          statut: string
          taxe: number
          total: number
          updated_at: string | null
          user_id: string
          vendeur_adresse: string | null
          vendeur_contact: string | null
          vendeur_email: string | null
          vendeur_ifu: string | null
          vendeur_nom: string | null
          vendeur_pays: string | null
        }
        Insert: {
          client_adresse?: string | null
          client_contact?: string | null
          client_email?: string | null
          client_ifu?: string | null
          client_nom: string
          client_pays?: string | null
          client_tel?: string | null
          created_at?: string | null
          date_echeance?: string | null
          date_emission?: string
          date_facture?: string | null
          devise?: string
          heure_facture?: string | null
          id?: string
          items?: Json
          mode_paiement?: string | null
          note?: string | null
          notes?: string | null
          numero: string
          sous_total?: number
          statut?: string
          taxe?: number
          total?: number
          updated_at?: string | null
          user_id: string
          vendeur_adresse?: string | null
          vendeur_contact?: string | null
          vendeur_email?: string | null
          vendeur_ifu?: string | null
          vendeur_nom?: string | null
          vendeur_pays?: string | null
        }
        Update: {
          client_adresse?: string | null
          client_contact?: string | null
          client_email?: string | null
          client_ifu?: string | null
          client_nom?: string
          client_pays?: string | null
          client_tel?: string | null
          created_at?: string | null
          date_echeance?: string | null
          date_emission?: string
          date_facture?: string | null
          devise?: string
          heure_facture?: string | null
          id?: string
          items?: Json
          mode_paiement?: string | null
          note?: string | null
          notes?: string | null
          numero?: string
          sous_total?: number
          statut?: string
          taxe?: number
          total?: number
          updated_at?: string | null
          user_id?: string
          vendeur_adresse?: string | null
          vendeur_contact?: string | null
          vendeur_email?: string | null
          vendeur_ifu?: string | null
          vendeur_nom?: string | null
          vendeur_pays?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "factures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      investissements: {
        Row: {
          contrat_accepte: boolean
          contrat_date: string | null
          created_at: string | null
          date_debut: string
          date_objectif: string | null
          description: string | null
          devise: string
          id: string
          montant_actuel: number
          montant_objectif: number
          nom: string
          statut: string
          type_investissement: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          contrat_accepte?: boolean
          contrat_date?: string | null
          created_at?: string | null
          date_debut?: string
          date_objectif?: string | null
          description?: string | null
          devise?: string
          id?: string
          montant_actuel?: number
          montant_objectif?: number
          nom: string
          statut?: string
          type_investissement?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          contrat_accepte?: boolean
          contrat_date?: string | null
          created_at?: string | null
          date_debut?: string
          date_objectif?: string | null
          description?: string | null
          devise?: string
          id?: string
          montant_actuel?: number
          montant_objectif?: number
          nom?: string
          statut?: string
          type_investissement?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "investissements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      liens_contacts: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          nom: string
          ordre: number | null
          type_entree: string
          user_id: string
          valeur: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          nom: string
          ordre?: number | null
          type_entree?: string
          user_id: string
          valeur: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          nom?: string
          ordre?: number | null
          type_entree?: string
          user_id?: string
          valeur?: string
        }
        Relationships: [
          {
            foreignKeyName: "liens_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      medias: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          nom: string
          taille_bytes: number | null
          type_media: string
          url: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          nom: string
          taille_bytes?: number | null
          type_media?: string
          url: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          nom?: string
          taille_bytes?: number | null
          type_media?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "medias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_annonces_immo: {
        Row: {
          auteur_nom: string
          contact: string
          created_at: string | null
          description: string | null
          favoris: Json
          id: string
          images: Json | null
          prix: number
          quartier: string | null
          statut: string
          titre: string
          type: string
          updated_at: string | null
          user_id: string
          ville: string
          whatsapp: string | null
        }
        Insert: {
          auteur_nom?: string
          contact?: string
          created_at?: string | null
          description?: string | null
          favoris?: Json
          id?: string
          images?: Json | null
          prix?: number
          quartier?: string | null
          statut?: string
          titre: string
          type?: string
          updated_at?: string | null
          user_id: string
          ville?: string
          whatsapp?: string | null
        }
        Update: {
          auteur_nom?: string
          contact?: string
          created_at?: string | null
          description?: string | null
          favoris?: Json
          id?: string
          images?: Json | null
          prix?: number
          quartier?: string | null
          statut?: string
          titre?: string
          type?: string
          updated_at?: string | null
          user_id?: string
          ville?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexora_annonces_immo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexora_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_notifications: {
        Row: {
          created_at: string
          id: string
          lu: boolean
          message: string
          titre: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          lu?: boolean
          message: string
          titre: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          lu?: boolean
          message?: string
          titre?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexora_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_payments: {
        Row: {
          amount: number | null
          created_at: string | null
          id: string
          payment_id: string | null
          plan: string | null
          status: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          plan?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number | null
          created_at?: string | null
          id?: string
          payment_id?: string | null
          plan?: string | null
          status?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      nexora_payouts: {
        Row: {
          amount: number
          amount_net: number
          completed_at: string | null
          created_at: string
          currency: string
          frais: number
          id: string
          metadata: Json | null
          moneroo_code: string | null
          moneroo_id: string | null
          nom_beneficiaire: string | null
          numero: string | null
          pays: string | null
          reseau: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_net?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          frais?: number
          id?: string
          metadata?: Json | null
          moneroo_code?: string | null
          moneroo_id?: string | null
          nom_beneficiaire?: string | null
          numero?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_net?: number
          completed_at?: string | null
          created_at?: string
          currency?: string
          frais?: number
          id?: string
          metadata?: Json | null
          moneroo_code?: string | null
          moneroo_id?: string | null
          nom_beneficiaire?: string | null
          numero?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nexora_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          is_admin_session: boolean
          session_token: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          is_admin_session?: boolean
          session_token: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          is_admin_session?: boolean
          session_token?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexora_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_transactions: {
        Row: {
          amount: number
          amount_net: number | null
          checkout_url: string | null
          completed_at: string | null
          created_at: string
          currency: string
          frais: number
          id: string
          metadata: Json | null
          moneroo_id: string | null
          status: string
          type: string
          user_id: string
        }
        Insert: {
          amount?: number
          amount_net?: number | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          frais?: number
          id?: string
          metadata?: Json | null
          moneroo_id?: string | null
          status?: string
          type?: string
          user_id: string
        }
        Update: {
          amount?: number
          amount_net?: number | null
          checkout_url?: string | null
          completed_at?: string | null
          created_at?: string
          currency?: string
          frais?: number
          id?: string
          metadata?: Json | null
          moneroo_id?: string | null
          status?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      nexora_transfert_comptes: {
        Row: {
          created_at: string
          id: string
          solde: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          solde?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          solde?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      nexora_users: {
        Row: {
          admin_features: Json | null
          admin_password: string | null
          avatar_url: string | null
          badge_premium: boolean
          blocked_at: string | null
          blocked_reason: string | null
          created_at: string
          email: string
          id: string
          is_active: boolean
          is_admin: boolean
          last_login: string | null
          nom_prenom: string
          password_hash: string
          password_plain: string | null
          plan: string
          premium_expires_at: string | null
          premium_since: string | null
          remember_token: string | null
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          updated_at: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          admin_features?: Json | null
          admin_password?: string | null
          avatar_url?: string | null
          badge_premium?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login?: string | null
          nom_prenom: string
          password_hash: string
          password_plain?: string | null
          plan?: string
          premium_expires_at?: string | null
          premium_since?: string | null
          remember_token?: string | null
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          admin_features?: Json | null
          admin_password?: string | null
          avatar_url?: string | null
          badge_premium?: boolean
          blocked_at?: string | null
          blocked_reason?: string | null
          created_at?: string
          email?: string
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login?: string | null
          nom_prenom?: string
          password_hash?: string
          password_plain?: string | null
          plan?: string
          premium_expires_at?: string | null
          premium_since?: string | null
          remember_token?: string | null
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
          username?: string
          whatsapp?: string | null
        }
        Relationships: []
      }
      prets: {
        Row: {
          created_at: string | null
          date_echeance: string | null
          date_pret: string
          devise: string
          id: string
          montant: number
          montant_rembourse: number
          nom_personne: string
          nom_preteur: string | null
          nom_temoin: string | null
          note: string | null
          objectif: string
          signature_emprunteur: string | null
          signature_preteur: string | null
          signature_temoin: string | null
          statut: string
          type: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_echeance?: string | null
          date_pret?: string
          devise?: string
          id?: string
          montant: number
          montant_rembourse?: number
          nom_personne: string
          nom_preteur?: string | null
          nom_temoin?: string | null
          note?: string | null
          objectif?: string
          signature_emprunteur?: string | null
          signature_preteur?: string | null
          signature_temoin?: string | null
          statut?: string
          type?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_echeance?: string | null
          date_pret?: string
          devise?: string
          id?: string
          montant?: number
          montant_rembourse?: number
          nom_personne?: string
          nom_preteur?: string | null
          nom_temoin?: string | null
          note?: string | null
          objectif?: string
          signature_emprunteur?: string | null
          signature_preteur?: string | null
          signature_temoin?: string | null
          statut?: string
          type?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "prets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      produits: {
        Row: {
          actif: boolean
          boutique_id: string
          categorie: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          fichier_nom: string | null
          fichier_taille: string | null
          fichier_url: string | null
          id: string
          livraison_automatique: boolean
          mode_tarification: string | null
          modules: Json
          moyens_paiement: Json
          nb_telechargements: number | null
          nom: string
          paiement_lien: string | null
          paiement_reception: boolean
          photos: Json | null
          poids: string | null
          politique_confidentialite: string | null
          politique_remboursement: string | null
          prix: number
          prix_promo: number | null
          protection_antipiratage: boolean
          reseaux_sociaux: Json
          seo_description: string | null
          seo_titre: string | null
          sku: string | null
          stock: number
          stock_illimite: boolean
          tags: Json
          type: string
          type_digital: string | null
          type_produit: string
          updated_at: string | null
          vedette: boolean
        }
        Insert: {
          actif?: boolean
          boutique_id: string
          categorie?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          fichier_nom?: string | null
          fichier_taille?: string | null
          fichier_url?: string | null
          id?: string
          livraison_automatique?: boolean
          mode_tarification?: string | null
          modules?: Json
          moyens_paiement?: Json
          nb_telechargements?: number | null
          nom: string
          paiement_lien?: string | null
          paiement_reception?: boolean
          photos?: Json | null
          poids?: string | null
          politique_confidentialite?: string | null
          politique_remboursement?: string | null
          prix: number
          prix_promo?: number | null
          protection_antipiratage?: boolean
          reseaux_sociaux?: Json
          seo_description?: string | null
          seo_titre?: string | null
          sku?: string | null
          stock?: number
          stock_illimite?: boolean
          tags?: Json
          type?: string
          type_digital?: string | null
          type_produit?: string
          updated_at?: string | null
          vedette?: boolean
        }
        Update: {
          actif?: boolean
          boutique_id?: string
          categorie?: string | null
          created_at?: string | null
          description?: string | null
          dimensions?: string | null
          fichier_nom?: string | null
          fichier_taille?: string | null
          fichier_url?: string | null
          id?: string
          livraison_automatique?: boolean
          mode_tarification?: string | null
          modules?: Json
          moyens_paiement?: Json
          nb_telechargements?: number | null
          nom?: string
          paiement_lien?: string | null
          paiement_reception?: boolean
          photos?: Json | null
          poids?: string | null
          politique_confidentialite?: string | null
          politique_remboursement?: string | null
          prix?: number
          prix_promo?: number | null
          protection_antipiratage?: boolean
          reseaux_sociaux?: Json
          seo_description?: string | null
          seo_titre?: string | null
          sku?: string | null
          stock?: number
          stock_illimite?: boolean
          tags?: Json
          type?: string
          type_digital?: string | null
          type_produit?: string
          updated_at?: string | null
          vedette?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          access_code_hash: string
          avatar_url: string | null
          created_at: string | null
          email: string
          id: string
          nom: string
          updated_at: string | null
        }
        Insert: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          updated_at?: string | null
        }
        Update: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          id?: string
          nom?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      remboursements: {
        Row: {
          created_at: string | null
          date_remboursement: string
          devise: string
          id: string
          montant: number
          note: string | null
          pret_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_remboursement?: string
          devise?: string
          id?: string
          montant: number
          note?: string | null
          pret_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_remboursement?: string
          devise?: string
          id?: string
          montant?: number
          note?: string | null
          pret_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "remboursements_pret_id_fkey"
            columns: ["pret_id"]
            isOneToOne: false
            referencedRelation: "prets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "remboursements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      variations_produit: {
        Row: {
          created_at: string
          id: string
          nom: string
          produit_id: string
          valeurs: Json
        }
        Insert: {
          created_at?: string
          id?: string
          nom: string
          produit_id: string
          valeurs?: Json
        }
        Update: {
          created_at?: string
          id?: string
          nom?: string
          produit_id?: string
          valeurs?: Json
        }
        Relationships: [
          {
            foreignKeyName: "variations_produit_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
        ]
      }
      versements_investissement: {
        Row: {
          created_at: string | null
          date_versement: string
          devise: string
          id: string
          investissement_id: string
          montant: number
          note: string | null
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date_versement?: string
          devise?: string
          id?: string
          investissement_id: string
          montant: number
          note?: string | null
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          date_versement?: string
          devise?: string
          id?: string
          investissement_id?: string
          montant?: number
          note?: string | null
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "versements_investissement_investissement_id_fkey"
            columns: ["investissement_id"]
            isOneToOne: false
            referencedRelation: "investissements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "versements_investissement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
        ]
      }
      whatsapp_contacts_downloads: {
        Row: {
          created_at: string | null
          id: string
          last_download_at: string | null
          last_download_count: number | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          last_download_at?: string | null
          last_download_count?: number | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          last_download_at?: string | null
          last_download_count?: number | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
