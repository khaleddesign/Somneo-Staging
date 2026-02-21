# 🧠 CURSOR SYSTEM PROMPT — SomnoConnect
# À coller dans : Cursor > Settings > Rules for AI (ou .cursorrules à la racine du projet)
# Version : 1.0 — Basé sur le Cahier des Charges V3

---

## 🎯 CONTEXTE DU PROJET

Tu travailles sur **SomnoConnect**, un portail client SaaS B2B sécurisé pour la société **SOMNOVENTIS F.Z.E** (Émirats Arabes Unis). C'est une plateforme médicale qui permet à des cliniques et hôpitaux d'envoyer des études du sommeil (fichiers PSG/EDF) à des agents SOMNOVENTIS pour prélecture, et de recevoir les rapports.

Le développeur est **non-technicien** et travaille assisté par IA. La priorité absolue est : **code robuste, sécurisé, modulaire**. Pas de raccourcis. Pas de code spaghetti.

---

## 🛠️ STACK TECHNIQUE — RÈGLES ABSOLUES

| Composant | Technologie | Interdit |
|-----------|-------------|---------|
| Frontend | Next.js 14 App Router | Pages Router, Create React App |
| Backend | Supabase (BaaS) | Express custom, Firebase |
| Langage | TypeScript strict | JavaScript pur |
| Style | Tailwind CSS + shadcn/ui | CSS Modules, styled-components |
| Auth | Supabase Auth | NextAuth, Clerk |
| Storage | Supabase Storage (S3) | Cloudinary, local storage |
| Emails | Resend | SendGrid, Nodemailer |
| Déploiement | Vercel | Heroku, VPS |

**Tu n'as JAMAIS le droit de proposer une technologie hors de cette liste sans l'expliquer explicitement et demander confirmation.**

---

## 📁 STRUCTURE DES DOSSIERS — OBLIGATOIRE

Tout nouveau fichier doit respecter cette structure. Ne jamais créer de fichiers ailleurs.

```
somnoconnect/
├── app/
│   ├── api/
│   │   ├── auth/          # Invitation, signup, signin
│   │   ├── studies/       # Upload, statut, rapports
│   │   └── comments/      # Messagerie
│   ├── dashboard/
│   │   ├── client/        # Pages vue client
│   │   └── agent/         # Pages vue agent
│   ├── auth/
│   │   ├── login/
│   │   └── signup/        # Inscription via token d'invitation
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                # shadcn/ui uniquement
│   └── custom/            # Composants SomnoConnect réutilisables
├── lib/
│   ├── supabase/          # Client Supabase + fonctions DB
│   └── utils/             # Fonctions utilitaires pures
├── hooks/                 # Hooks React custom (logique métier)
├── services/              # Logique complexe (ex: upload multipart)
├── types/                 # Interfaces et types TypeScript
├── public/
└── styles/
```

---

## 🗄️ SCHÉMA BASE DE DONNÉES — RÉFÉRENCE

### Tables et champs exacts

```sql
-- Institutions (cliniques/hôpitaux)
institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  address TEXT,
  contact_info TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Profils utilisateurs (lié à auth.users)
profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  full_name TEXT,
  role TEXT CHECK (role IN ('admin', 'agent', 'client')) NOT NULL,
  institution_id UUID REFERENCES institutions(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Invitations
invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  token UUID DEFAULT gen_random_uuid() UNIQUE NOT NULL,
  role_invited TEXT DEFAULT 'client',
  created_by UUID REFERENCES profiles(id) NOT NULL,
  institution_id UUID REFERENCES institutions(id) NOT NULL,
  expires_at TIMESTAMPTZ,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
)

-- Études du sommeil
studies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id) NOT NULL,
  patient_reference TEXT NOT NULL,  -- ID anonymisé, jamais le vrai nom
  study_type TEXT CHECK (study_type IN ('PSG', 'PV')) NOT NULL,
  status TEXT CHECK (status IN ('en_attente', 'en_cours', 'termine', 'annule')) DEFAULT 'en_attente',
  priority TEXT CHECK (priority IN ('low', 'medium', 'high')) DEFAULT 'medium',
  assigned_agent_id UUID REFERENCES profiles(id),
  file_path TEXT,           -- Chemin dans Supabase Storage
  file_size_orig BIGINT,    -- Taille en bytes
  checksum TEXT,            -- Hash MD5 pour vérification intégrité
  report_path TEXT,         -- Chemin du rapport PDF dans Storage
  notes TEXT,               -- Notes du client à la soumission
  submitted_at TIMESTAMPTZ DEFAULT now(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
)

-- Historique des changements de statut
study_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES studies(id) NOT NULL,
  old_status TEXT,
  new_status TEXT NOT NULL,
  changed_by UUID REFERENCES profiles(id) NOT NULL,
  changed_at TIMESTAMPTZ DEFAULT now()
)

-- Commentaires / Messagerie par étude
comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  study_id UUID REFERENCES studies(id) NOT NULL,
  user_id UUID REFERENCES profiles(id) NOT NULL,
  message TEXT NOT NULL,
  attachment_path TEXT,     -- Pièce jointe optionnelle
  created_at TIMESTAMPTZ DEFAULT now()
)
```

---

## 🔐 POLITIQUES RLS — COPIER-COLLER EXACT

**Ces fonctions doivent exister avant toute politique RLS.**

```sql
-- Fonctions helper (créer EN PREMIER dans Supabase)
CREATE OR REPLACE FUNCTION is_agent()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('agent', 'admin')
  );
END; $$;

CREATE OR REPLACE FUNCTION is_admin()
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'
  );
END; $$;
```

```sql
-- RLS : profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON profiles FOR SELECT
  USING (auth.uid() = id OR is_agent());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE
  USING (auth.uid() = id);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT
  WITH CHECK (is_agent());

-- RLS : institutions
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "institutions_select" ON institutions FOR SELECT
  USING (
    auth.uid() IN (SELECT id FROM profiles WHERE institution_id = institutions.id)
    OR is_agent()
  );
CREATE POLICY "institutions_insert" ON institutions FOR INSERT
  WITH CHECK (is_agent());
CREATE POLICY "institutions_update" ON institutions FOR UPDATE
  USING (is_agent());

-- RLS : invitations
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "invitations_all" ON invitations
  USING (is_agent()) WITH CHECK (is_agent());

-- RLS : studies ← CORRECTION CRITIQUE PAR RAPPORT AU CDC V3
ALTER TABLE studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "studies_select" ON studies FOR SELECT
  USING (auth.uid() = client_id OR is_agent());
CREATE POLICY "studies_insert" ON studies FOR INSERT
  WITH CHECK (auth.uid() = client_id);
CREATE POLICY "studies_update" ON studies FOR UPDATE
  USING (is_agent());

-- RLS : study_history
ALTER TABLE study_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "history_select" ON study_history FOR SELECT
  USING (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = study_history.study_id)
    OR is_agent()
  );
CREATE POLICY "history_insert" ON study_history FOR INSERT
  WITH CHECK (is_agent());

-- RLS : comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "comments_select" ON comments FOR SELECT
  USING (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
    OR is_agent()
  );
CREATE POLICY "comments_insert" ON comments FOR INSERT
  WITH CHECK (
    auth.uid() IN (SELECT client_id FROM studies WHERE id = comments.study_id)
    OR is_agent()
  );
CREATE POLICY "comments_update" ON comments FOR UPDATE
  USING (auth.uid() = user_id OR is_agent());
```

---

## 📤 FLUX D'UPLOAD — RÈGLES TECHNIQUES

L'upload de fichiers PSG/EDF peut aller jusqu'à **2 Go**. Tu dois TOUJOURS utiliser l'upload multipart. Jamais un upload direct classique pour des fichiers > 100 Mo.

```
Flux obligatoire :
1. Client sélectionne le fichier
2. Frontend calcule le checksum MD5 (via Web Crypto API, pas de lib externe)
3. Frontend appelle POST /api/studies/init-upload → reçoit upload_id + signed URLs
4. Frontend envoie le fichier par morceaux de 5 Mo (Supabase TUS ou S3 multipart)
5. Barre de progression en temps réel (progress events)
6. Frontend stocke l'état dans localStorage (pour reprise si coupure)
7. Une fois terminé → POST /api/studies/complete-upload avec checksum
8. Serveur vérifie le checksum → si OK : enregistre en DB + notifie l'agent
9. Si checksum KO → marque l'upload comme échoué + notifie le client
```

**Hook dédié obligatoire :** `hooks/useMultipartUpload.ts` — toute la logique d'upload doit être dans ce hook, jamais dans un composant UI.

---

## 📧 FLUX DE NOTIFICATIONS EMAIL (Resend)

Les emails sont envoyés via **Supabase Edge Functions** (pas depuis le client).

```
Événement → Edge Function → Resend API

Événements déclencheurs :
- studies.status change → email au client
- comments INSERT → email au destinataire (client ou agent)
- invitations INSERT → email d'invitation au client
- studies INSERT → email à l'agent (nouvelle étude reçue)
```

**Variable d'environnement requise :** `RESEND_API_KEY`

---

## 🔑 FLUX D'AUTHENTIFICATION PAR INVITATION

```
1. Agent crée invitation → POST /api/auth/invite
   → Génère token UUID dans table invitations
   → Envoie email via Resend avec lien :
     https://portal.somnoventis.com/auth/signup?token=<UUID>

2. Client clique sur le lien → page /auth/signup
   → Vérifie que le token existe et n'est pas used_at
   → Client remplit : nom + mot de passe

3. Serveur (Edge Function) :
   → Crée auth.users via Supabase Admin Auth
   → Crée profiles avec role='client' et institution_id du token
   → Met à jour invitations SET used_at = now()

4. Client est redirigé vers /dashboard/client
```

**Règle absolue : pas d'auto-inscription. Toute inscription sans token valide est rejetée.**

---

## ⚙️ VARIABLES D'ENVIRONNEMENT

```bash
# .env.local (ne jamais committer ce fichier)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # Jamais exposé côté client
RESEND_API_KEY=re_...
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**Règle absolue : `SUPABASE_SERVICE_ROLE_KEY` n'apparaît JAMAIS dans du code côté client (`'use client'`). Uniquement dans les API Routes et Edge Functions.**

---

## 🚦 STATUTS DES ÉTUDES — TRANSITIONS AUTORISÉES

```
en_attente → en_cours      (par l'agent uniquement)
en_cours   → termine       (par l'agent uniquement, déclenche upload rapport)
en_cours   → annule        (par l'agent ou admin)
en_attente → annule        (par l'agent ou admin)
termine    → [immuable]    (aucun retour en arrière possible)
```

**Chaque transition doit créer une entrée dans `study_history`.**

---

## 📏 RÈGLES DE CODE — NON NÉGOCIABLES

### TypeScript
```typescript
// ✅ TOUJOURS typer les données Supabase
type Study = Database['public']['Tables']['studies']['Row']

// ✅ TOUJOURS gérer les erreurs Supabase
const { data, error } = await supabase.from('studies').select('*')
if (error) throw new Error(error.message)

// ❌ JAMAIS utiliser 'any'
const data: any = ...  // INTERDIT

// ❌ JAMAIS ignorer les erreurs
const { data } = await supabase...  // INTERDIT si error non géré
```

### Composants
```typescript
// ✅ Logique métier dans les hooks, pas dans les composants
// hooks/useStudies.ts → logique
// components/custom/StudyList.tsx → affichage uniquement

// ✅ Un composant = une responsabilité
// ❌ Pas de composants de plus de 150 lignes sans justification
```

### Sécurité
```typescript
// ✅ Toujours valider côté serveur (API Route ou Edge Function)
// ❌ Ne jamais faire confiance aux données venant du client
// ✅ Toujours utiliser les types stricts pour les enums (status, role, etc.)
```

---

## 📦 DÉPENDANCES AUTORISÉES

```json
{
  "dependencies": {
    "next": "14.x",
    "@supabase/supabase-js": "latest",
    "@supabase/ssr": "latest",
    "tailwindcss": "latest",
    "shadcn-ui": "latest",
    "resend": "latest",
    "zod": "latest"
  },
  "devDependencies": {
    "typescript": "latest",
    "@types/node": "latest",
    "@types/react": "latest"
  }
}
```

**Avant d'ajouter une dépendance non listée → demander confirmation.**

---

## 🔄 PÉRIMÈTRE MVP (Phase 1) — CE QUI EST IN/OUT

### ✅ IN (à coder maintenant)
- Auth par invitation (token)
- Login / Logout
- Upload multipart avec vérification checksum
- Liste des études (client et agent)
- Changement de statut par l'agent
- Upload rapport PDF par l'agent
- Téléchargement rapport par le client
- Notifications email basiques (statut changé, invitation)
- Fil de commentaires simple par étude

### ❌ OUT (ne pas coder, ne pas proposer)
- Dashboard statistiques avancé
- Multi-utilisateurs par institution
- Messagerie temps réel (WebSocket)
- Fonctionnalités de télémédecine
- Application mobile
- Internationalisation (i18n)
- Paiement en ligne

---

## 🧪 TESTS OBLIGATOIRES

Pour chaque fonction critique, demander à l'IA d'écrire un test :

```typescript
// Fonctions à tester obligatoirement :
// - Calcul du checksum MD5
// - Validation du token d'invitation
// - Transitions de statut (autorisées vs interdites)
// - RLS : un client ne peut pas voir les études d'un autre client
```

---

## 💬 COMMENT FORMULER LES DEMANDES À L'IA

### ❌ MAUVAISE formulation
> "Code la page d'upload de fichiers"

### ✅ BONNE formulation
> "Crée le hook `useMultipartUpload.ts` dans `/hooks/` qui gère uniquement la logique d'upload multipart vers Supabase Storage. Il doit exposer : `startUpload(file, studyId)`, `progress` (0-100), `status` ('idle'|'uploading'|'done'|'error'), et `resume()`. Pas d'UI dans ce hook."

**Règle d'or : décomposer toujours en 3 étapes : logique → composant → intégration.**

---

## ⚠️ ERREURS À NE JAMAIS RÉPÉTER

1. **Ne pas mettre la service_role_key côté client** → faille de sécurité critique
2. **Ne pas désactiver RLS** → tous les clients verront toutes les données
3. **Ne pas uploader les gros fichiers en une seule requête** → timeouts garantis
4. **Ne pas mettre la logique d'upload dans un composant UI** → impossible à tester/maintenir
5. **Ne pas commencer une nouvelle fonctionnalité sans que la précédente soit testée** → dette technique explosive
6. **Ne pas stocker de données patient identifiables** → violation RGPD
7. **Ne pas committer `.env.local`** → exposer les clés API

---

*Document de référence SomnoConnect v1.0 — SOMNOVENTIS F.Z.E*
*À garder ouvert dans chaque session de développement.*
