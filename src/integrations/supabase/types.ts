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
          {
            foreignKeyName: "abonnements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_notifications: {
        Row: {
          created_at: string | null
          id: string
          lu: boolean
          message: string | null
          reference_id: string | null
          severity: string | null
          titre: string
          type: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          lu?: boolean
          message?: string | null
          reference_id?: string | null
          severity?: string | null
          titre: string
          type: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          lu?: boolean
          message?: string | null
          reference_id?: string | null
          severity?: string | null
          titre?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      admin_wallet_adjustments: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string
          currency: string
          id: string
          operation: string
          solde_apres: number
          solde_avant: number
          user_id: string
          wallet_type: string
        }
        Insert: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          operation: string
          solde_apres?: number
          solde_avant?: number
          user_id: string
          wallet_type: string
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          operation?: string
          solde_apres?: number
          solde_avant?: number
          user_id?: string
          wallet_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_wallet_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_wallet_adjustments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      affiliate_clicks: {
        Row: {
          created_at: string
          formation_id: string | null
          id: string
          ip_hash: string | null
          ref_code: string
          referrer_id: string | null
          user_agent: string | null
        }
        Insert: {
          created_at?: string
          formation_id?: string | null
          id?: string
          ip_hash?: string | null
          ref_code: string
          referrer_id?: string | null
          user_agent?: string | null
        }
        Update: {
          created_at?: string
          formation_id?: string | null
          id?: string
          ip_hash?: string | null
          ref_code?: string
          referrer_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_clicks_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_clicks_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      affiliate_sales: {
        Row: {
          amount: number
          buyer_id: string
          commission: number
          commission_rate: number
          created_at: string
          currency: string
          formation_id: string
          id: string
          purchase_id: string | null
          referrer_id: string
          status: string
          updated_at: string
        }
        Insert: {
          amount?: number
          buyer_id: string
          commission?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          formation_id: string
          id?: string
          purchase_id?: string | null
          referrer_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          buyer_id?: string
          commission?: number
          commission_rate?: number
          created_at?: string
          currency?: string
          formation_id?: string
          id?: string
          purchase_id?: string | null
          referrer_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "affiliate_sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_buyer_id_fkey"
            columns: ["buyer_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "affiliate_sales_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "formation_purchases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "affiliate_sales_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          category: string | null
          cover_url: string | null
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
          theme_couleur_principale: string
          theme_couleur_secondaire: string
          theme_fond: string
          theme_police: string
          theme_style: string
          total_orders: number
          total_revenue: number
          total_visits: number
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
          category?: string | null
          cover_url?: string | null
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
          theme_couleur_principale?: string
          theme_couleur_secondaire?: string
          theme_fond?: string
          theme_police?: string
          theme_style?: string
          total_orders?: number
          total_revenue?: number
          total_visits?: number
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
          category?: string | null
          cover_url?: string | null
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
          theme_couleur_principale?: string
          theme_couleur_secondaire?: string
          theme_fond?: string
          theme_police?: string
          theme_style?: string
          total_orders?: number
          total_revenue?: number
          total_visits?: number
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
          {
            foreignKeyName: "boutiques_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      campagne_conversions: {
        Row: {
          boutique_id: string
          campagne_id: string
          client_nom: string | null
          client_tel: string | null
          commande_id: string | null
          created_at: string | null
          devise: string
          id: string
          montant: number
        }
        Insert: {
          boutique_id: string
          campagne_id: string
          client_nom?: string | null
          client_tel?: string | null
          commande_id?: string | null
          created_at?: string | null
          devise?: string
          id?: string
          montant?: number
        }
        Update: {
          boutique_id?: string
          campagne_id?: string
          client_nom?: string | null
          client_tel?: string | null
          commande_id?: string | null
          created_at?: string | null
          devise?: string
          id?: string
          montant?: number
        }
        Relationships: [
          {
            foreignKeyName: "campagne_conversions_campagne_id_fkey"
            columns: ["campagne_id"]
            isOneToOne: false
            referencedRelation: "campagnes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_conversions_campagne_id_fkey"
            columns: ["campagne_id"]
            isOneToOne: false
            referencedRelation: "campagnes_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_conversions_commande_id_fkey"
            columns: ["commande_id"]
            isOneToOne: false
            referencedRelation: "commandes"
            referencedColumns: ["id"]
          },
        ]
      }
      campagne_visites: {
        Row: {
          appareil: string | null
          boutique_id: string
          campagne_id: string
          created_at: string | null
          id: string
          ip_hash: string | null
          pays: string | null
          source_url: string | null
          ville: string | null
        }
        Insert: {
          appareil?: string | null
          boutique_id: string
          campagne_id: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          pays?: string | null
          source_url?: string | null
          ville?: string | null
        }
        Update: {
          appareil?: string | null
          boutique_id?: string
          campagne_id?: string
          created_at?: string | null
          id?: string
          ip_hash?: string | null
          pays?: string | null
          source_url?: string | null
          ville?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campagne_visites_campagne_id_fkey"
            columns: ["campagne_id"]
            isOneToOne: false
            referencedRelation: "campagnes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagne_visites_campagne_id_fkey"
            columns: ["campagne_id"]
            isOneToOne: false
            referencedRelation: "campagnes_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      campagnes: {
        Row: {
          boutique_id: string
          budget: number | null
          created_at: string | null
          devise: string
          id: string
          lien_campagne: string
          nom: string
          produit_id: string | null
          produit_slug: string | null
          source: string
          statut: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          boutique_id: string
          budget?: number | null
          created_at?: string | null
          devise?: string
          id?: string
          lien_campagne?: string
          nom: string
          produit_id?: string | null
          produit_slug?: string | null
          source?: string
          statut?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          boutique_id?: string
          budget?: number | null
          created_at?: string | null
          devise?: string
          id?: string
          lien_campagne?: string
          nom?: string
          produit_id?: string | null
          produit_slug?: string | null
          source?: string
          statut?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "campagnes_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      cart_items: {
        Row: {
          cart_id: string
          created_at: string
          id: string
          nom_produit: string
          photo_url: string | null
          prix_unitaire: number
          product_id: string
          quantite: number
          variations_choisies: Json | null
        }
        Insert: {
          cart_id: string
          created_at?: string
          id?: string
          nom_produit: string
          photo_url?: string | null
          prix_unitaire: number
          product_id: string
          quantite?: number
          variations_choisies?: Json | null
        }
        Update: {
          cart_id?: string
          created_at?: string
          id?: string
          nom_produit?: string
          photo_url?: string | null
          prix_unitaire?: number
          product_id?: string
          quantite?: number
          variations_choisies?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "cart_items_cart_id_fkey"
            columns: ["cart_id"]
            isOneToOne: false
            referencedRelation: "carts"
            referencedColumns: ["id"]
          },
        ]
      }
      carts: {
        Row: {
          boutique_id: string | null
          created_at: string
          devise: string | null
          id: string
          session_id: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          boutique_id?: string | null
          created_at?: string
          devise?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          boutique_id?: string | null
          created_at?: string
          devise?: string | null
          id?: string
          session_id?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
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
          {
            foreignKeyName: "coffre_fort_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      commandes: {
        Row: {
          acces_envoye: boolean
          acces_expire_at: string | null
          acces_token: string | null
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
          nexora_ref: string | null
          numero: string
          paiement_effectue: boolean
          produit_id: string | null
          statut: string
          statut_paiement: string
          total: number
          type_commande: string
          updated_at: string | null
        }
        Insert: {
          acces_envoye?: boolean
          acces_expire_at?: string | null
          acces_token?: string | null
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
          nexora_ref?: string | null
          numero: string
          paiement_effectue?: boolean
          produit_id?: string | null
          statut?: string
          statut_paiement?: string
          total?: number
          type_commande?: string
          updated_at?: string | null
        }
        Update: {
          acces_envoye?: boolean
          acces_expire_at?: string | null
          acces_token?: string | null
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
          nexora_ref?: string | null
          numero?: string
          paiement_effectue?: boolean
          produit_id?: string | null
          statut?: string
          statut_paiement?: string
          total?: number
          type_commande?: string
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
            foreignKeyName: "commandes_acheteur_id_fkey"
            columns: ["acheteur_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "commandes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
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
      customers: {
        Row: {
          address: string | null
          country: string | null
          country_flag: string | null
          country_name: string | null
          created_at: string
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone_number: string | null
          updated_at: string
          vendor_id: string
          whatsapp_number: string | null
        }
        Insert: {
          address?: string | null
          country?: string | null
          country_flag?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone_number?: string | null
          updated_at?: string
          vendor_id: string
          whatsapp_number?: string | null
        }
        Update: {
          address?: string | null
          country?: string | null
          country_flag?: string | null
          country_name?: string | null
          created_at?: string
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone_number?: string | null
          updated_at?: string
          vendor_id?: string
          whatsapp_number?: string | null
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
          {
            foreignKeyName: "depenses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      digital_sales: {
        Row: {
          acheteur_email: string | null
          acheteur_nom: string | null
          acheteur_tel: string | null
          boutique_id: string
          created_at: string | null
          devise: string | null
          id: string
          montant: number
          notes: string | null
          payment_mode: string | null
          produit_id: string | null
          reseau_paiement: string | null
          statut: string | null
        }
        Insert: {
          acheteur_email?: string | null
          acheteur_nom?: string | null
          acheteur_tel?: string | null
          boutique_id: string
          created_at?: string | null
          devise?: string | null
          id?: string
          montant: number
          notes?: string | null
          payment_mode?: string | null
          produit_id?: string | null
          reseau_paiement?: string | null
          statut?: string | null
        }
        Update: {
          acheteur_email?: string | null
          acheteur_nom?: string | null
          acheteur_tel?: string | null
          boutique_id?: string
          created_at?: string | null
          devise?: string | null
          id?: string
          montant?: number
          notes?: string | null
          payment_mode?: string | null
          produit_id?: string | null
          reseau_paiement?: string | null
          statut?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "digital_sales_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "digital_sales_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
            referencedColumns: ["id"]
          },
        ]
      }
      domains: {
        Row: {
          created_at: string
          domain_name: string
          id: string
          last_checked_at: string | null
          page_slug: string | null
          page_type: string
          ssl_status: string
          status: string
          updated_at: string
          user_id: string
          verification_token: string
          verified_at: string | null
        }
        Insert: {
          created_at?: string
          domain_name: string
          id?: string
          last_checked_at?: string | null
          page_slug?: string | null
          page_type?: string
          ssl_status?: string
          status?: string
          updated_at?: string
          user_id: string
          verification_token?: string
          verified_at?: string | null
        }
        Update: {
          created_at?: string
          domain_name?: string
          id?: string
          last_checked_at?: string | null
          page_slug?: string | null
          page_type?: string
          ssl_status?: string
          status?: string
          updated_at?: string
          user_id?: string
          verification_token?: string
          verified_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "domains_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "domains_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "entrees_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "factures_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      formation_lecons: {
        Row: {
          created_at: string | null
          duree_secondes: number | null
          est_preview: boolean | null
          id: string
          module_id: string
          ordre: number | null
          storage_path: string | null
          titre: string
          type: string | null
          url: string | null
        }
        Insert: {
          created_at?: string | null
          duree_secondes?: number | null
          est_preview?: boolean | null
          id?: string
          module_id: string
          ordre?: number | null
          storage_path?: string | null
          titre: string
          type?: string | null
          url?: string | null
        }
        Update: {
          created_at?: string | null
          duree_secondes?: number | null
          est_preview?: boolean | null
          id?: string
          module_id?: string
          ordre?: number | null
          storage_path?: string | null
          titre?: string
          type?: string | null
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formation_lecons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "formation_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_modules: {
        Row: {
          created_at: string | null
          description: string | null
          formation_id: string
          id: string
          ordre: number | null
          titre: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          formation_id: string
          id?: string
          ordre?: number | null
          titre: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          formation_id?: string
          id?: string
          ordre?: number | null
          titre?: string
        }
        Relationships: [
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_modules_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
        ]
      }
      formation_purchases: {
        Row: {
          acces_revoque: boolean
          affiliate_id: string | null
          amount: number | null
          created_at: string | null
          currency: string | null
          formation_id: string | null
          id: string
          payment_id: string | null
          revoque_at: string | null
          revoque_raison: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          acces_revoque?: boolean
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          formation_id?: string | null
          id?: string
          payment_id?: string | null
          revoque_at?: string | null
          revoque_raison?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          acces_revoque?: boolean
          affiliate_id?: string | null
          amount?: number | null
          created_at?: string | null
          currency?: string | null
          formation_id?: string | null
          id?: string
          payment_id?: string | null
          revoque_at?: string | null
          revoque_raison?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formation_purchases_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_purchases_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_purchases_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      formation_sales: {
        Row: {
          amount: number
          created_at: string | null
          devise: string
          formation_id: string
          id: string
          transaction_id: string | null
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          devise?: string
          formation_id: string
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          devise?: string
          formation_id?: string
          id?: string
          transaction_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formation_sales_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sales_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sales_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formation_sales_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      formations: {
        Row: {
          acces: string
          actif: boolean
          categorie: string | null
          contenu_type: string
          contenu_url: string | null
          created_at: string
          description: string | null
          devise: string
          duree: string | null
          duree_totale: number | null
          id: string
          image_url: string | null
          is_active: boolean
          modules: Json
          nb_inscrits: number
          niveau: string
          price: number
          prix: number
          prix_promo: number | null
          titre: string
          total_revenue: number
          total_sales: number
          updated_at: string
          video_url: string | null
        }
        Insert: {
          acces?: string
          actif?: boolean
          categorie?: string | null
          contenu_type?: string
          contenu_url?: string | null
          created_at?: string
          description?: string | null
          devise?: string
          duree?: string | null
          duree_totale?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          modules?: Json
          nb_inscrits?: number
          niveau?: string
          price?: number
          prix?: number
          prix_promo?: number | null
          titre: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
          video_url?: string | null
        }
        Update: {
          acces?: string
          actif?: boolean
          categorie?: string | null
          contenu_type?: string
          contenu_url?: string | null
          created_at?: string
          description?: string | null
          devise?: string
          duree?: string | null
          duree_totale?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean
          modules?: Json
          nb_inscrits?: number
          niveau?: string
          price?: number
          prix?: number
          prix_promo?: number | null
          titre?: string
          total_revenue?: number
          total_sales?: number
          updated_at?: string
          video_url?: string | null
        }
        Relationships: []
      }
      formations_acces: {
        Row: {
          created_at: string
          devise: string
          formation_id: string
          id: string
          montant_paye: number
          user_id: string
        }
        Insert: {
          created_at?: string
          devise?: string
          formation_id: string
          id?: string
          montant_paye?: number
          user_id: string
        }
        Update: {
          created_at?: string
          devise?: string
          formation_id?: string
          id?: string
          montant_paye?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "formations_acces_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "formations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_acces_formation_id_fkey"
            columns: ["formation_id"]
            isOneToOne: false
            referencedRelation: "v_formation_stats"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_acces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "formations_acces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_analytics: {
        Row: {
          conversions: number
          created_at: string
          date: string
          device: string | null
          funnel_id: string
          id: string
          revenue: number
          source: string | null
          unique_visits: number
          user_id: string
          visits: number
        }
        Insert: {
          conversions?: number
          created_at?: string
          date?: string
          device?: string | null
          funnel_id: string
          id?: string
          revenue?: number
          source?: string | null
          unique_visits?: number
          user_id: string
          visits?: number
        }
        Update: {
          conversions?: number
          created_at?: string
          date?: string
          device?: string | null
          funnel_id?: string
          id?: string
          revenue?: number
          source?: string | null
          unique_visits?: number
          user_id?: string
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "funnel_analytics_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_analytics_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_leads: {
        Row: {
          country: string | null
          created_at: string
          email: string | null
          extra_data: Json
          funnel_id: string
          id: string
          name: string | null
          phone: string | null
          source: string | null
          user_id: string
        }
        Insert: {
          country?: string | null
          created_at?: string
          email?: string | null
          extra_data?: Json
          funnel_id: string
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
          user_id: string
        }
        Update: {
          country?: string | null
          created_at?: string
          email?: string | null
          extra_data?: Json
          funnel_id?: string
          id?: string
          name?: string | null
          phone?: string | null
          source?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_leads_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_leads_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_orders: {
        Row: {
          created_at: string
          currency: string
          customer_email: string | null
          customer_name: string
          customer_phone: string
          funnel_id: string
          id: string
          pay_method: string
          product_id: string | null
          quantity: number
          reference: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          funnel_id: string
          id?: string
          pay_method?: string
          product_id?: string | null
          quantity?: number
          reference?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          customer_email?: string | null
          customer_name?: string
          customer_phone?: string
          funnel_id?: string
          id?: string
          pay_method?: string
          product_id?: string | null
          quantity?: number
          reference?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_orders_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_orders_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "funnel_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_orders_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_pages: {
        Row: {
          bg_color: string
          content: Json
          created_at: string
          domain: string
          facebook_pixel_id: string | null
          funnel_id: string
          google_analytics_id: string | null
          id: string
          is_published: boolean
          page_name: string
          page_url: string
          redirect_after_payment: string | null
          seo_description: string
          seo_keywords: string
          seo_title: string
          show_nexora_badge: boolean
          updated_at: string
          user_id: string
        }
        Insert: {
          bg_color?: string
          content?: Json
          created_at?: string
          domain?: string
          facebook_pixel_id?: string | null
          funnel_id: string
          google_analytics_id?: string | null
          id?: string
          is_published?: boolean
          page_name?: string
          page_url?: string
          redirect_after_payment?: string | null
          seo_description?: string
          seo_keywords?: string
          seo_title?: string
          show_nexora_badge?: boolean
          updated_at?: string
          user_id: string
        }
        Update: {
          bg_color?: string
          content?: Json
          created_at?: string
          domain?: string
          facebook_pixel_id?: string | null
          funnel_id?: string
          google_analytics_id?: string | null
          id?: string
          is_published?: boolean
          page_name?: string
          page_url?: string
          redirect_after_payment?: string | null
          seo_description?: string
          seo_keywords?: string
          seo_title?: string
          show_nexora_badge?: boolean
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_pages_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_pages_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_popups: {
        Row: {
          active: boolean
          bg_color: string
          created_at: string
          elements: Json
          funnel_id: string
          id: string
          overlay: boolean
          page_id: string | null
          size: string
          timer_delay: number
          trigger_type: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          bg_color?: string
          created_at?: string
          elements?: Json
          funnel_id: string
          id?: string
          overlay?: boolean
          page_id?: string | null
          size?: string
          timer_delay?: number
          trigger_type?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          bg_color?: string
          created_at?: string
          elements?: Json
          funnel_id?: string
          id?: string
          overlay?: boolean
          page_id?: string | null
          size?: string
          timer_delay?: number
          trigger_type?: string
          updated_at?: string
        }
        Relationships: []
      }
      funnel_products: {
        Row: {
          accepted_payments: string[]
          active: boolean
          created_at: string
          currency: string
          delivery_info: string | null
          description: string
          download_url: string | null
          emoji: string
          funnel_id: string | null
          id: string
          limited_qty: boolean
          name: string
          original_price: number | null
          price: number
          qty_count: number | null
          tags: string[]
          thank_you_page: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          accepted_payments?: string[]
          active?: boolean
          created_at?: string
          currency?: string
          delivery_info?: string | null
          description?: string
          download_url?: string | null
          emoji?: string
          funnel_id?: string | null
          id?: string
          limited_qty?: boolean
          name?: string
          original_price?: number | null
          price?: number
          qty_count?: number | null
          tags?: string[]
          thank_you_page?: string | null
          type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          accepted_payments?: string[]
          active?: boolean
          created_at?: string
          currency?: string
          delivery_info?: string | null
          description?: string
          download_url?: string | null
          emoji?: string
          funnel_id?: string | null
          id?: string
          limited_qty?: boolean
          name?: string
          original_price?: number | null
          price?: number
          qty_count?: number | null
          tags?: string[]
          thank_you_page?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnel_products_funnel_id_fkey"
            columns: ["funnel_id"]
            isOneToOne: false
            referencedRelation: "funnels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnel_products_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      funnel_steps: {
        Row: {
          created_at: string
          funnel_id: string
          id: string
          name: string
          step_order: number
          type: string
        }
        Insert: {
          created_at?: string
          funnel_id: string
          id?: string
          name: string
          step_order?: number
          type: string
        }
        Update: {
          created_at?: string
          funnel_id?: string
          id?: string
          name?: string
          step_order?: number
          type?: string
        }
        Relationships: []
      }
      funnels: {
        Row: {
          created_at: string
          goal: string
          id: string
          name: string
          status: string
          steps: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          goal?: string
          id?: string
          name?: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          goal?: string
          id?: string
          name?: string
          status?: string
          steps?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "funnels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "funnels_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      historique_bonus: {
        Row: {
          created_at: string
          currency: string
          description: string | null
          id: string
          montant: number
          status: string
          type_bonus: string
          user_id: string
        }
        Insert: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          montant?: number
          status?: string
          type_bonus?: string
          user_id: string
        }
        Update: {
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          montant?: number
          status?: string
          type_bonus?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historique_bonus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "historique_bonus_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      internal_transfers: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          note: string | null
          receiver_id: string
          sender_id: string
          status: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          receiver_id: string
          sender_id: string
          status?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          note?: string | null
          receiver_id?: string
          sender_id?: string
          status?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "investissements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "liens_contacts_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "medias_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mlm_commissions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          from_user_id: string
          id: string
          level: number
          status: string
          to_user_id: string
          type: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          from_user_id: string
          id?: string
          level?: number
          status?: string
          to_user_id: string
          type?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          from_user_id?: string
          id?: string
          level?: number
          status?: string
          to_user_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_commissions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_commissions_from_user_id_fkey"
            columns: ["from_user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mlm_commissions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_commissions_to_user_id_fkey"
            columns: ["to_user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mlm_earnings: {
        Row: {
          amount: number
          created_at: string | null
          devise: string
          id: string
          level: number
          source_user: string | null
          status: string
          transaction_id: string | null
          type: string | null
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string | null
          devise?: string
          id?: string
          level?: number
          source_user?: string | null
          status?: string
          transaction_id?: string | null
          type?: string | null
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          devise?: string
          id?: string
          level?: number
          source_user?: string | null
          status?: string
          transaction_id?: string | null
          type?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_earnings_source_user_fkey"
            columns: ["source_user"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_earnings_source_user_fkey"
            columns: ["source_user"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mlm_earnings_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_earnings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mlm_relations: {
        Row: {
          created_at: string | null
          id: string
          level: number
          referrer_id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          level?: number
          referrer_id: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          level?: number
          referrer_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_relations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_relations_referrer_id_fkey"
            columns: ["referrer_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "mlm_relations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_relations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      mlm_withdrawals: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          methode: string
          nom_beneficiaire: string | null
          note_admin: string | null
          pays: string | null
          reseau: string | null
          status: string
          telephone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          methode?: string
          nom_beneficiaire?: string | null
          note_admin?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          methode?: string
          nom_beneficiaire?: string | null
          note_admin?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          telephone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "mlm_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mlm_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nexora_annonces_immo: {
        Row: {
          auteur_nom: string
          contact: string
          created_at: string | null
          description: string | null
          devise: string
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
          devise?: string
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
          devise?: string
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
          {
            foreignKeyName: "nexora_annonces_immo_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "nexora_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          {
            foreignKeyName: "nexora_notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nexora_paylink_payments: {
        Row: {
          client_nom: string
          client_telephone: string
          created_at: string
          devise: string
          geniuspay_payment_id: string | null
          id: string
          montant: number
          paylink_id: string
          payment_method: string | null
          pays: string | null
          pays_flag: string | null
          reference: string
          reseau: string | null
          statut: string
        }
        Insert: {
          client_nom?: string
          client_telephone?: string
          created_at?: string
          devise?: string
          geniuspay_payment_id?: string | null
          id?: string
          montant?: number
          paylink_id: string
          payment_method?: string | null
          pays?: string | null
          pays_flag?: string | null
          reference?: string
          reseau?: string | null
          statut?: string
        }
        Update: {
          client_nom?: string
          client_telephone?: string
          created_at?: string
          devise?: string
          geniuspay_payment_id?: string | null
          id?: string
          montant?: number
          paylink_id?: string
          payment_method?: string | null
          pays?: string | null
          pays_flag?: string | null
          reference?: string
          reseau?: string | null
          statut?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexora_paylink_payments_paylink_id_fkey"
            columns: ["paylink_id"]
            isOneToOne: false
            referencedRelation: "nexora_paylinks"
            referencedColumns: ["id"]
          },
        ]
      }
      nexora_paylink_withdrawals: {
        Row: {
          created_at: string
          error_message: string | null
          frais: number
          id: string
          montant: number
          montant_net: number
          nom: string
          payout_id: string | null
          pays: string | null
          pays_code: string | null
          reseau: string | null
          statut: string
          telephone: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          frais?: number
          id?: string
          montant?: number
          montant_net?: number
          nom?: string
          payout_id?: string | null
          pays?: string | null
          pays_code?: string | null
          reseau?: string | null
          statut?: string
          telephone?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          frais?: number
          id?: string
          montant?: number
          montant_net?: number
          nom?: string
          payout_id?: string | null
          pays?: string | null
          pays_code?: string | null
          reseau?: string | null
          statut?: string
          telephone?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexora_paylink_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexora_paylink_withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      nexora_paylinks: {
        Row: {
          accept_carte: boolean
          accept_mobile_money: boolean
          created_at: string
          description: string | null
          devise: string
          expiration_date: string | null
          id: string
          image_url: string | null
          montant: number
          montant_modifiable: boolean | null
          nom_produit: string
          payment_count: number
          redirect_url: string | null
          redirect_url_failed: string | null
          slug: string
          statut: string
          total_collected: number
          updated_at: string
          url: string
          user_id: string
        }
        Insert: {
          accept_carte?: boolean
          accept_mobile_money?: boolean
          created_at?: string
          description?: string | null
          devise?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          montant?: number
          montant_modifiable?: boolean | null
          nom_produit: string
          payment_count?: number
          redirect_url?: string | null
          redirect_url_failed?: string | null
          slug: string
          statut?: string
          total_collected?: number
          updated_at?: string
          url: string
          user_id: string
        }
        Update: {
          accept_carte?: boolean
          accept_mobile_money?: boolean
          created_at?: string
          description?: string | null
          devise?: string
          expiration_date?: string | null
          id?: string
          image_url?: string | null
          montant?: number
          montant_modifiable?: boolean | null
          nom_produit?: string
          payment_count?: number
          redirect_url?: string | null
          redirect_url_failed?: string | null
          slug?: string
          statut?: string
          total_collected?: number
          updated_at?: string
          url?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nexora_paylinks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexora_paylinks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          geniuspay_id: string | null
          id: string
          metadata: Json | null
          moneroo_code: string | null
          moneroo_id: string | null
          nom_beneficiaire: string | null
          numero: string | null
          pays: string | null
          reseau: string | null
          status: string
          transaction_id: string | null
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
          geniuspay_id?: string | null
          id?: string
          metadata?: Json | null
          moneroo_code?: string | null
          moneroo_id?: string | null
          nom_beneficiaire?: string | null
          numero?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          transaction_id?: string | null
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
          geniuspay_id?: string | null
          id?: string
          metadata?: Json | null
          moneroo_code?: string | null
          moneroo_id?: string | null
          nom_beneficiaire?: string | null
          numero?: string | null
          pays?: string | null
          reseau?: string | null
          status?: string
          transaction_id?: string | null
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
          {
            foreignKeyName: "nexora_sessions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
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
          balance: number
          blocked_at: string | null
          blocked_reason: string | null
          country: string | null
          created_at: string
          dette_active: boolean
          dette_cachee: number | null
          email: string
          has_set_pin: boolean | null
          id: string
          is_active: boolean
          is_admin: boolean
          last_login: string | null
          mlm_referral_code: string | null
          mlm_total_earned: number
          nexora_id: string | null
          nom_prenom: string
          parrain_id: string | null
          password_hash: string
          password_plain: string | null
          phone: string | null
          pin_updated_at: string | null
          plan: string
          premium_expires_at: string | null
          premium_since: string | null
          rang_mlm: string
          ref_code: string | null
          referred_by: string | null
          referrer_id: string | null
          remember_token: string | null
          role: string | null
          security_pin: string | null
          solde_bonus: number
          solde_commissions: number
          status: string
          suspended_at: string | null
          suspended_reason: string | null
          total_filleuls: number
          updated_at: string
          username: string
          whatsapp: string | null
        }
        Insert: {
          admin_features?: Json | null
          admin_password?: string | null
          avatar_url?: string | null
          badge_premium?: boolean
          balance?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          country?: string | null
          created_at?: string
          dette_active?: boolean
          dette_cachee?: number | null
          email: string
          has_set_pin?: boolean | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login?: string | null
          mlm_referral_code?: string | null
          mlm_total_earned?: number
          nexora_id?: string | null
          nom_prenom: string
          parrain_id?: string | null
          password_hash: string
          password_plain?: string | null
          phone?: string | null
          pin_updated_at?: string | null
          plan?: string
          premium_expires_at?: string | null
          premium_since?: string | null
          rang_mlm?: string
          ref_code?: string | null
          referred_by?: string | null
          referrer_id?: string | null
          remember_token?: string | null
          role?: string | null
          security_pin?: string | null
          solde_bonus?: number
          solde_commissions?: number
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          total_filleuls?: number
          updated_at?: string
          username: string
          whatsapp?: string | null
        }
        Update: {
          admin_features?: Json | null
          admin_password?: string | null
          avatar_url?: string | null
          badge_premium?: boolean
          balance?: number
          blocked_at?: string | null
          blocked_reason?: string | null
          country?: string | null
          created_at?: string
          dette_active?: boolean
          dette_cachee?: number | null
          email?: string
          has_set_pin?: boolean | null
          id?: string
          is_active?: boolean
          is_admin?: boolean
          last_login?: string | null
          mlm_referral_code?: string | null
          mlm_total_earned?: number
          nexora_id?: string | null
          nom_prenom?: string
          parrain_id?: string | null
          password_hash?: string
          password_plain?: string | null
          phone?: string | null
          pin_updated_at?: string | null
          plan?: string
          premium_expires_at?: string | null
          premium_since?: string | null
          rang_mlm?: string
          ref_code?: string | null
          referred_by?: string | null
          referrer_id?: string | null
          remember_token?: string | null
          role?: string | null
          security_pin?: string | null
          solde_bonus?: number
          solde_commissions?: number
          status?: string
          suspended_at?: string | null
          suspended_reason?: string | null
          total_filleuls?: number
          updated_at?: string
          username?: string
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "nexora_users_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexora_users_parrain_id_fkey"
            columns: ["parrain_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
          {
            foreignKeyName: "nexora_users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nexora_users_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      paylinks: {
        Row: {
          amount: number
          cancel_url: string | null
          created_at: string | null
          description: string | null
          devise: string
          expires_at: string | null
          id: string
          is_active: boolean
          success_url: string | null
          title: string
          total_paid: number
          total_tx: number
          user_id: string | null
        }
        Insert: {
          amount?: number
          cancel_url?: string | null
          created_at?: string | null
          description?: string | null
          devise?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          success_url?: string | null
          title: string
          total_paid?: number
          total_tx?: number
          user_id?: string | null
        }
        Update: {
          amount?: number
          cancel_url?: string | null
          created_at?: string | null
          description?: string | null
          devise?: string
          expires_at?: string | null
          id?: string
          is_active?: boolean
          success_url?: string | null
          title?: string
          total_paid?: number
          total_tx?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "paylinks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "paylinks_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
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
          {
            foreignKeyName: "prets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      produits: {
        Row: {
          achats: number | null
          actif: boolean
          boutique_id: string
          categorie: string | null
          created_at: string | null
          description: string | null
          description_ia: boolean
          dimensions: string | null
          downloads_url: string | null
          fichier_nom: string | null
          fichier_taille: string | null
          fichier_url: string | null
          id: string
          instructions_achat: string | null
          livraison_automatique: boolean
          mode_tarification: string | null
          modules: Json
          moyens_paiement: Json
          nb_telechargements: number | null
          nexora_paylink_id: string | null
          nexora_paylink_url: string | null
          nexora_redirect_url: string | null
          nom: string
          paiement_lien: string | null
          paiement_reception: boolean
          payment_mode: string | null
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
          slug: string
          stock: number
          stock_illimite: boolean
          tags: Json
          total_revenue: number
          total_sold: number
          type: string
          type_digital: string | null
          type_produit: string
          updated_at: string | null
          vedette: boolean
          video_url: string | null
          vues: number | null
        }
        Insert: {
          achats?: number | null
          actif?: boolean
          boutique_id: string
          categorie?: string | null
          created_at?: string | null
          description?: string | null
          description_ia?: boolean
          dimensions?: string | null
          downloads_url?: string | null
          fichier_nom?: string | null
          fichier_taille?: string | null
          fichier_url?: string | null
          id?: string
          instructions_achat?: string | null
          livraison_automatique?: boolean
          mode_tarification?: string | null
          modules?: Json
          moyens_paiement?: Json
          nb_telechargements?: number | null
          nexora_paylink_id?: string | null
          nexora_paylink_url?: string | null
          nexora_redirect_url?: string | null
          nom: string
          paiement_lien?: string | null
          paiement_reception?: boolean
          payment_mode?: string | null
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
          slug: string
          stock?: number
          stock_illimite?: boolean
          tags?: Json
          total_revenue?: number
          total_sold?: number
          type?: string
          type_digital?: string | null
          type_produit?: string
          updated_at?: string | null
          vedette?: boolean
          video_url?: string | null
          vues?: number | null
        }
        Update: {
          achats?: number | null
          actif?: boolean
          boutique_id?: string
          categorie?: string | null
          created_at?: string | null
          description?: string | null
          description_ia?: boolean
          dimensions?: string | null
          downloads_url?: string | null
          fichier_nom?: string | null
          fichier_taille?: string | null
          fichier_url?: string | null
          id?: string
          instructions_achat?: string | null
          livraison_automatique?: boolean
          mode_tarification?: string | null
          modules?: Json
          moyens_paiement?: Json
          nb_telechargements?: number | null
          nexora_paylink_id?: string | null
          nexora_paylink_url?: string | null
          nexora_redirect_url?: string | null
          nom?: string
          paiement_lien?: string | null
          paiement_reception?: boolean
          payment_mode?: string | null
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
          slug?: string
          stock?: number
          stock_illimite?: boolean
          tags?: Json
          total_revenue?: number
          total_sold?: number
          type?: string
          type_digital?: string | null
          type_produit?: string
          updated_at?: string | null
          vedette?: boolean
          video_url?: string | null
          vues?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_nexora_paylink_id_fkey"
            columns: ["nexora_paylink_id"]
            isOneToOne: false
            referencedRelation: "nexora_paylinks"
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
          has_set_pin: boolean | null
          id: string
          nom: string
          pin_attempts: number | null
          role: string
          security_pin: string | null
          updated_at: string | null
        }
        Insert: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          has_set_pin?: boolean | null
          id?: string
          nom?: string
          pin_attempts?: number | null
          role?: string
          security_pin?: string | null
          updated_at?: string | null
        }
        Update: {
          access_code_hash?: string
          avatar_url?: string | null
          created_at?: string | null
          email?: string
          has_set_pin?: boolean | null
          id?: string
          nom?: string
          pin_attempts?: number | null
          role?: string
          security_pin?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          boutique_id: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          boutique_id: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          boutique_id?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
        ]
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
          {
            foreignKeyName: "remboursements_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      reservations_checkout: {
        Row: {
          boutique_id: string
          created_at: string
          expire_at: string
          id: string
          produit_id: string
          quantite: number
          session_id: string
        }
        Insert: {
          boutique_id: string
          created_at?: string
          expire_at?: string
          id?: string
          produit_id: string
          quantite?: number
          session_id: string
        }
        Update: {
          boutique_id?: string
          created_at?: string
          expire_at?: string
          id?: string
          produit_id?: string
          quantite?: number
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reservations_checkout_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_checkout_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_checkout_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
            referencedColumns: ["id"]
          },
        ]
      }
      traffic_stats: {
        Row: {
          clicks: number
          conversions: number
          created_at: string | null
          date: string
          entity_type: string | null
          id: string
          paylink_id: string | null
          shop_id: string | null
          tunnel_id: string | null
          unique_visits: number
          user_id: string | null
          visits: number
        }
        Insert: {
          clicks?: number
          conversions?: number
          created_at?: string | null
          date?: string
          entity_type?: string | null
          id?: string
          paylink_id?: string | null
          shop_id?: string | null
          tunnel_id?: string | null
          unique_visits?: number
          user_id?: string | null
          visits?: number
        }
        Update: {
          clicks?: number
          conversions?: number
          created_at?: string | null
          date?: string
          entity_type?: string | null
          id?: string
          paylink_id?: string | null
          shop_id?: string | null
          tunnel_id?: string | null
          unique_visits?: number
          user_id?: string | null
          visits?: number
        }
        Relationships: [
          {
            foreignKeyName: "traffic_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "traffic_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string | null
          devise: string
          formation_id: string | null
          frais: number
          id: string
          metadata: Json | null
          paylink_id: string | null
          reference: string | null
          shop_id: string | null
          status: string
          type: string
          user_id: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          devise?: string
          formation_id?: string | null
          frais?: number
          id?: string
          metadata?: Json | null
          paylink_id?: string | null
          reference?: string | null
          shop_id?: string | null
          status?: string
          type: string
          user_id?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          devise?: string
          formation_id?: string | null
          frais?: number
          id?: string
          metadata?: Json | null
          paylink_id?: string | null
          reference?: string | null
          shop_id?: string | null
          status?: string
          type?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_paylink_id_fkey"
            columns: ["paylink_id"]
            isOneToOne: false
            referencedRelation: "paylinks"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      tunnels_vente: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean
          slug: string | null
          steps: Json | null
          title: string
          total_conversions: number
          total_revenue: number
          total_visits: number
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          slug?: string | null
          steps?: Json | null
          title: string
          total_conversions?: number
          total_revenue?: number
          total_visits?: number
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean
          slug?: string | null
          steps?: Json | null
          title?: string
          total_conversions?: number
          total_revenue?: number
          total_visits?: number
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tunnels_vente_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tunnels_vente_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      user_devices: {
        Row: {
          created_at: string | null
          fingerprint: string
          id: string
          ip: string | null
          last_seen: string | null
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          fingerprint: string
          id?: string
          ip?: string | null
          last_seen?: string | null
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          fingerprint?: string
          id?: string
          ip?: string | null
          last_seen?: string | null
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
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
          {
            foreignKeyName: "variations_produit_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
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
          {
            foreignKeyName: "versements_investissement_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      video_access_logs: {
        Row: {
          accessed_at: string | null
          course_id: string | null
          device_fingerprint: string | null
          id: string
          ip: string | null
          user_id: string
          video_id: string | null
        }
        Insert: {
          accessed_at?: string | null
          course_id?: string | null
          device_fingerprint?: string | null
          id?: string
          ip?: string | null
          user_id: string
          video_id?: string | null
        }
        Update: {
          accessed_at?: string | null
          course_id?: string | null
          device_fingerprint?: string | null
          id?: string
          ip?: string | null
          user_id?: string
          video_id?: string | null
        }
        Relationships: []
      }
      video_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          created_at: string
          id: string
          module_id: string
          status: string
          updated_at: string
          user_id: string
          video_id: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          module_id: string
          status?: string
          updated_at?: string
          user_id: string
          video_id: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          module_id?: string
          status?: string
          updated_at?: string
          user_id?: string
          video_id?: string
        }
        Relationships: []
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
      withdrawals: {
        Row: {
          admin_note: string | null
          amount: number
          created_at: string | null
          devise: string
          frais: number
          id: string
          net_amount: number | null
          nom_beneficiaire: string | null
          processed_at: string | null
          reseau: string | null
          status: string
          telephone: string | null
          user_id: string | null
        }
        Insert: {
          admin_note?: string | null
          amount: number
          created_at?: string | null
          devise?: string
          frais?: number
          id?: string
          net_amount?: number | null
          nom_beneficiaire?: string | null
          processed_at?: string | null
          reseau?: string | null
          status?: string
          telephone?: string | null
          user_id?: string | null
        }
        Update: {
          admin_note?: string | null
          amount?: number
          created_at?: string | null
          devise?: string
          frais?: number
          id?: string
          net_amount?: number | null
          nom_beneficiaire?: string | null
          processed_at?: string | null
          reseau?: string | null
          status?: string
          telephone?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "withdrawals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      yupi_commandes: {
        Row: {
          adresse_livraison: string | null
          client_nom: string
          client_whatsapp: string
          created_at: string | null
          id: string
          items: Json
          notes: string | null
          reference: string
          statut: string
          total: number
          updated_at: string | null
          user_id: string | null
          ville: string
        }
        Insert: {
          adresse_livraison?: string | null
          client_nom: string
          client_whatsapp: string
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          reference: string
          statut?: string
          total?: number
          updated_at?: string | null
          user_id?: string | null
          ville: string
        }
        Update: {
          adresse_livraison?: string | null
          client_nom?: string
          client_whatsapp?: string
          created_at?: string | null
          id?: string
          items?: Json
          notes?: string | null
          reference?: string
          statut?: string
          total?: number
          updated_at?: string | null
          user_id?: string | null
          ville?: string
        }
        Relationships: [
          {
            foreignKeyName: "yupi_commandes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "yupi_commandes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
    }
    Views: {
      campagnes_stats: {
        Row: {
          boutique_id: string | null
          budget: number | null
          chiffre_affaire: number | null
          created_at: string | null
          devise: string | null
          id: string | null
          lien_campagne: string | null
          nb_conversions: number | null
          nb_visites: number | null
          nom: string | null
          produit_id: string | null
          produit_nom: string | null
          produit_photos: Json | null
          produit_prix: number | null
          source: string | null
          statut: string | null
          taux_conversion: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campagnes_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "produits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_produit_id_fkey"
            columns: ["produit_id"]
            isOneToOne: false
            referencedRelation: "v_produits_with_url"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "nexora_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campagnes_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "v_affiliate_stats"
            referencedColumns: ["user_id"]
          },
        ]
      }
      customers_with_stats: {
        Row: {
          address: string | null
          country: string | null
          country_flag: string | null
          country_name: string | null
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          last_order_at: string | null
          notes: string | null
          phone_number: string | null
          total_orders: number | null
          total_spent: number | null
          updated_at: string | null
          vendor_id: string | null
          whatsapp_number: string | null
        }
        Relationships: []
      }
      security_monitoring: {
        Row: {
          access_count_24h: number | null
          device_count: number | null
          email: string | null
          known_ips: string[] | null
          last_access: string | null
        }
        Relationships: []
      }
      v_affiliate_stats: {
        Row: {
          ref_code: string | null
          total_clicks: number | null
          total_commission: number | null
          total_sales: number | null
          user_id: string | null
        }
        Relationships: []
      }
      v_formation_stats: {
        Row: {
          actif: boolean | null
          duree_totale: number | null
          id: string | null
          nb_achats: number | null
          nb_lecons: number | null
          nb_modules: number | null
          prix: number | null
          revenu_total: number | null
          titre: string | null
        }
        Relationships: []
      }
      v_produits_with_url: {
        Row: {
          achats: number | null
          actif: boolean | null
          boutique_id: string | null
          categorie: string | null
          created_at: string | null
          description: string | null
          dimensions: string | null
          downloads_url: string | null
          fichier_nom: string | null
          fichier_taille: string | null
          fichier_url: string | null
          id: string | null
          instructions_achat: string | null
          livraison_automatique: boolean | null
          mode_tarification: string | null
          modules: Json | null
          moyens_paiement: Json | null
          nb_telechargements: number | null
          nexora_paylink_id: string | null
          nexora_paylink_url: string | null
          nexora_redirect_url: string | null
          nom: string | null
          paiement_lien: string | null
          paiement_reception: boolean | null
          payment_mode: string | null
          photos: Json | null
          poids: string | null
          politique_confidentialite: string | null
          politique_remboursement: string | null
          prix: number | null
          prix_promo: number | null
          protection_antipiratage: boolean | null
          reseaux_sociaux: Json | null
          seo_description: string | null
          seo_titre: string | null
          sku: string | null
          slug: string | null
          stock: number | null
          stock_illimite: boolean | null
          tags: Json | null
          total_revenue: number | null
          total_sold: number | null
          type: string | null
          type_digital: string | null
          type_produit: string | null
          updated_at: string | null
          url_acheter: string | null
          url_digital: string | null
          url_produit: string | null
          vedette: boolean | null
          vues: number | null
        }
        Relationships: [
          {
            foreignKeyName: "produits_boutique_id_fkey"
            columns: ["boutique_id"]
            isOneToOne: false
            referencedRelation: "boutiques"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "produits_nexora_paylink_id_fkey"
            columns: ["nexora_paylink_id"]
            isOneToOne: false
            referencedRelation: "nexora_paylinks"
            referencedColumns: ["id"]
          },
        ]
      }
      v_stats_produits_digitaux: {
        Row: {
          boutique_id: string | null
          prix_moyen: number | null
          produits_actifs: number | null
          produits_vedette: number | null
          total_achats: number | null
          total_produits: number | null
          total_vues: number | null
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
    }
    Functions: {
      admin_adjust_bonus: {
        Args: { p_montant: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_adjust_commissions: {
        Args: { p_montant: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_adjust_paylink: {
        Args: {
          p_montant: number
          p_note?: string
          p_paylink_id: string
          p_user_id: string
        }
        Returns: Json
      }
      admin_adjust_transfert: {
        Args: { p_montant: number; p_note?: string; p_user_id: string }
        Returns: Json
      }
      admin_reset_user_pin: {
        Args: { target_user_id: string }
        Returns: undefined
      }
      expire_pending_recharges: { Args: never; Returns: number }
      generate_slug: { Args: { input_text: string }; Returns: string }
      get_produit_by_slug: {
        Args: { p_boutique_slug: string; p_produit_slug: string }
        Returns: {
          achats: number | null
          actif: boolean
          boutique_id: string
          categorie: string | null
          created_at: string | null
          description: string | null
          description_ia: boolean
          dimensions: string | null
          downloads_url: string | null
          fichier_nom: string | null
          fichier_taille: string | null
          fichier_url: string | null
          id: string
          instructions_achat: string | null
          livraison_automatique: boolean
          mode_tarification: string | null
          modules: Json
          moyens_paiement: Json
          nb_telechargements: number | null
          nexora_paylink_id: string | null
          nexora_paylink_url: string | null
          nexora_redirect_url: string | null
          nom: string
          paiement_lien: string | null
          paiement_reception: boolean
          payment_mode: string | null
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
          slug: string
          stock: number
          stock_illimite: boolean
          tags: Json
          total_revenue: number
          total_sold: number
          type: string
          type_digital: string | null
          type_produit: string
          updated_at: string | null
          vedette: boolean
          video_url: string | null
          vues: number | null
        }[]
        SetofOptions: {
          from: "*"
          to: "produits"
          isOneToOne: false
          isSetofReturn: true
        }
      }
      increment_solde_commissions: {
        Args: { montant: number; user_id: string }
        Returns: undefined
      }
      increment_total_filleuls: {
        Args: { parrain_id: string }
        Returns: undefined
      }
      nettoyer_reservations_expirees: { Args: never; Returns: undefined }
      stock_disponible: { Args: { p_produit_id: string }; Returns: number }
      unique_slug_produit: {
        Args: { p_boutique_id: string; p_exclude_id?: string; p_nom: string }
        Returns: string
      }
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
