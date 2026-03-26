# Documentation Complète — SomnoConnect

## 1. VUE D'ENSEMBLE
**SomnoConnect** est une application B2B médicale spécialisée dans la gestion, le transfert sécurisé et l'analyse d'études du sommeil.
- **URL Production :** [https://app.somnoventis.com](https://app.somnoventis.com)
- **Repository GitHub :** [https://github.com/khaleddesign/Somneo](https://github.com/khaleddesign/Somneo)

Le système est structuré autour de **3 rôles** et permissions stricts :
- **Client** : Soumet des études (fichiers EDF/BDF/ZIP), renseigne les données patients et récupère les rapports d'analyse terminés.
- **Agent** : Accède aux études (assignées ou via le pool non assigné), télécharge les données brutes, édite et uploade le rapport d'analyse PDF final.
- **Admin** : Tour de contrôle. Gère les institutions, les utilisateurs (invitations, rôles, suspension), la tarification (pricing) et la génération des factures.

---

## 2. STACK TECHNIQUE
L'application repose sur une stack moderne axée sur les performances et la sécurité d'entreprise :
- **Framework** : Next.js 16.1.6 (App Router)
- **UI & Composants** : React 19, Tailwind CSS, shadcn/ui, Lucide Icons
- **Langage** : TypeScript
- **Backend as a Service (BaaS)** : Supabase (PostgreSQL, Auth JWT, Storage S3-compatible, Row Level Security)
- **Hébergement & CI/CD** : Vercel
- **Génération PDF** : `@react-pdf/renderer`
- **Uploads** : `tus-js-client` (upload de gros fichiers résilients et repris)

---

## 3. STRUCTURE DES DOSSIERS
Architecture métier basée sur l'App Router de Next.js. Voici les principaux fichiers et répertoires :

```text
app/
├── api/                  # Routes API backend (fonctions serverless)
├── auth/                 # Pages d'authentification (login, signup, reset, suspended)
├── dashboard/            # Espaces loggués
│   ├── admin/            # Vues super-admin (settings, factures, users, toutes études)
│   ├── agent/            # Vues technicien (études assignées, non assignées, rapports)
│   └── client/           # Vues client (portail de dépôt Batch, liste de ses études)
├── mentions-legales/     # Pages statiques
├── politique-.../        
├── support/              
├── error.tsx             # Gestion des erreurs globales
├── layout.tsx            # Layout racine (providers)
└── page.tsx              # Landing page marketing

components/
├── custom/               # Composants métiers (BatchEDFUpload, StudyList, AssignReportPopover...)
├── ui/                   # Composants génériques (shadcn/ui : button, dialog, form, etc.)
└── skeletons/            # États de chargement

lib/
├── supabase/             # Clients DB (client.ts, server.ts, admin.ts, middleware.ts)
├── cron/                 # Logique des tâches planifiées (cleanup-orphans)
├── pdf/                  # Templates React-PDF pour rapports et factures
├── utils/                # Utilitaires divers (tusUpload, retry, magicBytes)
└── validation.ts         # Schémas Zod partagés

hooks/
└── useBatchEDFUpload.ts  # Orchestration des uploads multiples côté client
```

---

## 4. BASE DE DONNÉES
Base de données PostgreSQL hébergée sur Supabase.

### Tables Principales
- `institutions` : Regroupe les clients et agents.
- `profiles` : Étend l'utilisateur Supabase Auth (rôle, nom, institution_id, etat_suspension).
- `invitations` : Gestion des invitations par email sécurisées par token.
- `studies` : Cœur du métier. Contient `patient_reference` (chiffré), `study_type`, `priority`, `status`, `file_path`, `client_id` et `assigned_agent_id`.
- `study_history` : Historique des changements de statut d'une étude.
- `comments` : Fil de discussion lié à une étude.
- `unassigned_reports` : Rapports uploadés en attente d'association à une étude.
- `report_templates` & `study_reports` : Gestion de la donnée textuelle médicale des rapports.
- `invoices` & `invoice_settings` : Modèle de facturation et configuration des prix.
- `audit_logs` : Trace de sécurité (immobile) sur toutes les actions de modification/suppression.
- `idempotency_keys` : Sécurisation API contre les doubles soumissions (factures, requêtes lourdes).
- `notifications` : Centre de messages in-app.

### Row Level Security (RLS)
Des RLS stricts isolent complètement les données des clients :
- Un **Client** ne peut lire/écrire que les études associées à son UUID.
- Un **Agent** ne peut interagir qu'avec les données de sa propre institution ou les études qui lui sont spécifiquement assignées.
- Les triggers SQL s'assurent que toute altération critique ou suppression déclenche une insertion *fire-and-forget* dans `audit_logs`.

---

## 5. API ROUTES
Le dossier `app/api` contient plus de 40 routes traitées comme des microservices.

**Agents & Clients**
- `GET/POST /api/agents` & `/api/clients` : Gestion des rôles sous une institution.
- `POST /api/invite` : Génération d'un lien d'invitation sécurisé.

**Authentification**
- `POST /api/auth/forgot-password`, `signup`, `logout`, `invite`, `trial`

**Études & Uploads (TUS)**
- `POST /api/upload/token` : Génère un token cryptographique de Signed Upload URL pour contourner dynamiquement le RLS de Storage.
- `POST /api/studies/batch-edf-item` : Ajoute l'enregistrement DB d'une étude une fois l'upload TUS validé complété.
- `POST /api/studies/batch-edf-notify` : Envoi des emails récapitulatifs à la fin d'un batch d'EDF.
- `GET  /api/studies/[id]/download` : Renvoie une URL pré-signée sécurisée du fichier brut. Renvoie 404 si manquant, log l'accès dans `audit_logs`.
- `GET/POST /api/studies/[id]/report` : Gestion du rapport PDF final.
- `GET  /api/studies/list` & `/api/studies/search` : Requêtes filtrées et paginées.
- `PATCH /api/studies/[id]/status`, `/api/studies/[id]/assign` : Mutations d'état métier.
- `PATCH /api/studies/reassign` : Réassignation en masse (admin).

**Rapports non-assignés & Data**
- `GET/POST /api/reports/unassigned` & `/api/reports/unassigned/[id]/assign` : File d'attente.
- `POST /api/reports/[id]/autodraft` & `/api/reports/[id]/generate` : Moteur de génération du brouillon et du PDF.

**Facturation & Admin**
- `GET/POST /api/invoices`, `/api/invoices/[id]/download`, `/api/invoices/settings`
- `GET /api/stats`, `/api/stats/agents` : Dahsboards.
- `GET /api/backup` : Export complet (admin).

**CRON jobs**
- `GET /api/cron/cleanup` : Purge des fichiers associés aux études âgées de plus de 72h terminées.
- `GET /api/cron/cleanup-orphans` : Purge les objets "fantômes" du Storage (sans record DB) après 24h.

---

## 6. AUTHENTIFICATION & SÉCURITÉ
- **Supabase Auth** : Sessions validées par JWT. Un `middleware.ts` Next.js inspecte chaque requête et route l'utilisateur vers la bonne zone (`/dashboard/client`, `/dashboard/agent`, etc.), ou le déconnecte s'il est suspendu.
- **Clients Supabase** :
  - `client.ts` : Fonctions appelées depuis le navigateur via la clé `ANON_KEY` (contraintes RLS normales).
  - `server.ts` : Accès aux cookies dans les Server Components ou API Handlers.
  - `admin.ts` : Utilise la `SERVICE_ROLE_KEY` pour contourner le RLS (à usage exclusif dans les actions serveurs très sécurisées et préalablement validées manuellement).
- **Chiffrement** : La colonne `patient_reference` est chiffrée en AES (`lib/encryption.ts`) dans la DB pour se conformer au RGPD / HDS / HIPAA.
- **Audit Logs** : Chaque suppression, téléchargement de données sensibles ou altération est tracée en base de données de façon non-bloquante.

---

## 7. STORAGE (FICHIERS)
L'application s'appuie sur le moteur Storage S3 de Supabase.

1. **`study-files`** : Bucket principal et sécurisé recevant les gros fichiers ZIP/EDF via le protocole TUS (uploads résilients).
2. **`reports-files`** : Reçoit les rapports PDF finaux uploadés par les agents ou crées par le moteur backend.
3. *`studies-files` & `report-files`* : Noms de buckets hérités (legacy / typographiques) présents dans certaines anciennes données.

**TUS & Signed Uploads** : Les uploads volumineux ne passent pas par une API classique (limitée à Vercel en RAM et Timeouts). Le client demande un Token crypté (`/api/upload/token`), puis envoie directement le fichier au bucket Supabase Chunk-par-Chunk en utilisant `tus-js-client`.

---

## 8. FLUX UTILISATEURS

### Flux Client
1. Connexion via `/auth/login`.
2. Le serveur l'identifie comme profil `client` et le redirige sur `/dashboard/client`.
3. Clic sur "Nouvelle Étude (Batch)".
4. Glisser-déposer de X fichiers EDF.
5. Saisie du `patient_reference` et `study_type` pour chacun.
6. Le navigateur fait l'upload Storage (TUS), puis informe la base de données. L'étude passe en `en_attente`.
7. Le client reçoit une notification lorsque le statut de l'étude devient `termine`, et peut télécharger son rapport PDF depuis son dashboard.

### Flux Agent
1. Connexion en tant qu'agent. Dashboard `agent/studies/`.
2. L'agent revendique les études `en_attente` (les assigne à lui-même). Le status passe à `en_cours`.
3. Téléchargement du fichier EDF via Signed URL (`/api/studies/[id]/download`).
4. Ouverture de l'EDF sur logiciel médical local.
5. Rédaction et/ou Uplaod du rapport PDF final via `/api/studies/[id]/report`.
6. L'étude passe en statut `termine`. Une notification est envoyée au client.
*(Cas d'usage "Batch Reports": un agent dépose dix PDF, le système parse le texte des PDF, extrait les références patient et lie automatiquement les PDF aux bonnes études en attente via `unassigned_reports`).*

### Flux Admin
1. Supervise `/dashboard/admin`. Peut tout voir, y compris changer le type d'abonnement / tarif (`/dashboard/admin/settings/pricing`).
2. À la fin du mois, sélectionne les études et génère une facture (Invoice PDF).

---

## 9. VARIABLES D'ENVIRONNEMENT
À définir obligatoirement dans `.env.local` pour le développement local et Dashboard Vercel pour la prod :

```env
NEXT_PUBLIC_APP_URL        # https://app.somnoventis.com
NEXT_PUBLIC_SUPABASE_URL   # URL d'API Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY 
SUPABASE_SERVICE_ROLE_KEY  # Ne DOIT PAS fuiter côté client 
ENCRYPTION_KEY             # Clé secrète 32 bytes AES
CRON_SECRET                # Secret API pour protéger /api/cron/*
NODE_ENV
RESEND_API_KEY             # Envoi d'emails (Resend)
UPSTASH_REDIS_REST_URL     # (optionnel) - Si rate limit est activé
UPSTASH_REDIS_REST_TOKEN
R2_ACCESS_KEY_ID           # (optionnel) - Bucket de Backup froid Cloudflare R2
R2_SECRET_ACCESS_KEY
R2_ACCOUNT_ID
R2_BUCKET_NAME
```

---

## 10. COMPOSANTS CLÉS (`components/custom/`)
- **`StudyList.tsx` / `StudyListWithFilters.tsx`** : Le tableau des études avec filtres de date, tags d'état, pagination et recherche.
- **`StudyActions.tsx`** : Groupe tous les boutons d'interaction métier (Assigner, Télécharger EDF, Uploader Rapport, Changer Statut, Archiver).
- **`BatchEDFUpload.tsx`** & `BatchEDFFileRow.tsx` : Dropzone TUS et orchestration de l'envoi asynchrone pour les clients.
- **`BatchReportUpload.tsx`** : Drag & Drop de PDFs de rapports pour l'agent, avec Parsing automatisé de regex.
- **`Sidebar.tsx` / `AdminSidebar.tsx`** : Navigation du Shell Dashboard.

---

## 11. BUGS CONNUS & SOLUTIONS RÉCENTES
Voici les défis récemment résolus et les enseignements à en tirer :

- **`audit_logs` bloquant le téléchargement** : Avant, l'insertion `audit_logs` n'avait pas de `try/catch`. Si le cache RPC de Supabase sautait (erreur PGRST204), ou si un trigger plantait, la route renvoyait une erreur `500` complète et empêchait de télécharger l'EDF. **Solution :** Mettre les logs de sécurité dans un bloc `try/catch` *strictement* enveloppé dans la route API pour ne pas bloquer un flux vital (`file_path` est plus critique que `audit`).
- **Nom des Buckets non-harmonisés** : Les uploads pointaient parfois vers `studies-files` au lieu de `study-files`. **Solution :** Harmonisation stricte définie par des variables exportées.
- **Cache Local TUS ("Upload instantané faux-positif")** : Si un usager uploade "test.zip", le supprime en base, et le ré-uploade, `tus-js-client` lisait son localStorage, voyait 100%, et envoyait `onSuccess` sans uploader vers le nouveau chemin serveur. L'étude était créée mais le fichier fantôme. **Solution :** Ajout de `objectPath` dans le hook personnalisé de `fingerprint` TUS et de la configuration `removeFingerprintOnSuccess: true` (`lib/utils/tusUpload.ts`).
- **PGRST204 Schema Cache** : Conséquence de modifications des tables SQL sur le Supabase live. Si cela réapparait, exécuter `NOTIFY pgrst, reload_schema;` en SQL.

---

## 12. COMMANDES UTILES (Cheat Sheet)

```bash
# Lancement Dev
npm install
npm run dev

# Exécuter les hooks de validation locaux (Build/Lint)
npm run build
npx tsc --noEmit
npx eslint "app/**/*.{ts,tsx}" --fix

# Outils de recherche rapide
grep -rn "console.log" --include="*.tsx" --include="*.ts" app/ components/
grep -rn "TODO\|FIXME" --include="*.tsx" --include="*.ts" app/ components/

# Formater le projet entier
npx prettier --write "app/**/*.{ts,tsx}" "components/**/*.{ts,tsx}" "lib/**/*.{ts,tsx}"
```

---

## 13. DÉPLOIEMENT
Le CI/CD est intégré à **Vercel** :
1. **Pousser sur la branche `main`** (`git push origin main`).
2. Vercel intercepte le webhook, lance `npm run build` (Next.js compilera et validera le TS de manière stricte).
3. En cas de succès, le build est promu en production sur `app.somnoventis.com` instantanément.
4. Les ajouts sur la Base de Données (tables) doivent être saisis dans le SQL Editor de l'interface d'administration Supabase *avant* (ou pendant) le push si la nouvelle version de code en dépend.
