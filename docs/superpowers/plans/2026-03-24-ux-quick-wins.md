# UX Quick Wins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply five UX quick wins to SomnoConnect: translate French text, fix back buttons, add aria-labels, remove unused Header wrapper indirection, and extract duplicated `formatFileSize` utility.

**Architecture:** Pure UI/text changes and minor refactors — no DB migrations, no API changes, no functional behavior modifications. Each task is fully independent and self-contained.

**Tech Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, shadcn/ui

---

## File Map

### QW1 — French → English translations
- Modify: `app/dashboard/agent/studies/[id]/page.tsx`
- Modify: `app/dashboard/client/page.tsx`
- Modify: `app/dashboard/client/studies/page.tsx`
- Modify: `app/dashboard/client/studies/[id]/page.tsx`
- Modify: `app/dashboard/client/studies/batch/page.tsx`
- Modify: `app/dashboard/agent/studies/batch-reports/page.tsx`
- Modify: `components/custom/StudySubmissionForm.tsx`
- Modify: `components/custom/FileUpload.tsx`
- Modify: `components/custom/BatchEDFUpload.tsx`
- Modify: `components/custom/StudyListWithFilters.tsx`
- Modify: `components/custom/StudyActions.tsx`
- Modify: `components/custom/StudyComments.tsx`
- Modify: `app/dashboard/admin/clients/page.tsx`
- Modify: `app/dashboard/admin/studies/page.tsx`
- Modify: `app/dashboard/agent/settings/page.tsx`

### QW2 — Fix back buttons
- Modify: `app/dashboard/client/studies/[id]/page.tsx` (line 51)
- Modify: `app/dashboard/agent/studies/[id]/page.tsx` (line 62)

### QW3 — Aria-labels on icon buttons
- Modify: `components/custom/AppLayout.tsx` (mobile menu button)
- Modify: `components/custom/StudyComments.tsx` (Send button)
- Modify: `components/custom/FileUpload.tsx` (drop zone, Browse button)
- Modify: `components/custom/BatchEDFUpload.tsx` (drop zone)

### QW4 — Header.tsx is NOT dead code (used via HeaderWrapper → AppLayout). Skip deletion; instead remove the unnecessary HeaderWrapper indirection layer.
- Modify: `components/custom/AppLayout.tsx` (import Header directly)
- Delete: `components/custom/HeaderWrapper.tsx`

### QW5 — Extract formatFileSize to shared utility
- Modify: `lib/utils.ts` (add formatFileSize export)
- Modify: `components/custom/BatchReportUpload.tsx`
- Modify: `components/custom/StudyFileDownloadCard.tsx`
- Modify: `components/custom/ReportMatchRow.tsx`
- Modify: `components/custom/FileUpload.tsx`
- Modify: `components/custom/BatchEDFFileRow.tsx`
- Modify: `components/custom/AssignReportPopover.tsx`
- Modify: `components/custom/AgentReportsPage.tsx`

---

## Task 1: QW1 — Translate all French strings to English

**Translation map:**
| French | English |
|--------|---------|
| `← Retour au dashboard` | `← Back to dashboard` |
| `Dossier Patient` | `Patient File` |
| `Informations` (tab/heading) | `Details` |
| `Discussion` (tab/heading) | `Discussion` |
| `Date de soumission` | `Submission date` |
| `Mon institution` | `My institution` |
| `Études` (page title) | `Studies` |
| `Mes études` (tab) | `My studies` |
| `Mon institution` (tab) | `My institution` |
| `Mes études soumises` (card title) | `My submitted studies` |
| `Toutes les études de mon institution` | `All studies from my institution` |
| `Retrouvez vos études et celles de votre institution.` | `View your studies and those from your institution.` |
| `Soumettre plusieurs études` | `Submit multiple studies` |
| `Uploadez jusqu'à 20 fichiers EDF en une seule session. Chaque fichier génère une étude indépendante.` | `Upload up to 20 EDF files in a single session. Each file creates an independent study.` |
| `Upload de rapports en masse` | `Bulk report upload` |
| `Uploadez plusieurs rapports PDF...` | `Upload multiple PDF reports. The system attempts to match each file automatically to a study using the patient reference in the filename.` |
| `Champ requis` | `Required field` |
| `Veuillez uploader un fichier` | `Please upload a file` |
| `Notes (optionnel)` | `Notes (optional)` |
| `Fichier EDF *` | `EDF file *` |
| `Création de l'étude...` | `Creating study...` |
| `Soumettre l'étude` | `Submit study` |
| `Basse` / `Moyenne` / `Haute` (priority) | `Low` / `Normal` / `High` |
| `Glissez votre fichier EDF ou ZIP ici` | `Drop your EDF or ZIP file here` |
| `Parcourir les fichiers` | `Browse files` |
| `Glissez vos fichiers EDF ici` | `Drop your EDF files here` |
| `Maximum X fichiers par batch.` | `Maximum X files per batch.` |
| `X fichier(s) ignoré(s)...` | `X file(s) skipped: invalid format or size > 500 MB.` |
| `Veuillez renseigner la référence...` | `Please fill in the patient reference and type for each study.` |
| `X étude(s) créée(s)` | `X study/studies created` |
| `Les fichiers en erreur peuvent être réessayés...` | `Failed files can be retried individually.` |
| `Valider et uploader (X fichier(s))` | `Start upload (X file(s))` |
| `Réessayer les erreurs (X)` | `Retry errors (X)` |
| `Toutes` (chip) | `All` |
| `En attente` (chip) | `Pending` |
| `En cours` (chip) | `In progress` |
| `Terminées` (chip) | `Completed` |
| `Annulées` (chip) | `Cancelled` |
| `Recherche patient` (label) | `Patient search` |
| `Rechercher par référence patient` (placeholder) | `Search by patient reference` |
| `Tous les statuts` | `All statuses` |
| `Toutes les priorités` | `All priorities` |
| `Réinitialiser filtres` | `Reset filters` |
| `X étude(s)` (count) | `X study/studies` |
| `Aucun résultat` / `Aucune étude` | `No results` / `No studies` |
| `Aucune étude trouvée pour «...»` | `No study found for "..."` |
| `Les études soumises apparaîtront ici.` | `Submitted studies will appear here.` |
| `Précédent` / `Suivant` (pagination) | `Previous` / `Next` |
| `Erreur de mise à jour` (toast) | `Update error` |
| `Erreur d'upload` (toast) | `Upload error` |
| `Réessayer` (toast action) | `Retry` |
| `📄 Voir le report PDF` | `View PDF report` |
| `Erreur réseau` (fallback) | `Network error` |
| `fr-FR` (time locale) | `en-GB` |
| `Utilisateur inconnu` (avatar fallback) | `Unknown user` |
| `Vous` (avatar fallback) | `You` |
| `Gestion des clients` | `Client management` |
| `Inviter un client` | `Invite client` |
| `Rechercher un client` | `Search client` |
| `Nom` (table header) | `Name` |
| `Suspendu` / `Actif` | `Suspended` / `Active` |
| `Modifier` (button) | `Edit` |
| `Aucun client` (empty) | `No clients` |
| `Email requis` | `Email required` |
| `Modifier le client` (dialog title) | `Edit client` |
| `Basse` / `Moyenne` / `Haute` (admin studies) | `Low` / `Average` / `High` |
| `Tous agents` | `All agents` |
| `Tous clients` | `All clients` |
| `Vue filtrable` | `Filtered view` |
| `Aucune study found` | `No studies found` |
| `Informations du compte` | `Account information` |
| `Nom` (label) | `Name` |
| `Changer le mot de passe` | `Change password` |
| `Mot de passe actuel` | `Current password` |
| `Rapport` (card title, client detail) | `Report` |
| `En attente de traitement par un agent.` | `Awaiting processing by an agent.` |
| `Taille du fichier` | `File size` |
| `Mo` (megabytes) | `MB` |
| `X études uploadées` (batch progress) | `X / Y studies uploaded` |
| `Inviter un client` (button) | `Invite client` |
| `Actions` (tab) | `Actions` |

- [ ] **Step 1: Translate agent study detail page**
  File: `app/dashboard/agent/studies/[id]/page.tsx`
  Changes:
  - L63: `← Retour au dashboard` → `← Back to dashboard`
  - L68: `Dossier Patient` → `Patient File`
  - L76: `<TabsTrigger value="informations">Informations</TabsTrigger>` → `<TabsTrigger value="informations">Details</TabsTrigger>`
  - L86: `Informations` (CardTitle) → `Details`
  - L113: `Date de soumission` → `Submission date`
  - L147: `Actions` (CardTitle with number) → `Actions` (already English, keep)

- [ ] **Step 2: Translate client dashboard page**
  File: `app/dashboard/client/page.tsx`
  - L94: `Mon institution` → `My institution`

- [ ] **Step 3: Translate client studies page**
  File: `app/dashboard/client/studies/page.tsx`
  - L18: `Études` → `Studies`
  - L21: `Retrouvez vos études...` → `View your studies and those from your institution.`
  - L28: `Mes études` (tab) → `My studies`
  - L35: `Mon institution` (tab) → `My institution`
  - L49: `Mes études soumises` → `My submitted studies`
  - L67: `Toutes les études de mon institution` → `All studies from my institution`

- [ ] **Step 4: Translate client study detail page**
  File: `app/dashboard/client/studies/[id]/page.tsx`
  - L51: `← Retour au dashboard` → `← Back to dashboard`
  - L57: `Dossier Patient` → `Patient File`
  - L67: `Informations` (CardTitle) → `Details`
  - L89: `Date de soumission` → `Submission date`
  - L94: `Taille du fichier` → `File size`
  - L95: `Mo` → `MB`
  - L109: `Rapport` (CardTitle) → `Report`
  - L115: `En attente de traitement par un agent.` → `Awaiting processing by an agent.`
  - L122: `Discussion` (CardTitle) → `Discussion` (already English, keep)

- [ ] **Step 5: Translate client batch page**
  File: `app/dashboard/client/studies/batch/page.tsx`
  - L9: `Soumettre plusieurs études` → `Submit multiple studies`
  - L11-12: French description → English

- [ ] **Step 6: Translate agent batch-reports page**
  File: `app/dashboard/agent/studies/batch-reports/page.tsx`
  - L9: `Upload de rapports en masse` → `Bulk report upload`
  - L11-12: French description → English

- [ ] **Step 7: Translate StudySubmissionForm**
  File: `components/custom/StudySubmissionForm.tsx`
  - L120: `Champ requis` → `Required field`
  - L140: `Champ requis` → `Required field`
  - L152: `Basse` → `Low`
  - L153: `Normale` → `Normal`
  - L154: `Haute` → `High`
  - L161: `Notes (optionnel)` → `Notes (optional)`
  - L175: `Fichier EDF *` → `EDF file *`
  - L178: `Veuillez uploader un fichier` → `Please upload a file`
  - L201: `Création de l'étude...` → `Creating study...`
  - L201: `Soumettre l'étude` → `Submit study`

- [ ] **Step 8: Translate FileUpload**
  File: `components/custom/FileUpload.tsx`
  - L99: `Glissez votre fichier EDF ou ZIP ici` → `Drop your EDF or ZIP file here`
  - L107: `Parcourir les fichiers` → `Browse files`
  - L133: `Calcul du checksum...` → `Computing checksum...`
  - L133: `Upload en cours...` → `Uploading...`

- [ ] **Step 9: Translate BatchEDFUpload**
  File: `components/custom/BatchEDFUpload.tsx`
  - L45: `Maximum X fichiers par batch.` → `Maximum X files per batch.`
  - L52: `X fichier(s) ignoré(s)...` → English
  - L73: `Veuillez renseigner...` → English
  - L97: `Glissez vos fichiers EDF ici` → `Drop your EDF files here`
  - L126: `X études uploadées` → `X / Y studies uploaded`
  - L162: `X étude(s) créée(s)` → English
  - L168: `Les fichiers en erreur...` → English
  - L183: `Valider et uploader (X fichier(s))` → `Start upload (X file(s))`
  - L194: `Réessayer les erreurs (X)` → `Retry errors (X)`

- [ ] **Step 10: Translate StudyListWithFilters**
  File: `components/custom/StudyListWithFilters.tsx`
  - L103: `Toutes` → `All`
  - L104: `En attente` → `Pending`
  - L105: `En cours` → `In progress`
  - L106: `Terminées` → `Completed`
  - L107: `Annulées` → `Cancelled`
  - L127: `Recherche patient` → `Patient search`
  - L136: `Rechercher par référence patient` → `Search by patient reference`
  - L153: `Tous les statuts` → `All statuses`
  - L172: `Toutes les priorités` → `All priorities`
  - L173: `Basse` → `Low`
  - L174: `Moyenne` → `Average`
  - L175: `Haute` → `High`
  - L192: `Réinitialiser filtres` → `Reset filters`
  - L200: `X étude(s)` count → `X study/studies`
  - L207: `Aucun résultat` → `No results`
  - L207: `Aucune étude` → `No studies`
  - L210: French description → English
  - L211: French description → English
  - L232: `Précédent` → `Previous`
  - L241: `Suivant` → `Next`

- [ ] **Step 11: Translate StudyActions**
  File: `components/custom/StudyActions.tsx`
  - L55: `Erreur de mise à jour` → `Update error`
  - L59: `Réessayer` → `Retry`
  - L168: `Erreur d'upload` → `Upload error`
  - L172: `Réessayer` → `Retry`
  - L232: `📄 Voir le report PDF` → `View PDF report`

- [ ] **Step 12: Translate StudyComments**
  File: `components/custom/StudyComments.tsx`
  - L40: `'Erreur réseau'` fallback → `'Network error'`
  - L52: `'fr-FR'` locale → `'en-GB'`
  - L79: `"Utilisateur inconnu"` → `"Unknown user"`
  - L95: `'Vous'` → `'You'`

- [ ] **Step 13: Translate admin clients page**
  File: `app/dashboard/admin/clients/page.tsx`
  - L57: `'Email requis'` → `'Email required'`
  - L122: `Gestion des clients` → `Client management`
  - L126: `Inviter un client` → `Invite client`
  - L135: `Rechercher un client` → `Search client`
  - L145: `Nom` (th) → `Name`
  - L164: `Suspendu` → `Suspended`
  - L164: `Actif` → `Active`
  - L170: `Modifier` → `Edit`
  - L181: `Aucun client` → `No clients`
  - L218: `Modifier le client` → `Edit client`

- [ ] **Step 14: Translate admin studies page**
  File: `app/dashboard/admin/studies/page.tsx`
  - L157: `Basse` → `Low`
  - L158: `Moyenne` → `Average`
  - L159: `Haute` → `High`
  - L166: `Tous agents` → `All agents`
  - L177: `Tous clients` → `All clients`
  - L188: `Vue filtrable` → `Filtered view`
  - L229: `Aucune study found` → `No studies found`

- [ ] **Step 15: Translate agent settings page**
  File: `app/dashboard/agent/settings/page.tsx`
  - L113: `Informations du compte` → `Account information`
  - L117: `Nom` → `Name`
  - L130: `Changer le mot de passe` → `Change password`
  - L135: `Mot de passe actuel` → `Current password`

- [ ] **Step 16: Commit**
  ```bash
  git add -p  # stage all changed files
  git commit -m "fix: translate all remaining French strings to English"
  ```

---

## Task 2: QW2 — Fix back button targets

**Problem:** Back buttons on detail pages navigate to `/dashboard/client` or `/dashboard/agent` instead of the studies list page.

- [ ] **Step 1: Fix client study detail back button**
  File: `app/dashboard/client/studies/[id]/page.tsx` L51
  Change: `href="/dashboard/client"` → `href="/dashboard/client/studies"`
  Change: text `← Back to dashboard` → `← Back to studies`

- [ ] **Step 2: Fix agent study detail back button**
  File: `app/dashboard/agent/studies/[id]/page.tsx` L62
  Change: `href="/dashboard/agent"` → `href="/dashboard/agent/studies"`
  Change: text `← Back to dashboard` → `← Back to studies`

- [ ] **Step 3: Commit**
  ```bash
  git commit -m "fix: back buttons navigate to studies list instead of dashboard"
  ```

---

## Task 3: QW3 — Add aria-labels to icon-only buttons

- [ ] **Step 1: AppLayout mobile menu button**
  File: `components/custom/AppLayout.tsx` L27
  Add `aria-label="Open menu"` to the `<button>` element

- [ ] **Step 2: StudyComments Send button**
  File: `components/custom/StudyComments.tsx` L113
  Add `aria-label="Send message"` to the `<Button>` element
  Add `aria-hidden="true"` to the `<Send>` icon

- [ ] **Step 3: FileUpload drop zone**
  File: `components/custom/FileUpload.tsx` L87
  Add `role="button"`, `tabIndex={0}`, `aria-label="File drop zone — click or drop a file"` to the drop zone `<div>`

- [ ] **Step 4: BatchEDFUpload drop zone**
  File: `components/custom/BatchEDFUpload.tsx` L85
  Add `role="button"`, `tabIndex={0}`, `aria-label="File drop zone — click or drop EDF files"` to the drop zone `<div>`

- [ ] **Step 5: Commit**
  ```bash
  git commit -m "fix(a11y): add aria-labels to icon buttons and drop zones"
  ```

---

## Task 4: QW4 — Remove HeaderWrapper indirection

**Note:** `Header.tsx` is actively used (AppLayout → HeaderWrapper → Header). The `HeaderWrapper` is a trivial pass-through with no logic. Remove it by importing `Header` directly in `AppLayout`.

- [ ] **Step 1: Update AppLayout to import Header directly**
  File: `components/custom/AppLayout.tsx`
  Replace `import HeaderWrapper from './HeaderWrapper'` with `import Header from './Header'`
  Replace `<HeaderWrapper />` with `<Header />`

- [ ] **Step 2: Delete HeaderWrapper.tsx**
  ```bash
  rm components/custom/HeaderWrapper.tsx
  ```

- [ ] **Step 3: Verify no other imports of HeaderWrapper exist**
  ```bash
  grep -r "HeaderWrapper" --include="*.tsx" --include="*.ts" .
  ```
  Expected: no output

- [ ] **Step 4: Commit**
  ```bash
  git commit -m "refactor: remove HeaderWrapper indirection, import Header directly"
  ```

---

## Task 5: QW5 — Extract formatFileSize to shared utility

**Problem:** `formatFileSize` is defined in 7 separate files with slightly different signatures.

- [ ] **Step 1: Add formatFileSize to lib/utils.ts**
  Add this export to `lib/utils.ts`:
  ```ts
  export function formatFileSize(bytes: number | null): string {
    if (!bytes || bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
  }
  ```

- [ ] **Step 2: Update all 7 files to import and use the shared function**
  For each file below, remove the local `formatFileSize` definition and add the import:
  ```ts
  import { formatFileSize } from '@/lib/utils'
  ```
  Files:
  - `components/custom/BatchReportUpload.tsx`
  - `components/custom/StudyFileDownloadCard.tsx`
  - `components/custom/ReportMatchRow.tsx`
  - `components/custom/FileUpload.tsx`
  - `components/custom/BatchEDFFileRow.tsx`
  - `components/custom/AssignReportPopover.tsx`
  - `components/custom/AgentReportsPage.tsx`

- [ ] **Step 3: Commit**
  ```bash
  git commit -m "refactor: extract formatFileSize to shared lib/utils"
  ```

---

## Final Step: Push to main

- [ ] **Push all commits**
  ```bash
  git push origin main
  ```
