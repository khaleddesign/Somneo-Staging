# SomnoConnect

Plateforme SaaS de gestion d'études du sommeil (soumission client, traitement agent, pilotage admin) développée avec Next.js et Supabase.

## Stack technique

- Next.js 16 (App Router) + React 19 + TypeScript
- Supabase (Auth, Postgres, Storage, Realtime, RLS)
- Tailwind CSS + composants shadcn/ui
- Resend pour l'envoi d'emails transactionnels
- Vitest pour les tests unitaires

## Setup local

1. Installer les dépendances :

```bash
npm install
```

2. Créer le fichier `.env.local` à la racine (voir variables ci-dessous).

3. Lancer l'application :

```bash
npm run dev
```

4. Ouvrir : http://localhost:3000

## Variables d'environnement requises

```bash
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Commandes utiles

```bash
# Développement
npm run dev

# Build production
npm run build

# Démarrage en mode production
npm run start

# Lint
npm run lint

# Tests
npm run test
```

## Modules principaux

- Authentification par invitation (`/auth/signup?token=...`)
- Dashboards dédiés : client, agent, admin
- Workflow pool/assignation/réassignation des études
- Messagerie d'étude + notifications email + notifications in-app Realtime
- Support client intégré (`/support`)
