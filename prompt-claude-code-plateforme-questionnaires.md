# Prompt Claude Code — Plateforme de questionnaires clients (collectif)

> Copie tout ce qui suit dans Claude Code, à la racine d'un dossier vide.

---

Tu vas créer une application Next.js complète : une plateforme interne de questionnaires d'onboarding client pour un collectif de 4 freelances (dev, design, SEO, social media). Les clients répondent via un lien public sans compte, et chaque collaborateur retrouve les réponses de ses propres sections.

## Stack imposée

- Next.js 15 (App Router) + TypeScript strict
- Tailwind CSS
- Prisma + PostgreSQL (NeonDB) — utilise `DATABASE_URL` depuis `.env`
- NextAuth v5 (Auth.js) avec provider Credentials (email + mot de passe hashé bcrypt) — seulement 4 utilisateurs internes, pas d'inscription publique
- Resend pour les emails transactionnels (`RESEND_API_KEY`)
- Zod pour la validation côté serveur
- Recharts pour les visualisations du dashboard

Crée un `.env.example` avec toutes les variables nécessaires.

## Schéma Prisma

Implémente exactement ce schéma (ajoute les timestamps `createdAt`/`updatedAt` partout) :

```prisma
model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  password  String
  specialty String?   // "dev" | "design" | "seo" | "social"
  sections  Section[]
}

model Client {
  id           String       @id @default(cuid())
  company      String
  contactName  String
  contactEmail String
  submissions  Submission[]
}

model Questionnaire {
  id          String       @id @default(cuid())
  title       String
  description String?
  isTemplate  Boolean      @default(true)
  sections    Section[]
  submissions Submission[]
}

model Section {
  id              String        @id @default(cuid())
  questionnaire   Questionnaire @relation(fields: [questionnaireId], references: [id], onDelete: Cascade)
  questionnaireId String
  owner           User          @relation(fields: [ownerId], references: [id])
  ownerId         String
  title           String
  description     String?
  order           Int
  questions       Question[]
}

enum QuestionType {
  TEXT
  TEXTAREA
  SELECT
  MULTISELECT
  SCALE
  YESNO
}

model Question {
  id        String       @id @default(cuid())
  section   Section      @relation(fields: [sectionId], references: [id], onDelete: Cascade)
  sectionId String
  label     String
  helpText  String?
  type      QuestionType
  options   Json?        // ["choix 1", "choix 2"] pour SELECT/MULTISELECT, { min, max, minLabel, maxLabel } pour SCALE
  required  Boolean      @default(false)
  order     Int
  answers   Answer[]
}

enum SubStatus {
  SENT
  IN_PROGRESS
  COMPLETED
}

model Submission {
  id              String        @id @default(cuid())
  client          Client        @relation(fields: [clientId], references: [id], onDelete: Cascade)
  clientId        String
  questionnaire   Questionnaire @relation(fields: [questionnaireId], references: [id])
  questionnaireId String
  token           String        @unique @default(cuid())
  status          SubStatus     @default(SENT)
  expiresAt       DateTime?
  completedAt     DateTime?
  answers         Answer[]
}

model Answer {
  id           String     @id @default(cuid())
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  submissionId String
  question     Question   @relation(fields: [questionId], references: [id], onDelete: Cascade)
  questionId   String
  value        Json

  @@unique([submissionId, questionId])
}
```

Crée un script `prisma/seed.ts` qui insère : les 4 utilisateurs (dev/design/seo/social, mot de passe par défaut "changeme" hashé), 1 client de démonstration, et 1 questionnaire "Onboarding client" avec 4 sections (une par spécialité) contenant chacune 3-4 questions réalistes de découverte client.

## Routes et écrans

### Public (sans auth)

- `GET /q/[token]` : formulaire de réponse client.
  - Multi-étapes : une étape par section (dans l'ordre `order`), barre de progression en haut, navigation Précédent/Suivant, écran récapitulatif avant validation finale.
  - **Sauvegarde automatique** : chaque réponse est persistée immédiatement via une server action (upsert sur `[submissionId, questionId]`). Le client peut fermer l'onglet et reprendre plus tard avec le même lien — pré-remplir les champs avec les réponses existantes.
  - Au premier accès, passer le statut de SENT à IN_PROGRESS. À la validation finale, passer à COMPLETED + `completedAt`, afficher un écran de remerciement, et envoyer un email Resend à l'owner de chaque section concernée.
  - Si `expiresAt` est dépassé ou le token inconnu : page d'erreur propre.
  - Mention RGPD en première étape : finalité (préparation du projet), destinataires (le collectif), durée de conservation, contact pour suppression. Case de consentement obligatoire avant de commencer.

### Interne (auth NextAuth, layout avec sidebar)

- `/login` : connexion.
- `/dashboard` : vue d'ensemble — submissions en attente / en cours / complétées, taux de complétion, dernières réponses reçues.
- `/questionnaires` : liste + création.
- `/questionnaires/[id]` : **builder** — gestion des sections (titre, owner assigné parmi les 4 users, réordonnancement par boutons monter/descendre, pas besoin de drag & drop en V1) et des questions de chaque section (label, type, options, required, ordre). Édition inline ou via panneaux, au choix, mais fluide.
- `/clients` : liste + création de clients.
- `/clients/[id]` : fiche client — ses submissions, bouton "Envoyer un questionnaire" (choisir un questionnaire template → crée la Submission → affiche le lien `/q/[token]` à copier + option d'envoi direct par email Resend au contact).
- `/submissions/[id]` : **vue par client** — toutes les réponses groupées par section, avec le nom de l'owner sur chaque section. Réponses TEXT/TEXTAREA en cartes, SELECT/YESNO en badges, SCALE en jauge. Bouton "Exporter en Markdown" (fichier téléchargé, structuré section par section — servira de base de cahier des charges).
- `/my-answers` : **vue par collaborateur** — pour l'utilisateur connecté, toutes les réponses des sections dont il est owner, groupées par client/submission, les plus récentes en premier. Filtre par statut.

## Règles d'accès

- Toutes les routes internes exigent une session. Middleware NextAuth.
- Les 4 utilisateurs voient tout (pas de cloisonnement strict) — le découpage par owner est un filtre de confort, pas une permission.
- La route publique `/q/[token]` ne expose jamais d'autre donnée que le questionnaire de la submission correspondante. Aucune liste de tokens, aucune énumération possible.
- Validation Zod sur toutes les server actions (notamment les `value` d'Answer selon le `type` de la question).

## UI

- Design sobre et propre, light par défaut avec support dark mode (classe Tailwind `dark`).
- Police : Inter ou DM Sans via `next/font`.
- Composants réutilisables : `QuestionField` (rend le bon input selon le type), `SectionCard`, `StatusBadge`, `ProgressBar`.
- Le formulaire public doit être impeccable sur mobile (les clients répondront souvent depuis leur téléphone).

## Ordre de travail

1. Init projet, Tailwind, Prisma, schéma, migration, seed.
2. NextAuth + login + middleware.
3. CRUD clients et questionnaires/sections/questions (builder).
4. Création de submission + génération du lien.
5. Formulaire public `/q/[token]` avec sauvegarde auto.
6. Vues dashboard, `/submissions/[id]`, `/my-answers`.
7. Emails Resend (envoi du lien + notification de complétion).
8. Export Markdown.

À chaque étape, vérifie que `npm run build` passe avant de continuer. Ne mocke rien : tout doit fonctionner avec la vraie base.
