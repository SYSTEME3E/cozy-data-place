/**
 * BIEN-ÊTRE YUPI — Boutique Santé Naturelle
 */
import { useState } from "react";
import {
  ShoppingCart, Plus, Minus, Trash2, ChevronRight, Leaf,
  Heart, Zap, Shield, Star, ArrowLeft, Send, Phone,
  MapPin, User, Package, Info, MessageCircle, Baby, Activity, CheckCircle
} from "lucide-react";
import AppLayout from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { getNexoraUser } from "@/lib/nexora-auth";

const VENDEUR_WHATSAPP = "2290151762341";
const VENDEUR_WHATSAPP_DISPLAY = "+229 01 51 76 23 41";

const PRODUITS = [
  {
    id: 1, nom: "ALKA PLUS", prix: 18750,
    img: "https://i.postimg.cc/zfXPnf3Z/1769666515980.jpg",
    couleur: "from-blue-500 to-cyan-400", badge: "Équilibre pH", badgeColor: "bg-blue-500",
    roles: ["Alcalinise et équilibre le pH du corps.","Neutralise l'excès d'acidité stomacale.","Améliore la digestion et réduit les ballonnements.","Détoxifie l'organisme en profondeur.","Renforce le système immunitaire.","Améliore l'absorption des nutriments.","Réduit les douleurs articulaires liées à l'acidité.","Favorise une meilleure hydratation cellulaire.","Prévient l'ostéoporose en maintenant un pH optimal.","Réduit les risques de calculs rénaux."],
    maladies: ["Acidité gastrique & RGO","Reflux œsophagien","Arthrite","Goutte","Fatigue chronique","Calculs rénaux","Ostéoporose légère","Ballonnements chroniques"],
    combinaisons: [
      { maladie: "Reflux & Gastrite chronique", produits: ["ALKA PLUS","PILON CARE"], description: "Association puissante pour neutraliser l'acidité et cicatriser la muqueuse digestive." },
      { maladie: "Arthrite & Douleurs articulaires", produits: ["ALKA PLUS","PAIN AND COLD BALM","GOLDEN PAIN OIL"], description: "Triple action anti-inflammatoire et alcalinisante pour soulager durablement les articulations." },
      { maladie: "Calculs rénaux", produits: ["ALKA PLUS","DÉTOX (60 caps)"], description: "Alcalinisation + détoxification pour dissoudre les calculs et nettoyer les reins." },
    ],
  },
  {
    id: 2, nom: "DÉTOX (60 caps)", prix: 18750,
    img: "https://i.postimg.cc/mZcJXhw3/detox-health30.jpg",
    couleur: "from-green-500 to-emerald-400", badge: "Détox Profonde", badgeColor: "bg-green-500",
    roles: ["Nettoie le foie et les reins en profondeur.","Élimine les toxines et métaux lourds.","Améliore le transit intestinal.","Purifie le sang et régénère les cellules.","Réduit l'inflammation systémique.","Favorise la perte de poids naturelle.","Améliore le teint et l'éclat de la peau.","Booste l'énergie globale.","Régénère les cellules hépatiques.","Réduit le taux de mauvaises graisses dans le sang."],
    maladies: ["Intoxication alimentaire","Problèmes hépatiques","Constipation","Peau terne & acné","Surpoids","Foie gras","Cirrhose débutante","Kystes & tumeurs bénignes"],
    combinaisons: [
      { maladie: "Nettoyage hépatique complet", produits: ["DÉTOX (60 caps)","SEA BUCKTHORN JUICE"], description: "Combinaison idéale pour régénérer le foie et protéger les cellules hépatiques." },
      { maladie: "Perte de poids saine", produits: ["DÉTOX (60 caps)","ALKA PLUS"], description: "Détoxification profonde + alcalinisation pour une perte de poids durable." },
      { maladie: "Foie gras (stéatose hépatique)", produits: ["DÉTOX (60 caps)","SEA BUCKTHORN JUICE","YUPI DRINK (CAFÉ)"], description: "Triple action pour nettoyer le foie, réduire les graisses et régénérer les hépatocytes." },
    ],
  },
  {
    id: 3, nom: "IMMUNO BOOST (60 caps)", prix: 18750,
    img: "https://i.imgur.com/eHXzZbx.jpeg",
    couleur: "from-violet-500 to-purple-400", badge: "Immunité Max", badgeColor: "bg-violet-500",
    roles: ["Renforce l'immunité et protège contre toutes les infections.","Guérit les Hépatites virales A, B, C, D et E.","Combat le Paludisme, VIH, Méningite et Toxoplasmose.","Traite la Tuberculose et les infections pulmonaires.","Combat la Maladie d'Addison.","Traite toutes les maladies auto-immunes (lupus, sclérose…).","Soigne l'Asthénie chronique sévère.","Favorise la récupération rapide post-maladie.","Traite la Ménopause précoce.","Renforce les défenses des enfants fragiles.","Traite les infections urinaires récurrentes."],
    maladies: ["VIH/SIDA","Hépatites A-B-C-D-E","Paludisme résistant","Maladies auto-immunes (lupus)","Tuberculose","Méningite","Toxoplasmose","Infections urinaires récurrentes","Ménopause précoce"],
    combinaisons: [
      { maladie: "VIH & Infections virales sévères", produits: ["IMMUNO BOOST (60 caps)","SEA BUCKTHORN JUICE","YUPI DRINK (CAFÉ)"], description: "Synergie immunologique maximale pour booster les défenses et régénérer les cellules immunitaires." },
      { maladie: "Hépatites virales", produits: ["IMMUNO BOOST (60 caps)","DÉTOX (60 caps)"], description: "Action antivirale et hépatoprotectrice pour restaurer totalement la santé du foie." },
      { maladie: "Lupus & Maladies auto-immunes", produits: ["IMMUNO BOOST (60 caps)","SEA BUCKTHORN JUICE","ALKA PLUS"], description: "Régulation immunitaire + antioxydants puissants + équilibre pH pour calmer les auto-attaques." },
    ],
  },
  {
    id: 4, nom: "PAIN AND COLD BALM", prix: 2500,
    img: "https://i.imgur.com/DtFNIaI.jpeg",
    couleur: "from-red-500 to-rose-400", badge: "Anti-douleur", badgeColor: "bg-red-500",
    roles: ["Combat les maux de tête et migraines violentes.","Apaise les douleurs articulaires chroniques.","Soulage la lombalgie (mal de dos bas).","Traite les articulations gonflées et enflammées.","Soulage les entorses et contractures.","Soulage les muscles douloureux après effort.","Soulage l'arthrite de vieillesse.","Traite la polyarthrite rhumatoïde.","Soulage les douleurs de règles (dysménorrhée).","Calme les douleurs cervicales (torticolis)."],
    maladies: ["Maux de tête & migraines","Douleurs articulaires","Lombalgie","Arthrite","Entorses","Polyarthrite rhumatoïde","Douleurs menstruelles","Torticolis & cervicalgies"],
    combinaisons: [
      { maladie: "Arthrite sévère", produits: ["PAIN AND COLD BALM","GOLDEN PAIN OIL","ALKA PLUS"], description: "Application externe + ingestion interne pour un soulagement total des douleurs articulaires." },
      { maladie: "Douleurs de règles intenses", produits: ["PAIN AND COLD BALM","WOMEN CARE"], description: "Soulagement topique immédiat + régulation hormonale pour des règles moins douloureuses." },
    ],
  },
  {
    id: 5, nom: "GOLDEN PAIN OIL", prix: 8750,
    img: "https://i.postimg.cc/j5ST3zZc/IMG-20260201-WA0009.jpg",
    couleur: "from-yellow-500 to-amber-400", badge: "Huile Thérap.", badgeColor: "bg-yellow-500",
    roles: ["Soulage rapidement les douleurs musculaires profondes.","Anti-inflammatoire puissant à usage externe.","Améliore la circulation sanguine locale.","Soulage les rhumatismes et l'arthrose.","Traite les contractures et crampes musculaires.","Réduit l'enflure, les hématomes et les gonflements.","Effet chauffant et relaxant profond.","Apaise les douleurs nerveuses (névralgie, sciatique).","Traite les douleurs post-opératoires.","Soulage la fatigue musculaire des sportifs."],
    maladies: ["Rhumatismes","Arthrose","Contractures musculaires","Sciatique","Névralgies","Hématomes","Crampes","Douleurs post-sportives"],
    combinaisons: [
      { maladie: "Sciatique & Névralgie", produits: ["GOLDEN PAIN OIL","PAIN AND COLD BALM","SEA BUCKTHORN JUICE"], description: "Double action locale puissante + protection nerveuse par les antioxydants." },
      { maladie: "Arthrose avancée", produits: ["GOLDEN PAIN OIL","ALKA PLUS","SEA BUCKTHORN JUICE"], description: "Réduction de l'inflammation, régénération du cartilage et protection articulaire durable." },
    ],
  },
  {
    id: 6, nom: "COSTI AWAY", prix: 13125,
    img: "https://i.postimg.cc/JhQXVNNK/58516261-Nj-Iw-LTgy-Ny1k-Yz-Q4OWRj-Ym.webp",
    couleur: "from-teal-500 to-cyan-400", badge: "Anti-parasites", badgeColor: "bg-teal-500",
    roles: ["Élimine tous les parasites intestinaux (vers, amibes…).","Combat les infections bactériennes gastro-intestinales.","Traite la constipation et les coliques intestinales.","Soulage les ballonnements persistants et gaz.","Purifie le côlon en profondeur.","Élimine les vers intestinaux chez l'enfant et l'adulte.","Améliore l'absorption intestinale des nutriments.","Traite les infections parasitaires systémiques.","Combat la diarrhée persistante.","Traite le syndrome du côlon irritable."],
    maladies: ["Parasites intestinaux","Vers intestinaux","Constipation chronique","Infections bactériennes","Coliques","Syndrome du côlon irritable","Ballonnements chroniques","Diarrhée persistante"],
    combinaisons: [
      { maladie: "Parasites & Toxines", produits: ["COSTI AWAY","DÉTOX (60 caps)"], description: "Éradication des parasites + élimination des toxines laissées par ces parasites." },
      { maladie: "Côlon irritable", produits: ["COSTI AWAY","ALKA PLUS","PILON CARE"], description: "Assainissement du côlon + équilibre pH + cicatrisation intestinale pour retrouver un transit sain." },
    ],
  },
  {
    id: 7, nom: "WOMEN CARE", prix: 15625,
    img: "https://i.postimg.cc/sfJQtyvB/Whats-App-Image-2025-01-18-at-1-22-20-PM-4.jpg",
    couleur: "from-pink-500 to-rose-400", badge: "Santé Femme", badgeColor: "bg-pink-500",
    roles: ["Régularise le cycle menstruel (irrégulier ou absent).","Diminue le stress, les sautes d'humeur et l'irritabilité.","Stimule le désir sexuel féminin naturellement.","Traite les déséquilibres hormonaux profonds.","Soulage les douleurs de règles (dysménorrhée).","Promeut le bien-être émotionnel et mental.","Stimule le métabolisme et renforce l'immunité.","Soulage les symptômes de la ménopause.","Favorise la fertilité féminine naturelle.","Réduit les kystes ovariens fonctionnels.","Traite le SOPK (Syndrome des Ovaires Polykystiques).","Améliore la qualité des ovules.","Traite les pertes blanches anormales (leucorrhées).","Réduit les fibromes utérins bénins."],
    maladies: ["Irrégularités menstruelles","Aménorrhée (absence de règles)","Déséquilibre hormonal","SOPK (Ovaires polykystiques)","Ménopause précoce & difficile","Libido féminine faible","Infertilité féminine","Fibromes utérins","Kystes ovariens","Pertes blanches abondantes"],
    combinaisons: [
      { maladie: "Infertilité féminine", produits: ["WOMEN CARE","SEA BUCKTHORN JUICE","IMMUNO BOOST (60 caps)"], description: "Rééquilibrage hormonal + qualité des ovules + immunité optimale pour favoriser la conception." },
      { maladie: "SOPK & Irrégularités hormonales", produits: ["WOMEN CARE","DÉTOX (60 caps)","ALKA PLUS"], description: "Détox + alcalinisation + régulation hormonale pour vaincre le SOPK durablement." },
      { maladie: "Fibromes & Kystes ovariens", produits: ["WOMEN CARE","DÉTOX (60 caps)","SEA BUCKTHORN JUICE"], description: "Action combinée pour dissoudre les fibromes, réduire les kystes et restaurer l'équilibre utérin." },
      { maladie: "Ménopause difficile", produits: ["WOMEN CARE","YUPI DRINK (CAFÉ)","SEA BUCKTHORN JUICE"], description: "Équilibre hormonal naturel + antioxydants pour traverser la ménopause sans souffrir." },
      { maladie: "Règles douloureuses & abondantes", produits: ["WOMEN CARE","PAIN AND COLD BALM"], description: "Régulation hormonale profonde + soulagement topique immédiat des douleurs pelviennes." },
    ],
  },
  {
    id: 8, nom: "MEN POWER OIL", prix: 6250,
    img: "https://i.postimg.cc/zf1qzbQK/men-power-oil-1.jpg",
    couleur: "from-blue-600 to-indigo-500", badge: "Huile Virilité", badgeColor: "bg-blue-600",
    roles: ["Booste l'énergie masculine et la vitalité.","Augmente la libido naturellement.","Améliore le flux sanguin vers les organes génitaux.","Augmente l'endurance sexuelle.","Améliore les performances masculines au lit.","Favorise une libido masculine normale et durable.","Soulage le stress et l'anxiété de performance.","Améliore la vigueur et la virilité.","Renforce la sensibilité et le plaisir.","Utilisé en massage pour une action rapide."],
    maladies: ["Dysfonction érectile légère à modérée","Libido masculine faible","Fatigue sexuelle","Stress & anxiété de performance","Éjaculation précoce légère"],
    combinaisons: [
      { maladie: "Performance masculine complète", produits: ["MEN POWER OIL","MEN POWER MALT"], description: "Action externe (massage) + interne (nutrition) pour une virilité optimale et durable." },
      { maladie: "Dysfonction érectile", produits: ["MEN POWER OIL","MEN POWER MALT","YUPI DRINK (CAFÉ)"], description: "Triple synergie pour restaurer une érection ferme, durable et une libido au maximum." },
    ],
  },
  {
    id: 9, nom: "SEA BUCKTHORN JUICE", prix: 18750,
    img: "https://i.imgur.com/dCulCdA.jpeg",
    couleur: "from-orange-500 to-yellow-400", badge: "Antioxydant", badgeColor: "bg-orange-500",
    roles: ["Réduit le mauvais cholestérol (LDL) rapidement.","Contribue à la santé des dents et des os.","Lutte contre le stress oxydatif et le vieillissement.","Réduit l'inflammation chronique du corps.","Renforce le système immunitaire en profondeur.","Améliore la santé de la peau (rides, taches, éclat).","Protège contre les radiations et toxines.","Aide à combattre la coagulation sanguine pathologique.","Riche en Oméga 7 très biodisponibles.","Favorise la fertilité masculine et féminine.","Régénère les muqueuses digestives.","Prévient les maladies cardiovasculaires."],
    maladies: ["Cholestérol élevé","Ostéoporose","Vieillissement prématuré","Problèmes cutanés (rides, taches)","Maladies cardiaques","Anémie","Infertilité","Problèmes de circulation sanguine"],
    combinaisons: [
      { maladie: "Cholestérol & Santé cardiaque", produits: ["SEA BUCKTHORN JUICE","DÉTOX (60 caps)","ALKA PLUS"], description: "Protection cardiovasculaire globale : détox, alcalinisation et antioxydants naturels." },
      { maladie: "Anti-âge & Beauté peau", produits: ["SEA BUCKTHORN JUICE","YUPI DRINK (CAFÉ)"], description: "Régénération cellulaire complète pour une peau lumineuse et un corps rajeuni." },
      { maladie: "Fertilité (homme & femme)", produits: ["SEA BUCKTHORN JUICE","WOMEN CARE","IMMUNO BOOST (60 caps)"], description: "Antioxydants + hormones équilibrées + immunité renforcée pour maximiser les chances de conception." },
    ],
  },
  {
    id: 10, nom: "DIABO CARE", prix: 15625,
    img: "https://i.postimg.cc/sXsxjQKz/IMG-20260201-WA0003.jpg",
    couleur: "from-purple-500 to-violet-400", badge: "Anti-diabète", badgeColor: "bg-purple-500",
    roles: ["Régule naturellement la glycémie sans médicament chimique.","Améliore la sensibilité à l'insuline des cellules.","Réduit les pics de sucre après les repas.","Protège le pancréas et régénère ses cellules bêta.","Réduit toutes les complications diabétiques.","Améliore la circulation périphérique (pieds, mains).","Prévient les plaies diabétiques et les infections.","Soutient la santé des nerfs (neuropathie diabétique).","Réduit la soif et les urines fréquentes du diabétique.","Protège les reins des effets du diabète.","Prévient la cécité diabétique (rétinopathie)."],
    maladies: ["Diabète type 1 & type 2","Prédiabète","Insulinorésistance","Neuropathie diabétique","Rétinopathie diabétique","Néphropathie diabétique","Syndrome métabolique"],
    combinaisons: [
      { maladie: "Diabète type 2 complet", produits: ["DIABO CARE","DIABO CARE SPRAY","SEA BUCKTHORN JUICE"], description: "Régulation glycémique interne + soin des plaies + protection cellulaire antioxydante." },
      { maladie: "Diabète + Hypertension", produits: ["DIABO CARE","ALKA PLUS","SEA BUCKTHORN JUICE"], description: "Contrôle du sucre + équilibre pH + protection cardio pour traiter les deux ensemble." },
    ],
  },
  {
    id: 11, nom: "DIABO CARE SPRAY", prix: 8750,
    img: "https://i.postimg.cc/pT6pRqpQ/dd11f0fc-4b49-4537-aba5-28b18d5f9d34.jpg",
    couleur: "from-purple-400 to-pink-400", badge: "Plaies Diabète", badgeColor: "bg-purple-400",
    roles: ["Cicatrise les plaies diabétiques les plus résistantes.","Traite les ulcères des pieds diabétiques en profondeur.","Désinfecte et régénère les tissus nécrosés.","Prévient les infections cutanées graves.","Soulage les douleurs de la peau endommagée.","Accélère la régénération cellulaire cutanée.","Antibactérien naturel à large spectre.","Évite l'amputation dans les cas sévères.","Traite les escarres et plaies de pression."],
    maladies: ["Plaies diabétiques","Ulcères du pied diabétique","Infections cutanées sévères","Cicatrices rebelles","Escarres","Nécrose cutanée légère"],
    combinaisons: [
      { maladie: "Plaies & Ulcères diabétiques (éviter amputation)", produits: ["DIABO CARE SPRAY","DIABO CARE","SEA BUCKTHORN JUICE"], description: "Traitement interne + externe + antioxydants pour soigner les plaies et éviter l'amputation." },
    ],
  },
  {
    id: 12, nom: "DÉTOX HEATH (30 caps)", prix: 9325,
    img: "https://i.postimg.cc/mZcJXhw3/detox-health30.jpg",
    couleur: "from-green-400 to-teal-400", badge: "Mini-Détox", badgeColor: "bg-green-400",
    roles: ["Nettoie le foie et les reins (cure d'entretien 30 jours).","Élimine les toxines légères accumulées.","Améliore le transit intestinal et la digestion.","Purifie le sang et favorise l'énergie.","Réduit les ballonnements et l'inconfort.","Améliore le teint et l'éclat naturel de la peau.","Version idéale pour une cure d'entretien mensuelle.","Parfait après une cure de 60 jours."],
    maladies: ["Entretien hépatique mensuel","Légère intoxication alimentaire","Fatigue légère","Transit paresseux","Teint terne"],
    combinaisons: [
      { maladie: "Cure d'entretien mensuelle", produits: ["DÉTOX HEATH (30 caps)","ALKA PLUS"], description: "Cure mensuelle de détox légère + équilibre pH pour maintenir l'organisme en santé optimale." },
    ],
  },
  {
    id: 13, nom: "PILON CARE", prix: 15625,
    img: "https://i.postimg.cc/tgg2VDwm/Pilon-care.png",
    couleur: "from-red-400 to-orange-400", badge: "Hémorroïdes", badgeColor: "bg-red-400",
    roles: ["Améliore la digestion et régule le transit intestinal.","Contrôle les hémorragies rectales et démangeaisons.","Rétrécit et assèche les hémorroïdes internes et externes.","Soulage les douleurs et brûlures insupportables.","Cicatrise les plaies anales et fissures.","Soulage les saignements et la sensation de brûlure.","Réduit l'inflammation et le gonflement rectal.","Traite les fissures anales douloureuses.","Prévient les récidives hémorroïdaires."],
    maladies: ["Hémorroïdes internes & externes","Saignements rectaux","Fissures anales","Constipation chronique","Prolapsus rectal bénin","Démangeaisons anales"],
    combinaisons: [
      { maladie: "Hémorroïdes sévères + Constipation", produits: ["PILON CARE","ALKA PLUS","DÉTOX (60 caps)"], description: "Traitement des hémorroïdes + équilibre pH + nettoyage du côlon pour une guérison complète." },
    ],
  },
  {
    id: 14, nom: "MEN POWER MALT", prix: 18750,
    img: "https://i.imgur.com/psVzO57.jpeg",
    couleur: "from-blue-700 to-blue-500", badge: "Virilité Max", badgeColor: "bg-blue-700",
    roles: ["Booste l'énergie masculine de façon durable.","Augmente la libido naturellement et progressivement.","Augmente le flux sanguin vers les organes génitaux.","Augmente l'endurance et la durée au lit.","Améliore les performances sexuelles masculines.","Favorise une libido masculine normale et stable.","Soulage le stress et l'anxiété de performance.","Améliore la vigueur et la virilité au quotidien.","Favorise la fertilité masculine (qualité du sperme).","Augmente le volume et la mobilité des spermatozoïdes.","Traite l'éjaculation précoce.","Combat la faiblesse sexuelle liée à l'âge.","Renforce la testostérone naturellement."],
    maladies: ["Dysfonction érectile légère à sévère","Éjaculation précoce","Infertilité masculine (azoospermie, oligospermie)","Libido masculine faible","Fatigue sexuelle chronique","Manque de testostérone","Prostate enflammée légère"],
    combinaisons: [
      { maladie: "Infertilité masculine", produits: ["MEN POWER MALT","SEA BUCKTHORN JUICE","IMMUNO BOOST (60 caps)"], description: "Amélioration de la qualité spermatique + protection antioxydante + immunité renforcée." },
      { maladie: "Dysfonction érectile sévère", produits: ["MEN POWER MALT","MEN POWER OIL","YUPI DRINK (CAFÉ)"], description: "Action interne puissante + massage local + énergie globale pour restaurer une érection totale." },
      { maladie: "Éjaculation précoce", produits: ["MEN POWER MALT","MEN POWER OIL"], description: "Régulation du système nerveux + amélioration du contrôle musculaire pour une meilleure endurance." },
    ],
  },
  {
    id: 15, nom: "IMMUNO BOOST (30 caps)", prix: 9375,
    img: "https://i.imgur.com/eHXzZbx.jpeg",
    couleur: "from-violet-400 to-blue-400", badge: "Immunité 30j", badgeColor: "bg-violet-400",
    roles: ["Version 30 jours de l'Immuno Boost complet.","Renforce l'immunité rapidement.","Protège contre les infections saisonnières (grippe, rhume).","Apporte énergie et vitalité dès la première semaine.","Favorise la récupération rapide post-maladie.","Idéal pour une cure d'entretien immunitaire.","Combat la fatigue et l'asthénie légère.","Renforce les enfants et personnes âgées fragiles."],
    maladies: ["Infections saisonnières (grippe, rhume)","Fatigue légère","Convalescence post-maladie","Faiblesse immunitaire légère","Rhinite & sinusite récurrente"],
    combinaisons: [
      { maladie: "Grippe & Infections ORL", produits: ["IMMUNO BOOST (30 caps)","DENTAL DROP"], description: "Immunité renforcée + soin des voies ORL pour une guérison rapide des infections respiratoires." },
      { maladie: "Convalescence rapide", produits: ["IMMUNO BOOST (30 caps)","YUPI DRINK (CAFÉ)","SEA BUCKTHORN JUICE"], description: "Récupération accélérée grâce à l'énergie, l'immunité et les antioxydants réunis." },
    ],
  },
  {
    id: 16, nom: "DENTAL DROP", prix: 2500,
    img: "https://i.postimg.cc/jqGF1Hjf/IMG-20260201-WA0013.jpg",
    couleur: "from-sky-400 to-blue-300", badge: "Santé Dentaire", badgeColor: "bg-sky-400",
    roles: ["Soigne les caries et stoppe leur progression.","Élimine les bactéries buccales nuisibles.","Traite les infections des gencives (gingivite, parodontite).","Soulage les maux de dents aigus.","Élimine la mauvaise haleine (halitose) durablement.","Blanchit naturellement les dents jaunes.","Prévient la perte de dents prématurée.","Réduit le tartre et la plaque dentaire.","Traite les abcès dentaires légers.","Renforce l'émail dentaire."],
    maladies: ["Caries dentaires","Gingivite & Parodontite","Mauvaise haleine chronique","Infections gingivales","Sensibilité dentaire","Abcès dentaire","Tartre abondant"],
    combinaisons: [
      { maladie: "Infections buccales sévères & Abcès", produits: ["DENTAL DROP","IMMUNO BOOST (30 caps)","SEA BUCKTHORN JUICE"], description: "Soin buccal local + immunité renforcée + antioxydants pour une guérison complète et durable." },
    ],
  },
  {
    id: 17, nom: "YUPI DRINK (CAFÉ)", prix: 12500,
    img: "https://i.postimg.cc/FsR5NgsZ/yupi-drink-coffee-1.png",
    couleur: "from-amber-700 to-yellow-500", badge: "Énergie & Bien-être", badgeColor: "bg-amber-700",
    roles: ["Fournit une énergie instantanée et durable toute la journée.","Réduit le stress chronique et l'anxiété.","Améliore la concentration, la mémoire et les réflexes.","Renforce l'immunité globale de l'organisme.","Donne de l'éclat et de la luminosité à la peau.","Améliore profondément la qualité du sommeil.","Améliore la santé cardiaque et réduit la tension.","Soutient la digestion et protège la santé du foie.","Soutient la santé de la prostate (hypertrophie bénigne).","Contribue à l'équilibre hormonal masculin et féminin.","Riche en antioxydants naturels puissants.","Améliore les performances physiques et intellectuelles.","Combat le diabète et régule la glycémie."],
    maladies: ["Fatigue chronique sévère","Stress & Burn-out","Troubles de la concentration & mémoire","Problèmes de prostate","Troubles du sommeil","Déséquilibres hormonaux","Hypertension légère"],
    combinaisons: [
      { maladie: "Burn-out & Fatigue extrême", produits: ["YUPI DRINK (CAFÉ)","SEA BUCKTHORN JUICE","IMMUNO BOOST (60 caps)"], description: "Énergie immédiate + protection antioxydante + immunité pour vaincre la fatigue profonde." },
      { maladie: "Prostate & Santé masculine", produits: ["YUPI DRINK (CAFÉ)","MEN POWER MALT","SEA BUCKTHORN JUICE"], description: "Triple soutien pour la prostate, la virilité et la santé cardiovasculaire masculine." },
      { maladie: "Mémoire & Concentration", produits: ["YUPI DRINK (CAFÉ)","SEA BUCKTHORN JUICE"], description: "Boost cognitif naturel + protection neuronale pour rester alerte, concentré et performant." },
    ],
  },
];

interface CartItem { id: number; nom: string; prix: number; img: string; qty: number; }
interface OrderForm { nom: string; whatsapp: string; ville: string; adresse: string; notes: string; }
type View = "shop" | "detail" | "cart" | "checkout" | "contact";

export default function YupiGlobalShopPage() {
  const user = getNexoraUser();
  const [view, setView]         = useState<View>("shop");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [search, setSearch]     = useState("");
  const [orderForm, setOrderForm] = useState<OrderForm>({ nom: user?.nom_prenom || "", whatsapp: "", ville: "", adresse: "", notes: "" });
  const [submitting, setSubmitting] = useState(false);
  const [orderRef, setOrderRef] = useState("");

  const selected = PRODUITS.find(p => p.id === selectedId) || null;
  const filtered = PRODUITS.filter(p =>
    p.nom.toLowerCase().includes(search.toLowerCase()) ||
    p.maladies.some(m => m.toLowerCase().includes(search.toLowerCase()))
  );
  const cartCount = cart.reduce((a, b) => a + b.qty, 0);
  const cartTotal = cart.reduce((a, b) => a + b.prix * b.qty, 0);

  const addToCart = (p: typeof PRODUITS[0], qty = 1) => {
    setCart(prev => {
      const ex = prev.find(i => i.id === p.id);
      if (ex) return prev.map(i => i.id === p.id ? { ...i, qty: i.qty + qty } : i);
      return [...prev, { id: p.id, nom: p.nom, prix: p.prix, img: p.img, qty }];
    });
  };
  const updateQty = (id: number, d: number) => setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + d) } : i));
  const removeFromCart = (id: number) => setCart(prev => prev.filter(i => i.id !== id));
  const goDetail = (id: number) => { setSelectedId(id); setView("detail"); };

  const submitOrder = async () => {
    if (!orderForm.nom || !orderForm.whatsapp || !orderForm.ville) return;
    setSubmitting(true);
    const ref = "YUPI-" + Date.now().toString().slice(-6);
    setOrderRef(ref);

    // ✅ Enregistrement en base — visible dans la page Commandes YUPI (admin)
    // ❌ Aucun message WhatsApp automatique envoyé à l'acheteur
    try {
      const { error } = await (supabase as any).from("yupi_commandes").insert({
        reference: ref,
        client_nom: orderForm.nom,
        client_whatsapp: orderForm.whatsapp,
        ville: orderForm.ville,
        adresse_livraison: orderForm.adresse,
        notes: orderForm.notes,
        items: cart,
        total: cartTotal,
        statut: "en_attente",
        user_id: user?.id || null,
      });
      if (error) console.error("Erreur insert commande YUPI:", error);
    } catch (e) { console.error("Erreur insert commande YUPI:", e); }

    setCart([]);
    setSubmitting(false);
    setView("contact");
  };

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto pb-16">

        {/* ═══════════ PAGE SUCCÈS ═══════════ */}
        {view === "contact" && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] text-center px-4">
            {/* Logo + animation */}
            <div className="relative mb-6">
              <div className="w-28 h-28 rounded-3xl overflow-hidden shadow-2xl border-4 border-green-400/40">
                <img src="https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png" alt="BIEN-ÊTRE YUPI"
                  className="w-full h-full object-cover" />
              </div>
              <div className="absolute -bottom-2 -right-2 w-10 h-10 bg-green-400 rounded-full flex items-center justify-center shadow-lg">
                <CheckCircle className="w-6 h-6 text-white" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-foreground mb-2">Commande reçue ! 🎉</h2>
            <p className="text-green-500 font-bold mb-1">Réf : <span className="font-mono bg-green-500/10 px-2 py-0.5 rounded-lg">{orderRef}</span></p>
            <p className="text-sm text-muted-foreground max-w-xs mb-8">
              Votre commande a bien été enregistrée. Le vendeur vous contactera sur votre WhatsApp pour confirmer la livraison.
            </p>

            <div className="bg-card border border-border rounded-3xl p-6 max-w-sm w-full mb-6 text-left space-y-3">
              <p className="text-xs font-black text-muted-foreground uppercase tracking-widest">Récapitulatif</p>
              <div className="flex items-center gap-2 text-sm">
                <User className="w-4 h-4 text-violet-400 flex-shrink-0" />
                <span className="font-semibold text-foreground">{orderForm.nom}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
                <span className="text-foreground">{orderForm.whatsapp}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-foreground">{orderForm.ville}{orderForm.adresse ? ` · ${orderForm.adresse}` : ""}</span>
              </div>
              <div className="border-t border-border pt-3 flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-semibold">Statut</span>
                <span className="text-xs font-black text-yellow-500 bg-yellow-500/10 px-2.5 py-1 rounded-full">⏳ En attente</span>
              </div>
            </div>

            <button
              onClick={() => {
                setView("shop");
                setOrderForm({ nom: user?.nom_prenom || "", whatsapp: "", ville: "", adresse: "", notes: "" });
                setOrderRef("");
              }}
              className="bg-gradient-to-r from-violet-500 to-blue-500 text-white font-black px-8 py-3.5 rounded-2xl shadow-lg hover:opacity-90 transition-opacity"
            >
              Retour à la boutique
            </button>
          </div>
        )}

        {/* ═══════════ PAGE CHECKOUT ═══════════ */}
        {view === "checkout" && (
          <div>
            <button onClick={() => setView("cart")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour au panier
            </button>
            <div className="bg-gradient-to-r from-violet-600 to-blue-600 rounded-3xl p-6 text-white mb-5">
              <h2 className="text-2xl font-black mb-1">Finaliser la commande</h2>
              <p className="opacity-80 text-sm">Renseignez vos informations · votre commande sera enregistrée</p>
            </div>
            <div className="bg-card border border-border rounded-2xl p-4 mb-5">
              <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground mb-3">Récapitulatif</h3>
              {cart.map(item => (
                <div key={item.id} className="flex justify-between text-sm mb-1">
                  <span className="font-semibold">{item.nom} <span className="text-muted-foreground font-normal">×{item.qty}</span></span>
                  <span className="font-black text-green-500">{(item.prix * item.qty).toLocaleString()} FCFA</span>
                </div>
              ))}
              <div className="border-t border-border pt-2 mt-2 flex justify-between font-black">
                <span>TOTAL</span><span className="text-xl text-violet-500">{cartTotal.toLocaleString()} FCFA</span>
              </div>
            </div>
            <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
              {[
                { key: "nom",      label: "Nom complet *",        icon: <User className="w-4 h-4" />,    placeholder: "Jean Dupont",               type: "text" },
                { key: "whatsapp", label: "Numéro WhatsApp *",    icon: <Phone className="w-4 h-4" />,   placeholder: "+229 97 000 000",           type: "tel"  },
                { key: "ville",    label: "Ville *",              icon: <MapPin className="w-4 h-4" />,  placeholder: "Cotonou, Parakou…",         type: "text" },
                { key: "adresse",  label: "Adresse de livraison", icon: <Package className="w-4 h-4" />, placeholder: "Quartier, rue, repère…",    type: "text" },
              ].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">{f.label}</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">{f.icon}</span>
                    <input type={f.type} placeholder={f.placeholder} value={orderForm[f.key as keyof OrderForm]}
                      onChange={e => setOrderForm(prev => ({ ...prev, [f.key]: e.target.value }))}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-border bg-muted/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
                  </div>
                </div>
              ))}
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1.5 block">Notes supplémentaires</label>
                <textarea rows={3} placeholder="Précisions, horaires disponibles…" value={orderForm.notes}
                  onChange={e => setOrderForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border border-border bg-muted/50 text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40 resize-none" />
              </div>
              <button onClick={submitOrder} disabled={submitting || !orderForm.nom || !orderForm.whatsapp || !orderForm.ville}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-emerald-500 disabled:opacity-50 text-white font-black py-4 rounded-2xl text-lg shadow-lg hover:opacity-90 transition-opacity">
                {submitting ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full inline-block" /> : <><Send className="w-5 h-5" /> Valider & Commander</>}
              </button>
              <p className="text-xs text-muted-foreground text-center">Le vendeur vous contactera sur votre WhatsApp pour confirmer et organiser la livraison.</p>
            </div>
          </div>
        )}

        {/* ═══════════ PAGE PANIER ═══════════ */}
        {view === "cart" && (
          <div>
            <button onClick={() => setView("shop")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour à la boutique
            </button>
            <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-3xl p-6 text-white mb-6">
              <div className="flex items-center gap-3">
                <ShoppingCart className="w-7 h-7" />
                <div><h2 className="text-2xl font-black">Mon Panier</h2>
                  <p className="opacity-80 text-sm">{cartCount} article{cartCount > 1 ? "s" : ""} · {cartTotal.toLocaleString()} FCFA</p></div>
              </div>
            </div>
            {cart.length === 0 ? (
              <div className="text-center py-16">
                <ShoppingCart className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
                <p className="text-muted-foreground font-semibold">Votre panier est vide</p>
                <button onClick={() => setView("shop")} className="mt-4 text-sm text-violet-500 font-bold hover:underline">Continuer les achats</button>
              </div>
            ) : (
              <div className="space-y-3">
                {cart.map(item => (
                  <div key={item.id} className="bg-card border border-border rounded-2xl p-4 flex items-center gap-4">
                    <img src={item.img} alt={item.nom} onClick={() => goDetail(item.id)}
                      className="w-16 h-16 rounded-xl object-cover flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                      onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/200x200/1e1e3f/fff?text=${encodeURIComponent(item.nom)}`; }} />
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-sm text-foreground truncate">{item.nom}</p>
                      <p className="text-xs text-green-500 font-bold">{item.prix.toLocaleString()} FCFA/unité</p>
                      <p className="text-xs text-muted-foreground">Sous-total : {(item.prix * item.qty).toLocaleString()} FCFA</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => updateQty(item.id, -1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-red-100 hover:text-red-500 transition-colors"><Minus className="w-3.5 h-3.5" /></button>
                      <span className="w-6 text-center font-black text-sm">{item.qty}</span>
                      <button onClick={() => updateQty(item.id, 1)} className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center hover:bg-green-100 hover:text-green-500 transition-colors"><Plus className="w-3.5 h-3.5" /></button>
                      <button onClick={() => removeFromCart(item.id)} className="w-8 h-8 rounded-lg bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 transition-colors ml-1"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                    </div>
                  </div>
                ))}
                <div className="bg-violet-500/10 border border-violet-500/20 rounded-2xl p-5 flex items-center justify-between">
                  <div><p className="text-sm text-muted-foreground">Total à payer</p>
                    <p className="text-3xl font-black text-violet-500">{cartTotal.toLocaleString()} FCFA</p></div>
                  <button onClick={() => setView("checkout")} className="flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold px-6 py-3 rounded-2xl shadow-lg hover:opacity-90">
                    Commander <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ═══════════ PAGE DÉTAIL PRODUIT ═══════════ */}
        {view === "detail" && selected && (
          <div>
            <button onClick={() => setView("shop")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6">
              <ArrowLeft className="w-4 h-4" /> Retour à la boutique
            </button>
            <div className="grid md:grid-cols-2 gap-6 mb-8">
              <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${selected.couleur} p-1`}>
                <img src={selected.img} alt={selected.nom}
                  className="w-full h-64 md:h-80 object-cover rounded-[20px] cursor-zoom-in"
                  onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/400x300/1e1e3f/fff?text=${encodeURIComponent(selected.nom)}`; }} />
                <div className={`absolute top-4 left-4 ${selected.badgeColor} text-white text-xs font-black px-3 py-1 rounded-full shadow`}>{selected.badge}</div>
              </div>
              <div className="flex flex-col justify-between">
                <div>
                  <h1 className="text-3xl font-black text-foreground mb-2">{selected.nom}</h1>
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />)}
                    <span className="text-xs text-muted-foreground ml-2">Produit certifié BIEN-ÊTRE YUPI</span>
                  </div>
                  <p className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-4">{selected.prix.toLocaleString()} <span className="text-xl">FCFA</span></p>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {selected.maladies.map(m => <span key={m} className="text-xs bg-red-500/10 text-red-400 border border-red-500/20 px-2.5 py-1 rounded-full font-semibold">{m}</span>)}
                  </div>
                </div>
                <div className="space-y-3">
                  <button onClick={() => { addToCart(selected); setView("cart"); }}
                    className={`w-full bg-gradient-to-r ${selected.couleur} text-white font-black py-4 rounded-2xl text-lg shadow-xl hover:opacity-90 flex items-center justify-center gap-2`}>
                    <ShoppingCart className="w-5 h-5" /> Ajouter au panier
                  </button>
                  <a href={`https://wa.me/${VENDEUR_WHATSAPP}?text=${encodeURIComponent(`Bonjour, je suis intéressé par : ${selected.nom} (${selected.prix.toLocaleString()} FCFA). Pouvez-vous me renseigner ? 🌿`)}`}
                    target="_blank" rel="noreferrer"
                    className="w-full flex items-center justify-center gap-2 border-2 border-green-500 text-green-500 font-bold py-3 rounded-2xl hover:bg-green-500/10 transition-colors text-sm">
                    <MessageCircle className="w-4 h-4" /> Demander conseil sur WhatsApp
                  </a>
                </div>
              </div>
            </div>
            <div className="bg-card border border-border rounded-3xl p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${selected.couleur} flex items-center justify-center`}><Leaf className="w-4 h-4 text-white" /></div>
                <h3 className="font-black text-lg">Rôles & Bienfaits</h3>
              </div>
              <ul className="space-y-2.5">
                {selected.roles.map((r, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />{r}
                  </li>
                ))}
              </ul>
            </div>
            {selected.combinaisons.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-1"><Zap className="w-5 h-5 text-yellow-400" /><h3 className="font-black text-lg">Protocoles de Guérison Recommandés</h3></div>
                {selected.combinaisons.map((combo, i) => (
                  <div key={i} className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl p-5">
                    <p className="font-black text-yellow-500 mb-2">🎯 {combo.maladie}</p>
                    <div className="flex flex-wrap gap-2 mb-3">
                      {combo.produits.map(p => <span key={p} className="text-xs bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 font-bold px-2.5 py-1 rounded-full">{p}</span>)}
                    </div>
                    <p className="text-sm text-muted-foreground">{combo.description}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ═══════════ BOUTIQUE PRINCIPALE ═══════════ */}
        {view === "shop" && (
          <div>
            {/* Hero */}
            <div className="relative overflow-hidden rounded-3xl mb-8"
              style={{ background: "linear-gradient(135deg,#0f172a 0%,#1e1b4b 25%,#312e81 55%,#065f46 100%)" }}>
              {[{w:80,h:80,l:"5%",t:"10%",c:"#60a5fa"},{w:50,h:50,l:"15%",t:"65%",c:"#34d399"},{w:100,h:100,l:"70%",t:"5%",c:"#f59e0b"},{w:60,h:60,l:"80%",t:"60%",c:"#f87171"},{w:45,h:45,l:"45%",t:"70%",c:"#a78bfa"},{w:70,h:70,l:"55%",t:"20%",c:"#4ade80"},{w:35,h:35,l:"90%",t:"35%",c:"#fb923c"},{w:55,h:55,l:"30%",t:"15%",c:"#38bdf8"}].map((b,i) => (
                <div key={i} className="absolute rounded-full opacity-15" style={{width:b.w,height:b.h,left:b.l,top:b.t,background:b.c}} />
              ))}
              <div className="relative z-10 p-7 sm:p-10 text-white">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-2xl overflow-hidden shadow-lg border-2 border-white/20 flex-shrink-0">
                    <img src="https://i.postimg.cc/bYSB8r5L/Yupi-logo-1536x1058.png" alt="Logo BIEN-ÊTRE YUPI"
                      className="w-full h-full object-cover" />
                  </div>
                  <span className="text-green-300 font-bold text-sm tracking-widest uppercase">100% Naturel · Certifié</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-black mb-1 leading-tight">BIEN-ÊTRE
                  <span className="block text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-green-300 to-cyan-300">YUPI 🌿</span>
                </h1>
                <p className="text-indigo-200 text-sm max-w-md mb-5">Boutique de santé naturelle · Produits certifiés · Livraison partout au Bénin 🇧🇯 et en Afrique</p>
                <a href={`https://wa.me/${VENDEUR_WHATSAPP}?text=${encodeURIComponent("Bonjour, j'ai une question sur les produits BIEN-ÊTRE YUPI 🌿")}`}
                  target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-2 bg-green-400/20 border border-green-400/40 text-white text-sm font-bold px-4 py-2.5 rounded-2xl hover:bg-green-400/30 transition-colors mb-4">
                  <MessageCircle className="w-4 h-4 text-green-300" /> Nous contacter sur WhatsApp
                </a>
                <button onClick={() => setView("cart")}
                  className="relative inline-flex items-center gap-2 bg-white/15 border border-white/30 text-white text-sm font-bold px-4 py-2.5 rounded-2xl hover:bg-white/25 transition-colors mb-4 ml-2">
                  <ShoppingCart className="w-4 h-4" />
                  {cartCount > 0 ? (
                    <><span>{cartCount} article{cartCount > 1 ? "s" : ""}</span>
                    <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span></>
                  ) : <span>Panier</span>}
                </button>
                <div className="flex flex-wrap gap-2">
                  {[{icon:<Shield className="w-3.5 h-3.5"/>,l:"Certifié"},{icon:<Heart className="w-3.5 h-3.5"/>,l:"100% Naturel"},{icon:<Zap className="w-3.5 h-3.5"/>,l:"Résultats rapides"},{icon:<Baby className="w-3.5 h-3.5"/>,l:"Fertilité"},{icon:<Activity className="w-3.5 h-3.5"/>,l:"Virilité & Femme"}].map(tag => (
                    <span key={tag.l} className="flex items-center gap-1.5 bg-white/10 text-white/90 text-xs font-bold px-3 py-1.5 rounded-full border border-white/20">{tag.icon} {tag.l}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Barre recherche + panier */}
            <div className="flex items-center gap-3 mb-5">
              <input placeholder="🔍 Rechercher un produit ou une maladie…" value={search} onChange={e => setSearch(e.target.value)}
                className="flex-1 pl-4 pr-4 py-3 rounded-2xl border border-border bg-card text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/40" />
              <button onClick={() => setView("cart")}
                className="relative flex items-center gap-2 bg-gradient-to-r from-violet-500 to-blue-500 text-white font-bold px-4 py-3 rounded-2xl shadow hover:opacity-90 flex-shrink-0">
                <ShoppingCart className="w-5 h-5" />
                {cartCount > 0 && <span className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs font-black rounded-full flex items-center justify-center">{cartCount}</span>}
                <span className="hidden sm:inline">{cartTotal > 0 ? `${cartTotal.toLocaleString()} F` : "Panier"}</span>
              </button>
            </div>

            {/* Grille produits */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {filtered.map(p => (
                <div key={p.id} className="group bg-card border border-border rounded-2xl overflow-hidden hover:border-violet-500/40 hover:shadow-xl transition-all duration-300 flex flex-col">
                  <div className={`relative overflow-hidden bg-gradient-to-br ${p.couleur} p-0.5`}>
                    <div className="relative overflow-hidden rounded-t-[14px]">
                      <img src={p.img} alt={p.nom} onClick={() => goDetail(p.id)}
                        className="w-full h-36 object-cover group-hover:scale-105 transition-transform duration-500 cursor-pointer"
                        onError={e => { (e.target as HTMLImageElement).src = `https://placehold.co/300x200/1e1e3f/fff?text=${encodeURIComponent(p.nom)}`; }} />
                      <div className={`absolute top-2 left-2 ${p.badgeColor} text-white text-[10px] font-black px-2 py-0.5 rounded-full`}>{p.badge}</div>
                    </div>
                  </div>
                  <div className="p-3 flex flex-col flex-1">
                    <h3 className="font-black text-xs text-foreground mb-1 leading-tight cursor-pointer hover:text-violet-500 transition-colors" onClick={() => goDetail(p.id)}>{p.nom}</h3>
                    <p className="text-[10px] text-muted-foreground mb-2 line-clamp-2">{p.maladies.slice(0,2).join(" · ")}</p>
                    <p className="text-base font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-400 mb-3">{p.prix.toLocaleString()} F</p>
                    <div className="mt-auto space-y-1.5">
                      <button onClick={() => goDetail(p.id)} className="w-full flex items-center justify-center gap-1.5 border border-border text-foreground text-[11px] font-bold py-1.5 rounded-xl hover:bg-muted transition-colors">
                        <Info className="w-3 h-3" /> Voir détails & rôles
                      </button>
                      <button onClick={() => addToCart(p)} className={`w-full bg-gradient-to-r ${p.couleur} text-white text-[11px] font-black py-1.5 rounded-xl hover:opacity-90 flex items-center justify-center gap-1.5`}>
                        <Plus className="w-3 h-3" /> Ajouter au panier
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {filtered.length === 0 && (
              <div className="text-center py-16">
                <p className="text-muted-foreground">Aucun résultat pour "<strong>{search}</strong>"</p>
                <button onClick={() => setSearch("")} className="mt-3 text-sm text-violet-500 font-bold hover:underline">Voir tous les produits</button>
              </div>
            )}

            {/* Catégories santé */}
            <div className="mt-10 space-y-4">
              <h3 className="font-black text-base text-foreground flex items-center gap-2"><Zap className="w-5 h-5 text-yellow-400" /> Solutions par catégorie</h3>
              <div className="grid sm:grid-cols-2 gap-4">
                {[
                  { icon: "🚺", title: "Santé de la Femme", items: ["Infertilité & difficultés à concevoir","SOPK & Fibromes utérins","Règles douloureuses ou absentes","Ménopause difficile","Pertes blanches & Kystes ovariens","Déséquilibre hormonal"], bg:"from-pink-500/10 to-rose-500/10", border:"border-pink-500/20", solution:"WOMEN CARE" },
                  { icon: "🚹", title: "Virilité & Santé Masculine", items: ["Dysfonction érectile","Infertilité masculine (sperme faible)","Éjaculation précoce","Prostate enflée","Libido & endurance sexuelle","Testostérone faible"], bg:"from-blue-500/10 to-indigo-500/10", border:"border-blue-500/20", solution:"MEN POWER MALT + OIL" },
                  { icon: "👶", title: "Fertilité & Conception", items: ["Difficultés à tomber enceinte","Améliorer la qualité des ovules","Améliorer la qualité du sperme","Déséquilibre hormonal profond","Préparer le corps à la conception","Soutien après fausse couche"], bg:"from-emerald-500/10 to-green-500/10", border:"border-emerald-500/20", solution:"WOMEN CARE + SEA BUCKTHORN" },
                  { icon: "💊", title: "Maladies Chroniques", items: ["Diabète type 1 & 2","Hypertension artérielle","Cholestérol & maladies cardiaques","VIH & Hépatites virales","Maladies auto-immunes & lupus","Parasites & infections résistantes"], bg:"from-purple-500/10 to-violet-500/10", border:"border-purple-500/20", solution:"DIABO CARE + IMMUNO BOOST" },
                ].map(cat => (
                  <div key={cat.title} className={`bg-gradient-to-br ${cat.bg} border ${cat.border} rounded-2xl p-5`}>
                    <div className="flex items-center gap-2 mb-3"><span className="text-xl">{cat.icon}</span><h4 className="font-black text-sm text-foreground">{cat.title}</h4></div>
                    <ul className="space-y-1 mb-3">
                      {cat.items.map(item => <li key={item} className="text-xs text-muted-foreground flex items-center gap-2"><span>·</span>{item}</li>)}
                    </ul>
                    <p className="text-[10px] font-bold text-muted-foreground">✅ Solution : <span className="text-foreground">{cat.solution}</span></p>
                  </div>
                ))}
              </div>
            </div>

            {/* CTA WhatsApp */}
            <div className="mt-8 bg-gradient-to-r from-green-500 to-emerald-600 rounded-3xl p-6 text-white text-center">
              <Leaf className="w-8 h-8 mx-auto mb-2 opacity-90" />
              <h3 className="font-black text-xl mb-1">Besoin de conseils personnalisés ?</h3>
              <p className="text-green-100 text-sm mb-4">Notre équipe vous guide vers les bons produits pour votre situation.</p>
              <a href={`https://wa.me/${VENDEUR_WHATSAPP}?text=${encodeURIComponent("Bonjour, j'ai besoin de conseils sur les produits BIEN-ÊTRE YUPI 🌿")}`}
                target="_blank" rel="noreferrer"
                className="inline-flex items-center gap-2 bg-white text-green-600 font-black px-6 py-3 rounded-2xl hover:bg-green-50 transition-colors shadow">
                <MessageCircle className="w-5 h-5" /> {VENDEUR_WHATSAPP_DISPLAY}
              </a>
            </div>
          </div>
        )}

      </div>
    </AppLayout>
  );
}
