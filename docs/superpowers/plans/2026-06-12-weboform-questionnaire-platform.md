# Weboform — Questionnaire Platform Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a full-stack Next.js 15 questionnaire platform for a 4-person freelance collective, with a public token-based multi-step form, internal admin dashboard, and Resend email notifications.

**Architecture:** Next.js 15 App Router with grouped route layouts — `(internal)` for auth-protected routes with sidebar, and `q/[token]` as a public route. All mutations go through Server Actions with Zod validation. Prisma manages PostgreSQL on NeonDB.

**Tech Stack:** Next.js 15, TypeScript strict, Tailwind CSS, Prisma + NeonDB, NextAuth v5 (Auth.js), Resend, Zod, Recharts, bcryptjs, Inter via next/font

---

## File Structure

```
weboform/
├── .env.example
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
├── prisma/
│   ├── schema.prisma
│   └── seed.ts
└── src/
    ├── auth.ts                         # NextAuth v5 config
    ├── middleware.ts                   # Route protection
    ├── lib/
    │   ├── db.ts                       # Prisma singleton
    │   ├── validations.ts              # Zod schemas
    │   ├── email.ts                    # Resend helpers
    │   └── export.ts                   # Markdown export
    ├── actions/
    │   ├── answers.ts                  # Upsert answers (auto-save)
    │   ├── submissions.ts              # Create, update status, complete
    │   ├── clients.ts                  # CRUD clients
    │   └── questionnaires.ts           # CRUD questionnaires/sections/questions
    ├── components/
    │   ├── ui/
    │   │   ├── StatusBadge.tsx
    │   │   ├── ProgressBar.tsx
    │   │   └── SectionCard.tsx
    │   ├── QuestionField.tsx
    │   ├── Sidebar.tsx
    │   └── QuestionnaireBuilder.tsx
    └── app/
        ├── layout.tsx                  # Root layout (fonts, dark mode class)
        ├── login/
        │   └── page.tsx
        ├── q/
        │   └── [token]/
        │       ├── page.tsx            # Server: load submission data
        │       └── FormClient.tsx      # Client: multi-step form
        └── (internal)/
            ├── layout.tsx              # Sidebar layout
            ├── dashboard/
            │   └── page.tsx
            ├── clients/
            │   ├── page.tsx
            │   └── [id]/
            │       └── page.tsx
            ├── questionnaires/
            │   ├── page.tsx
            │   └── [id]/
            │       └── page.tsx
            ├── submissions/
            │   └── [id]/
            │       └── page.tsx
            └── my-answers/
                └── page.tsx
```

---

## Task 1: Init Next.js 15 project

**Files:**
- Create: `package.json` (via CLI)
- Create: `next.config.ts`
- Create: `.env.example`

- [ ] **Step 1: Scaffold project**

Run in `c:\Users\Maxence\Desktop\SAAS\LOGICIELS\WEBOFORM`:
```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*" --no-turbopack
```
Answer prompts: Yes to all defaults.

- [ ] **Step 2: Install all dependencies**

```bash
npm install next-auth@beta @auth/prisma-adapter prisma @prisma/client bcryptjs resend zod recharts
npm install -D @types/bcryptjs tsx
```

- [ ] **Step 3: Write `.env.example`**

```env
DATABASE_URL="postgresql://user:password@host/dbname?sslmode=require"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_SECRET="generate-with-openssl-rand-base64-32"
RESEND_API_KEY="re_xxxxxxxxxxxx"
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

- [ ] **Step 4: Update `next.config.ts`**

```ts
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
```

- [ ] **Step 5: Update `tsconfig.json` to enable strict mode**

Verify `"strict": true` is present in `compilerOptions`. It should be there by default from create-next-app.

- [ ] **Step 6: Verify build passes**

```bash
npm run build
```
Expected: Build succeeds (no pages yet beyond default).

- [ ] **Step 7: Commit**

```bash
git init
git add .
git commit -m "feat: init Next.js 15 project with all dependencies"
```

---

## Task 2: Prisma schema + migration

**Files:**
- Create: `prisma/schema.prisma`

- [ ] **Step 1: Init Prisma**

```bash
npx prisma init
```

- [ ] **Step 2: Write `prisma/schema.prisma`**

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String    @id @default(cuid())
  name      String
  email     String    @unique
  password  String
  specialty String?
  sections  Section[]
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
}

model Client {
  id           String       @id @default(cuid())
  company      String
  contactName  String
  contactEmail String
  submissions  Submission[]
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt
}

model Questionnaire {
  id          String       @id @default(cuid())
  title       String
  description String?
  isTemplate  Boolean      @default(true)
  sections    Section[]
  submissions Submission[]
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
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
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
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
  options   Json?
  required  Boolean      @default(false)
  order     Int
  answers   Answer[]
  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt
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
  createdAt       DateTime      @default(now())
  updatedAt       DateTime      @updatedAt
}

model Answer {
  id           String     @id @default(cuid())
  submission   Submission @relation(fields: [submissionId], references: [id], onDelete: Cascade)
  submissionId String
  question     Question   @relation(fields: [questionId], references: [id], onDelete: Cascade)
  questionId   String
  value        Json
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([submissionId, questionId])
}
```

- [ ] **Step 3: Set DATABASE_URL in `.env.local`**

Create `.env.local` with your NeonDB connection string:
```
DATABASE_URL="postgresql://..."
AUTH_SECRET="run: openssl rand -base64 32"
RESEND_API_KEY="re_..."
NEXT_PUBLIC_BASE_URL="http://localhost:3000"
```

- [ ] **Step 4: Run migration**

```bash
npx prisma migrate dev --name init
```
Expected: Migration created and applied, Prisma Client generated.

- [ ] **Step 5: Verify build passes**

```bash
npm run build
```

- [ ] **Step 6: Commit**

```bash
git add prisma/ .env.example
git commit -m "feat: add Prisma schema with all models and initial migration"
```

---

## Task 3: Prisma seed

**Files:**
- Create: `prisma/seed.ts`
- Modify: `package.json` (add seed script)

- [ ] **Step 1: Write `prisma/seed.ts`**

```ts
import { PrismaClient, QuestionType } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const hash = await bcrypt.hash('changeme', 10)

  const [dev, design, seo, social] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'dev@collectif.fr' },
      update: {},
      create: { name: 'Alice Dev', email: 'dev@collectif.fr', password: hash, specialty: 'dev' },
    }),
    prisma.user.upsert({
      where: { email: 'design@collectif.fr' },
      update: {},
      create: { name: 'Bob Design', email: 'design@collectif.fr', password: hash, specialty: 'design' },
    }),
    prisma.user.upsert({
      where: { email: 'seo@collectif.fr' },
      update: {},
      create: { name: 'Clara SEO', email: 'seo@collectif.fr', password: hash, specialty: 'seo' },
    }),
    prisma.user.upsert({
      where: { email: 'social@collectif.fr' },
      update: {},
      create: { name: 'David Social', email: 'social@collectif.fr', password: hash, specialty: 'social' },
    }),
  ])

  const client = await prisma.client.upsert({
    where: { id: 'demo-client' },
    update: {},
    create: {
      id: 'demo-client',
      company: 'Acme SAS',
      contactName: 'Jean Dupont',
      contactEmail: 'jean@acme.fr',
    },
  })

  const questionnaire = await prisma.questionnaire.upsert({
    where: { id: 'demo-questionnaire' },
    update: {},
    create: {
      id: 'demo-questionnaire',
      title: 'Onboarding client',
      description: 'Questionnaire de découverte pour les nouveaux clients du collectif.',
      isTemplate: true,
      sections: {
        create: [
          {
            title: 'Développement web',
            description: 'Votre projet technique',
            order: 1,
            ownerId: dev.id,
            questions: {
              create: [
                { label: 'Avez-vous déjà un site existant ?', type: QuestionType.YESNO, required: true, order: 1 },
                { label: 'Quelle est la fonctionnalité principale de votre projet ?', type: QuestionType.TEXTAREA, required: true, order: 2 },
                { label: 'Quel est votre budget développement estimé ?', type: QuestionType.SELECT, required: false, order: 3, options: ['< 5 000 €', '5 000 – 15 000 €', '15 000 – 30 000 €', '> 30 000 €'] },
                { label: "Quelle est votre deadline souhaitée ?", type: QuestionType.TEXT, required: false, order: 4 },
              ],
            },
          },
          {
            title: 'Design & identité visuelle',
            description: 'Vos attentes graphiques',
            order: 2,
            ownerId: design.id,
            questions: {
              create: [
                { label: 'Avez-vous une charte graphique existante ?', type: QuestionType.YESNO, required: true, order: 1 },
                { label: 'Quels sites vous inspirent esthétiquement ?', type: QuestionType.TEXTAREA, required: false, order: 2 },
                { label: 'Quelles valeurs doit transmettre votre identité visuelle ?', type: QuestionType.MULTISELECT, required: false, order: 3, options: ['Moderne', 'Minimaliste', 'Chaleureux', 'Sérieux', 'Créatif', 'Luxe'] },
              ],
            },
          },
          {
            title: 'SEO & contenu',
            description: 'Votre présence en ligne',
            order: 3,
            ownerId: seo.id,
            questions: {
              create: [
                { label: 'Votre site est-il actuellement référencé sur Google ?', type: QuestionType.YESNO, required: true, order: 1 },
                { label: 'Quels mots-clés ciblez-vous ?', type: QuestionType.TEXTAREA, required: false, order: 2 },
                { label: 'Sur quelle échelle évaluez-vous votre contenu actuel ?', type: QuestionType.SCALE, required: false, order: 3, options: { min: 1, max: 5, minLabel: 'Inexistant', maxLabel: 'Excellent' } },
              ],
            },
          },
          {
            title: 'Réseaux sociaux',
            description: 'Votre stratégie social media',
            order: 4,
            ownerId: social.id,
            questions: {
              create: [
                { label: 'Sur quels réseaux êtes-vous présent ?', type: QuestionType.MULTISELECT, required: true, order: 1, options: ['Instagram', 'LinkedIn', 'Facebook', 'TikTok', 'X (Twitter)', 'YouTube'] },
                { label: 'Publiez-vous régulièrement du contenu ?', type: QuestionType.YESNO, required: true, order: 2 },
                { label: 'Quel est votre objectif principal sur les réseaux ?', type: QuestionType.SELECT, required: false, order: 3, options: ['Notoriété', 'Génération de leads', 'Fidélisation', 'Recrutement'] },
                { label: 'Décrivez votre audience cible', type: QuestionType.TEXTAREA, required: false, order: 4 },
              ],
            },
          },
        ],
      },
    },
  })

  console.log('Seed done:', { dev: dev.email, design: design.email, seo: seo.email, social: social.email, client: client.company, questionnaire: questionnaire.title })
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

- [ ] **Step 2: Add seed script to `package.json`**

Add to `package.json`:
```json
"prisma": {
  "seed": "tsx prisma/seed.ts"
}
```

- [ ] **Step 3: Run seed**

```bash
npx prisma db seed
```
Expected: "Seed done: { dev: 'dev@collectif.fr', ... }"

- [ ] **Step 4: Commit**

```bash
git add prisma/seed.ts package.json
git commit -m "feat: add Prisma seed with 4 users and demo questionnaire"
```

---

## Task 4: Prisma client singleton + Zod validations

**Files:**
- Create: `src/lib/db.ts`
- Create: `src/lib/validations.ts`

- [ ] **Step 1: Write `src/lib/db.ts`**

```ts
import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

export const db = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
```

- [ ] **Step 2: Write `src/lib/validations.ts`**

```ts
import { z } from 'zod'
import { QuestionType } from '@prisma/client'

export const answerValueSchema = (type: QuestionType) => {
  switch (type) {
    case 'TEXT':
      return z.string()
    case 'TEXTAREA':
      return z.string()
    case 'SELECT':
      return z.string()
    case 'MULTISELECT':
      return z.array(z.string())
    case 'SCALE':
      return z.number().int().min(1).max(10)
    case 'YESNO':
      return z.boolean()
    default:
      return z.unknown()
  }
}

export const saveAnswerSchema = z.object({
  submissionId: z.string().cuid(),
  questionId: z.string().cuid(),
  value: z.unknown(),
})

export const createClientSchema = z.object({
  company: z.string().min(1, 'Nom de société requis'),
  contactName: z.string().min(1, 'Nom du contact requis'),
  contactEmail: z.string().email('Email invalide'),
})

export const createQuestionnaireSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
})

export const createSectionSchema = z.object({
  questionnaireId: z.string().cuid(),
  ownerId: z.string().cuid(),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0),
})

export const createQuestionSchema = z.object({
  sectionId: z.string().cuid(),
  label: z.string().min(1),
  helpText: z.string().optional(),
  type: z.nativeEnum(QuestionType),
  options: z.unknown().optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
})

export const createSubmissionSchema = z.object({
  clientId: z.string().cuid(),
  questionnaireId: z.string().cuid(),
  expiresAt: z.string().datetime().optional(),
})

export const sendSubmissionEmailSchema = z.object({
  submissionId: z.string().cuid(),
})
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/lib/
git commit -m "feat: add Prisma singleton and Zod validation schemas"
```

---

## Task 5: NextAuth v5 + Login page + Middleware

**Files:**
- Create: `src/auth.ts`
- Create: `src/middleware.ts`
- Create: `src/app/login/page.tsx`
- Create: `src/app/api/auth/[...nextauth]/route.ts`
- Modify: `src/app/layout.tsx`

- [ ] **Step 1: Write `src/auth.ts`**

```ts
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { z } from 'zod'

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = z.object({
          email: z.string().email(),
          password: z.string().min(1),
        }).safeParse(credentials)
        if (!parsed.success) return null

        const user = await db.user.findUnique({ where: { email: parsed.data.email } })
        if (!user) return null
        const valid = await bcrypt.compare(parsed.data.password, user.password)
        if (!valid) return null

        return { id: user.id, name: user.name, email: user.email, specialty: user.specialty }
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.specialty = (user as { specialty?: string }).specialty
      }
      return token
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        ;(session.user as { specialty?: string }).specialty = token.specialty as string
      }
      return session
    },
  },
})
```

- [ ] **Step 2: Write `src/app/api/auth/[...nextauth]/route.ts`**

```ts
import { handlers } from '@/auth'

export const { GET, POST } = handlers
```

- [ ] **Step 3: Write `src/middleware.ts`**

```ts
import { auth } from '@/auth'
import { NextResponse } from 'next/server'

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const { pathname } = req.nextUrl

  const isPublicPath =
    pathname.startsWith('/q/') ||
    pathname === '/login' ||
    pathname.startsWith('/api/auth')

  if (!isPublicPath && !isLoggedIn) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  if (pathname === '/login' && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }
})

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
```

- [ ] **Step 4: Write `src/app/login/page.tsx`**

```tsx
'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou mot de passe incorrect')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950">
      <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 p-8">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Connexion</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Accès réservé au collectif</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Mot de passe
            </label>
            <input
              name="password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg transition-colors"
          >
            {loading ? 'Connexion…' : 'Se connecter'}
          </button>
        </form>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Update root `src/app/layout.tsx`**

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Weboform',
  description: 'Plateforme de questionnaires clients',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className="h-full">
      <body className={`${inter.className} h-full bg-gray-50 dark:bg-gray-950`}>
        {children}
      </body>
    </html>
  )
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```
Expected: Build passes. Login route and auth API route compile.

- [ ] **Step 7: Commit**

```bash
git add src/auth.ts src/middleware.ts src/app/login/ src/app/api/ src/app/layout.tsx
git commit -m "feat: add NextAuth v5 credentials auth, login page, and route middleware"
```

---

## Task 6: Sidebar + Internal layout + Base UI components

**Files:**
- Create: `src/components/Sidebar.tsx`
- Create: `src/app/(internal)/layout.tsx`
- Create: `src/components/ui/StatusBadge.tsx`
- Create: `src/components/ui/ProgressBar.tsx`

- [ ] **Step 1: Write `src/components/Sidebar.tsx`**

```tsx
'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/clients', label: 'Clients', icon: '◉' },
  { href: '/questionnaires', label: 'Questionnaires', icon: '◫' },
  { href: '/my-answers', label: 'Mes réponses', icon: '◌' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          Weboform
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span>⎋</span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
```

- [ ] **Step 2: Write `src/app/(internal)/layout.tsx`**

```tsx
import { auth } from '@/auth'
import { redirect } from 'next/navigation'
import { Sidebar } from '@/components/Sidebar'

export default async function InternalLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session) redirect('/login')

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
        <div className="max-w-5xl mx-auto px-6 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
```

- [ ] **Step 3: Write `src/components/ui/StatusBadge.tsx`**

```tsx
import { SubStatus } from '@prisma/client'

const config: Record<SubStatus, { label: string; className: string }> = {
  SENT: { label: 'Envoyé', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  IN_PROGRESS: { label: 'En cours', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  COMPLETED: { label: 'Complété', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
}

export function StatusBadge({ status }: { status: SubStatus }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
```

- [ ] **Step 4: Write `src/components/ui/ProgressBar.tsx`**

```tsx
export function ProgressBar({ value, max, label }: { value: number; max: number; label?: string }) {
  const pct = Math.round((value / max) * 100)
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
          <span>{label}</span>
          <span>{pct}%</span>
        </div>
      )}
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Create placeholder dashboard page so build passes**

Create `src/app/(internal)/dashboard/page.tsx`:
```tsx
export default function DashboardPage() {
  return <div className="text-gray-900 dark:text-gray-100"><h1 className="text-2xl font-semibold">Dashboard</h1></div>
}
```

- [ ] **Step 6: Verify build**

```bash
npm run build
```

- [ ] **Step 7: Commit**

```bash
git add src/components/ src/app/\(internal\)/
git commit -m "feat: add sidebar, internal layout, and base UI components"
```

---

## Task 7: Server Actions — clients + questionnaires

**Files:**
- Create: `src/actions/clients.ts`
- Create: `src/actions/questionnaires.ts`

- [ ] **Step 1: Write `src/actions/clients.ts`**

```ts
'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { createClientSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createClient(data: unknown) {
  await auth()
  const parsed = createClientSchema.parse(data)
  const client = await db.client.create({ data: parsed })
  revalidatePath('/clients')
  return client
}

export async function getClients() {
  await auth()
  return db.client.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getClient(id: string) {
  await auth()
  return db.client.findUnique({
    where: { id },
    include: {
      submissions: {
        include: { questionnaire: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}
```

- [ ] **Step 2: Write `src/actions/questionnaires.ts`**

```ts
'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import {
  createQuestionnaireSchema,
  createSectionSchema,
  createQuestionSchema,
} from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createQuestionnaire(data: unknown) {
  await auth()
  const parsed = createQuestionnaireSchema.parse(data)
  const q = await db.questionnaire.create({ data: parsed })
  revalidatePath('/questionnaires')
  return q
}

export async function getQuestionnaires() {
  await auth()
  return db.questionnaire.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getQuestionnaire(id: string) {
  await auth()
  return db.questionnaire.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          owner: { select: { id: true, name: true, specialty: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
    },
  })
}

export async function createSection(data: unknown) {
  await auth()
  const parsed = createSectionSchema.parse(data)
  const section = await db.section.create({ data: parsed })
  revalidatePath(`/questionnaires/${parsed.questionnaireId}`)
  return section
}

export async function updateSection(id: string, data: { title?: string; description?: string; ownerId?: string }) {
  await auth()
  const section = await db.section.update({ where: { id }, data })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return section
}

export async function moveSectionOrder(id: string, direction: 'up' | 'down') {
  await auth()
  const section = await db.section.findUniqueOrThrow({ where: { id } })
  const sibling = await db.section.findFirst({
    where: {
      questionnaireId: section.questionnaireId,
      order: direction === 'up' ? { lt: section.order } : { gt: section.order },
    },
    orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
  })
  if (!sibling) return

  await db.$transaction([
    db.section.update({ where: { id: section.id }, data: { order: sibling.order } }),
    db.section.update({ where: { id: sibling.id }, data: { order: section.order } }),
  ])
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
}

export async function deleteSection(id: string) {
  await auth()
  const section = await db.section.findUniqueOrThrow({ where: { id } })
  await db.section.delete({ where: { id } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
}

export async function createQuestion(data: unknown) {
  await auth()
  const parsed = createQuestionSchema.parse(data)
  const q = await db.question.create({ data: { ...parsed, options: parsed.options ?? undefined } })
  const section = await db.section.findUniqueOrThrow({ where: { id: parsed.sectionId } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return q
}

export async function updateQuestion(
  id: string,
  data: { label?: string; helpText?: string; type?: string; options?: unknown; required?: boolean; order?: number }
) {
  await auth()
  const q = await db.question.update({ where: { id }, data })
  const section = await db.section.findUniqueOrThrow({ where: { id: q.sectionId } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return q
}

export async function deleteQuestion(id: string) {
  await auth()
  const q = await db.question.findUniqueOrThrow({ where: { id }, include: { section: true } })
  await db.question.delete({ where: { id } })
  revalidatePath(`/questionnaires/${q.section.questionnaireId}`)
}

export async function getUsers() {
  await auth()
  return db.user.findMany({ select: { id: true, name: true, specialty: true } })
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/
git commit -m "feat: add server actions for clients and questionnaires"
```

---

## Task 8: Clients pages (list + create + detail)

**Files:**
- Create: `src/app/(internal)/clients/page.tsx`
- Create: `src/app/(internal)/clients/[id]/page.tsx`

- [ ] **Step 1: Write `src/app/(internal)/clients/page.tsx`**

```tsx
import { getClients } from '@/actions/clients'
import Link from 'next/link'
import { createClient } from '@/actions/clients'

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clients</h1>
        <form
          action={async (fd) => {
            'use server'
            await createClient({
              company: fd.get('company'),
              contactName: fd.get('contactName'),
              contactEmail: fd.get('contactEmail'),
            })
          }}
          className="flex gap-2"
        >
          <input name="company" placeholder="Société" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="contactName" placeholder="Contact" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="contactEmail" type="email" placeholder="Email" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Ajouter
          </button>
        </form>
      </div>

      {clients.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun client pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.company}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.contactName} · {c.contactEmail}</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/app/(internal)/clients/[id]/page.tsx`**

```tsx
import { getClient } from '@/actions/clients'
import { getQuestionnaires } from '@/actions/questionnaires'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { createSubmissionAction, sendSubmissionLinkEmail } from '@/actions/submissions'

export default async function ClientDetailPage({ params }: { params: { id: string } }) {
  const [client, questionnaires] = await Promise.all([
    getClient(params.id),
    getQuestionnaires(),
  ])
  if (!client) notFound()

  const templates = questionnaires.filter((q) => q.isTemplate)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{client.company}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {client.contactName} · {client.contactEmail}
        </p>
      </div>

      <div className="mb-8 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Envoyer un questionnaire</h2>
        <form action={async (fd) => {
          'use server'
          const sub = await createSubmissionAction({
            clientId: client.id,
            questionnaireId: fd.get('questionnaireId') as string,
          })
          if (fd.get('sendEmail') === 'on') {
            await sendSubmissionLinkEmail(sub.id)
          }
        }} className="flex flex-col gap-3">
          <select name="questionnaireId" required
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Choisir un questionnaire…</option>
            {templates.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
              <input type="checkbox" name="sendEmail" className="rounded" />
              Envoyer par email au client
            </label>
            <button type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Créer la submission
            </button>
          </div>
        </form>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Submissions</h2>
      {client.submissions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune submission.</p>
      ) : (
        <div className="space-y-2">
          {client.submissions.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.questionnaire.title}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Lien : {process.env.NEXT_PUBLIC_BASE_URL}/q/{s.token}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={s.status} />
                <Link href={`/submissions/${s.id}`}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Voir →</Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(internal\)/clients/
git commit -m "feat: add clients list, create, and detail pages"
```

---

## Task 9: Submissions server actions + email helpers skeleton

**Files:**
- Create: `src/actions/submissions.ts`
- Create: `src/lib/email.ts`

- [ ] **Step 1: Write `src/lib/email.ts`**

```ts
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function sendSubmissionLink(opts: {
  to: string
  clientName: string
  questTitle: string
  token: string
}) {
  const link = `${BASE_URL}/q/${opts.token}`
  await resend.emails.send({
    from: 'Collectif <noreply@weboform.fr>',
    to: opts.to,
    subject: `Votre questionnaire : ${opts.questTitle}`,
    html: `
      <p>Bonjour ${opts.clientName},</p>
      <p>Votre questionnaire "<strong>${opts.questTitle}</strong>" est prêt.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Remplir le questionnaire</a></p>
      <p>Ou copiez ce lien : ${link}</p>
    `,
  })
}

export async function sendCompletionNotification(opts: {
  to: string
  ownerName: string
  clientCompany: string
  sectionTitle: string
  submissionId: string
}) {
  const link = `${BASE_URL}/submissions/${opts.submissionId}`
  await resend.emails.send({
    from: 'Collectif <noreply@weboform.fr>',
    to: opts.to,
    subject: `${opts.clientCompany} a complété sa section : ${opts.sectionTitle}`,
    html: `
      <p>Bonjour ${opts.ownerName},</p>
      <p><strong>${opts.clientCompany}</strong> a complété la section "<strong>${opts.sectionTitle}</strong>".</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Voir les réponses</a></p>
    `,
  })
}
```

- [ ] **Step 2: Write `src/actions/submissions.ts`**

```ts
'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { createSubmissionSchema, saveAnswerSchema } from '@/lib/validations'
import { sendSubmissionLink, sendCompletionNotification } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { QuestionType } from '@prisma/client'

export async function createSubmissionAction(data: unknown) {
  await auth()
  const parsed = createSubmissionSchema.parse(data)
  const submission = await db.submission.create({
    data: {
      clientId: parsed.clientId,
      questionnaireId: parsed.questionnaireId,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
    },
  })
  revalidatePath(`/clients/${parsed.clientId}`)
  return submission
}

export async function sendSubmissionLinkEmail(submissionId: string) {
  await auth()
  const sub = await db.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      client: true,
      questionnaire: true,
    },
  })
  await sendSubmissionLink({
    to: sub.client.contactEmail,
    clientName: sub.client.contactName,
    questTitle: sub.questionnaire.title,
    token: sub.token,
  })
}

export async function upsertAnswer(data: unknown) {
  const parsed = saveAnswerSchema.parse(data)
  const question = await db.question.findUniqueOrThrow({ where: { id: parsed.questionId as string } })
  
  // Validate value by type
  let value = parsed.value
  if (question.type === QuestionType.SCALE && typeof value === 'string') {
    value = parseInt(value as string, 10)
  }

  await db.answer.upsert({
    where: {
      submissionId_questionId: {
        submissionId: parsed.submissionId as string,
        questionId: parsed.questionId as string,
      },
    },
    update: { value: value as never },
    create: {
      submissionId: parsed.submissionId as string,
      questionId: parsed.questionId as string,
      value: value as never,
    },
  })

  // Set IN_PROGRESS if still SENT
  await db.submission.updateMany({
    where: { id: parsed.submissionId as string, status: 'SENT' },
    data: { status: 'IN_PROGRESS' },
  })
}

export async function completeSubmission(submissionId: string) {
  const sub = await db.submission.update({
    where: { id: submissionId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: {
      client: true,
      questionnaire: {
        include: {
          sections: {
            include: {
              owner: true,
            },
          },
        },
      },
    },
  })

  // Notify each section owner
  for (const section of sub.questionnaire.sections) {
    try {
      await sendCompletionNotification({
        to: section.owner.email,
        ownerName: section.owner.name,
        clientCompany: sub.client.company,
        sectionTitle: section.title,
        submissionId: sub.id,
      })
    } catch (e) {
      console.error('Email send failed for', section.owner.email, e)
    }
  }
}

export async function getSubmission(id: string) {
  await auth()
  return db.submission.findUnique({
    where: { id },
    include: {
      client: true,
      questionnaire: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              owner: { select: { id: true, name: true, specialty: true } },
              questions: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      answers: true,
    },
  })
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/actions/submissions.ts src/lib/email.ts
git commit -m "feat: add submission actions and Resend email helpers"
```

---

## Task 10: QuestionField component

**Files:**
- Create: `src/components/QuestionField.tsx`

- [ ] **Step 1: Write `src/components/QuestionField.tsx`**

```tsx
'use client'
import { QuestionType } from '@prisma/client'

interface QuestionFieldProps {
  questionId: string
  label: string
  helpText?: string | null
  type: QuestionType
  options?: unknown
  required?: boolean
  value: unknown
  onChange: (value: unknown) => void
}

function inputClass(extra = '') {
  return `w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`
}

export function QuestionField({ questionId, label, helpText, type, options, required, value, onChange }: QuestionFieldProps) {
  const opts = Array.isArray(options) ? (options as string[]) : []
  const scaleOpts = !Array.isArray(options) && options ? (options as { min: number; max: number; minLabel?: string; maxLabel?: string }) : null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}

      {type === 'TEXT' && (
        <input
          id={questionId}
          type="text"
          required={required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass()}
        />
      )}

      {type === 'TEXTAREA' && (
        <textarea
          id={questionId}
          required={required}
          rows={4}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass('resize-none')}
        />
      )}

      {type === 'SELECT' && (
        <select
          id={questionId}
          required={required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass()}
        >
          <option value="">Choisir…</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {type === 'MULTISELECT' && (
        <div className="space-y-2">
          {opts.map((opt) => {
            const checked = Array.isArray(value) ? (value as string[]).includes(opt) : false
            return (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? (value as string[]) : []
                    onChange(e.target.checked ? [...current, opt] : current.filter((v) => v !== opt))
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {type === 'SCALE' && scaleOpts && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {Array.from({ length: scaleOpts.max - scaleOpts.min + 1 }, (_, i) => scaleOpts.min + i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  value === n
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                }`}
              >
                {n}
              </button>
            ))}
          </div>
          {(scaleOpts.minLabel || scaleOpts.maxLabel) && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>{scaleOpts.minLabel}</span>
              <span>{scaleOpts.maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {type === 'YESNO' && (
        <div className="flex gap-4">
          {[{ v: true, label: 'Oui' }, { v: false, label: 'Non' }].map(({ v, label: lbl }) => (
            <label key={lbl} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name={questionId}
                checked={value === v}
                onChange={() => onChange(v)}
                className="text-blue-600 focus:ring-blue-500"
              />
              {lbl}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/QuestionField.tsx
git commit -m "feat: add QuestionField component with all 6 question types"
```

---

## Task 11: Public form /q/[token]

**Files:**
- Create: `src/app/q/[token]/page.tsx`
- Create: `src/app/q/[token]/FormClient.tsx`

- [ ] **Step 1: Write `src/app/q/[token]/page.tsx`**

```tsx
import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FormClient } from './FormClient'

export default async function PublicFormPage({ params }: { params: { token: string } }) {
  const submission = await db.submission.findUnique({
    where: { token: params.token },
    include: {
      client: true,
      questionnaire: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              questions: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      answers: true,
    },
  })

  if (!submission) notFound()

  if (submission.expiresAt && submission.expiresAt < new Date()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md text-center">
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Lien expiré</h1>
          <p className="text-gray-500 dark:text-gray-400">Ce questionnaire n'est plus accessible. Contactez le collectif.</p>
        </div>
      </div>
    )
  }

  if (submission.status === 'COMPLETED') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">✓</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-2">Merci !</h1>
          <p className="text-gray-500 dark:text-gray-400">Vos réponses ont déjà été enregistrées.</p>
        </div>
      </div>
    )
  }

  const initialAnswers: Record<string, unknown> = {}
  for (const answer of submission.answers) {
    initialAnswers[answer.questionId] = answer.value
  }

  return (
    <FormClient
      submissionId={submission.id}
      questTitle={submission.questionnaire.title}
      clientName={submission.client.contactName}
      sections={submission.questionnaire.sections}
      initialAnswers={initialAnswers}
    />
  )
}
```

- [ ] **Step 2: Write `src/app/q/[token]/FormClient.tsx`**

```tsx
'use client'
import { useState, useCallback, useRef } from 'react'
import { QuestionField } from '@/components/QuestionField'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { upsertAnswer, completeSubmission } from '@/actions/answers'
import { QuestionType } from '@prisma/client'

interface Question {
  id: string
  label: string
  helpText: string | null
  type: QuestionType
  options: unknown
  required: boolean
  order: number
}

interface Section {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

interface FormClientProps {
  submissionId: string
  questTitle: string
  clientName: string
  sections: Section[]
  initialAnswers: Record<string, unknown>
}

export function FormClient({ submissionId, questTitle, clientName, sections, initialAnswers }: FormClientProps) {
  const [step, setStep] = useState(0) // 0 = RGPD, 1..N = sections, N+1 = recap, N+2 = done
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [consented, setConsented] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const totalSteps = sections.length + 2 // RGPD + sections + recap
  const isRgpdStep = step === 0
  const isDoneStep = step === totalSteps
  const isRecapStep = step === totalSteps - 1
  const currentSection = !isRgpdStep && !isRecapStep && !isDoneStep ? sections[step - 1] : null

  const handleChange = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    clearTimeout(saveTimers.current[questionId])
    saveTimers.current[questionId] = setTimeout(() => {
      upsertAnswer({ submissionId, questionId, value }).catch(console.error)
    }, 600)
  }, [submissionId])

  function canProceed() {
    if (isRgpdStep) return consented
    if (!currentSection) return true
    return currentSection.questions
      .filter((q) => q.required)
      .every((q) => {
        const v = answers[q.id]
        if (v === undefined || v === null || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        return true
      })
  }

  async function handleComplete() {
    setSubmitting(true)
    await completeSubmission(submissionId)
    setStep(totalSteps)
    setSubmitting(false)
  }

  if (isDoneStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Merci, {clientName} !</h1>
          <p className="text-gray-500 dark:text-gray-400">Vos réponses ont été enregistrées. Le collectif vous recontactera prochainement.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{questTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bonjour {clientName}</p>
        </div>

        {/* Progress */}
        {!isRgpdStep && (
          <div className="mb-6">
            <ProgressBar value={step} max={totalSteps - 1} label={`Étape ${step} sur ${totalSteps - 1}`} />
          </div>
        )}

        {/* RGPD step */}
        {isRgpdStep && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avant de commencer</h2>
            <div className="prose prose-sm dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 space-y-2">
              <p><strong>Finalité :</strong> Vos réponses servent à préparer votre projet avec le collectif.</p>
              <p><strong>Destinataires :</strong> Les membres du collectif impliqués dans votre projet uniquement.</p>
              <p><strong>Durée de conservation :</strong> 2 ans après la fin du projet.</p>
              <p><strong>Vos droits :</strong> Pour toute demande de modification ou de suppression, contactez-nous à <a href="mailto:contact@collectif.fr" className="text-blue-600 dark:text-blue-400">contact@collectif.fr</a>.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                J'ai lu et j'accepte que mes données soient utilisées dans ce cadre.
              </span>
            </label>
          </div>
        )}

        {/* Section step */}
        {currentSection && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{currentSection.description}</p>
            )}
            <div className="space-y-6">
              {currentSection.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  questionId={q.id}
                  label={q.label}
                  helpText={q.helpText}
                  type={q.type}
                  options={q.options}
                  required={q.required}
                  value={answers[q.id]}
                  onChange={(v) => handleChange(q.id, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recap step */}
        {isRecapStep && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Récapitulatif</h2>
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{section.title}</h3>
                  <div className="space-y-2">
                    {section.questions.map((q) => {
                      const v = answers[q.id]
                      const display = v === undefined ? <span className="italic text-gray-400">Sans réponse</span>
                        : Array.isArray(v) ? v.join(', ')
                        : typeof v === 'boolean' ? (v ? 'Oui' : 'Non')
                        : String(v)
                      return (
                        <div key={q.id} className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{q.label} : </span>
                          <span className="text-gray-900 dark:text-gray-100">{display}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            Précédent
          </button>

          {isRecapStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? 'Envoi…' : 'Valider et envoyer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/actions/answers.ts` (re-export from submissions for client use)**

```ts
'use server'
export { upsertAnswer, completeSubmission } from './submissions'
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/q/ src/actions/answers.ts
git commit -m "feat: add public multi-step form with RGPD consent and auto-save"
```

---

## Task 12: Questionnaire builder page

**Files:**
- Create: `src/app/(internal)/questionnaires/page.tsx`
- Create: `src/app/(internal)/questionnaires/[id]/page.tsx`
- Create: `src/components/QuestionnaireBuilder.tsx`

- [ ] **Step 1: Write `src/app/(internal)/questionnaires/page.tsx`**

```tsx
import { getQuestionnaires } from '@/actions/questionnaires'
import { createQuestionnaire } from '@/actions/questionnaires'
import Link from 'next/link'

export default async function QuestionnairesPage() {
  const questionnaires = await getQuestionnaires()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Questionnaires</h1>
        <form action={async (fd) => {
          'use server'
          await createQuestionnaire({ title: fd.get('title'), description: fd.get('description') || undefined })
        }} className="flex gap-2">
          <input name="title" placeholder="Titre du questionnaire" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Créer
          </button>
        </form>
      </div>

      {questionnaires.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun questionnaire.</p>
      ) : (
        <div className="space-y-2">
          {questionnaires.map((q) => (
            <Link key={q.id} href={`/questionnaires/${q.id}`}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{q.title}</p>
                {q.description && <p className="text-sm text-gray-500 dark:text-gray-400">{q.description}</p>}
              </div>
              <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {q.isTemplate ? 'Template' : 'Instance'}
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Write `src/components/QuestionnaireBuilder.tsx`**

```tsx
'use client'
import { useState } from 'react'
import {
  createSection, updateSection, deleteSection, moveSectionOrder,
  createQuestion, updateQuestion, deleteQuestion,
} from '@/actions/questionnaires'
import { QuestionType } from '@prisma/client'

interface Owner { id: string; name: string; specialty: string | null }
interface Question {
  id: string; label: string; helpText: string | null; type: QuestionType
  options: unknown; required: boolean; order: number
}
interface Section {
  id: string; title: string; description: string | null; order: number
  owner: Owner; questions: Question[]
}
interface Props {
  questionnaireId: string
  sections: Section[]
  users: Owner[]
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'TEXT', label: 'Texte court' },
  { value: 'TEXTAREA', label: 'Texte long' },
  { value: 'SELECT', label: 'Choix unique' },
  { value: 'MULTISELECT', label: 'Choix multiple' },
  { value: 'SCALE', label: 'Échelle' },
  { value: 'YESNO', label: 'Oui / Non' },
]

export function QuestionnaireBuilder({ questionnaireId, sections: initSections, users }: Props) {
  const [sections, setSections] = useState(initSections)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [addingQuestion, setAddingQuestion] = useState<string | null>(null)

  async function handleAddSection(fd: FormData) {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : 0
    await createSection({
      questionnaireId,
      ownerId: fd.get('ownerId') as string,
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      order: maxOrder + 1,
    })
    window.location.reload()
  }

  async function handleMoveSection(id: string, dir: 'up' | 'down') {
    await moveSectionOrder(id, dir)
    window.location.reload()
  }

  async function handleDeleteSection(id: string) {
    if (!confirm('Supprimer cette section et toutes ses questions ?')) return
    await deleteSection(id)
    window.location.reload()
  }

  async function handleAddQuestion(sectionId: string, fd: FormData) {
    const section = sections.find((s) => s.id === sectionId)!
    const maxOrder = section.questions.length > 0 ? Math.max(...section.questions.map((q) => q.order)) : 0
    const type = fd.get('type') as QuestionType
    let options: unknown = undefined
    if (type === 'SELECT' || type === 'MULTISELECT') {
      const raw = fd.get('options') as string
      options = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    }
    if (type === 'SCALE') {
      options = { min: 1, max: 5, minLabel: fd.get('minLabel') as string, maxLabel: fd.get('maxLabel') as string }
    }
    await createQuestion({
      sectionId,
      label: fd.get('label') as string,
      helpText: (fd.get('helpText') as string) || undefined,
      type,
      options,
      required: fd.get('required') === 'on',
      order: maxOrder + 1,
    })
    setAddingQuestion(null)
    window.location.reload()
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm('Supprimer cette question ?')) return
    await deleteQuestion(id)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {/* Sections */}
      {sections.map((section, idx) => (
        <div key={section.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleMoveSection(section.id, 'up')} disabled={idx === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
              <button onClick={() => handleMoveSection(section.id, 'down')} disabled={idx === sections.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
            </div>
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="flex-1 text-left"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{section.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {section.owner.name} · {section.questions.length} question(s)
              </p>
            </button>
            <button onClick={() => handleDeleteSection(section.id)}
              className="text-red-400 hover:text-red-600 text-sm px-2 py-1">✕</button>
          </div>

          {expandedSection === section.id && (
            <div className="p-4 space-y-3">
              {section.questions.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.label}</p>
                    <p className="text-xs text-gray-400">{q.type}{q.required ? ' · requis' : ''}</p>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
                </div>
              ))}

              {addingQuestion === section.id ? (
                <AddQuestionForm
                  onSubmit={(fd) => handleAddQuestion(section.id, fd)}
                  onCancel={() => setAddingQuestion(null)}
                />
              ) : (
                <button onClick={() => setAddingQuestion(section.id)}
                  className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                  + Ajouter une question
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add section */}
      <form action={handleAddSection} className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">+ Nouvelle section</p>
        <div className="grid grid-cols-2 gap-3">
          <input name="title" placeholder="Titre de la section" required
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select name="ownerId" required
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Assigner à…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <input name="description" placeholder="Description (optionnel)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          Ajouter la section
        </button>
      </form>
    </div>
  )
}

function AddQuestionForm({ onSubmit, onCancel }: { onSubmit: (fd: FormData) => void; onCancel: () => void }) {
  const [type, setType] = useState<QuestionType>('TEXT')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)) }}
      className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
    >
      <input name="label" placeholder="Intitulé de la question" required
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input name="helpText" placeholder="Texte d'aide (optionnel)"
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <select name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {(type === 'SELECT' || type === 'MULTISELECT') && (
        <textarea name="options" placeholder="Une option par ligne" rows={3} required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      )}
      {type === 'SCALE' && (
        <div className="grid grid-cols-2 gap-2">
          <input name="minLabel" placeholder="Label min (ex: Médiocre)"
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="maxLabel" placeholder="Label max (ex: Excellent)"
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input type="checkbox" name="required" className="rounded border-gray-300" />
          Requis
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Annuler
          </button>
          <button type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            Ajouter
          </button>
        </div>
      </div>
    </form>
  )
}
```

- [ ] **Step 3: Write `src/app/(internal)/questionnaires/[id]/page.tsx`**

```tsx
import { getQuestionnaire, getUsers } from '@/actions/questionnaires'
import { notFound } from 'next/navigation'
import { QuestionnaireBuilder } from '@/components/QuestionnaireBuilder'

export default async function QuestionnairePage({ params }: { params: { id: string } }) {
  const [questionnaire, users] = await Promise.all([
    getQuestionnaire(params.id),
    getUsers(),
  ])
  if (!questionnaire) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{questionnaire.title}</h1>
        {questionnaire.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{questionnaire.description}</p>
        )}
      </div>
      <QuestionnaireBuilder
        questionnaireId={questionnaire.id}
        sections={questionnaire.sections}
        users={users}
      />
    </div>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/questionnaires/ src/components/QuestionnaireBuilder.tsx
git commit -m "feat: add questionnaire list and full section/question builder"
```

---

## Task 13: Dashboard page with Recharts

**Files:**
- Modify: `src/app/(internal)/dashboard/page.tsx`

- [ ] **Step 1: Write `src/app/(internal)/dashboard/page.tsx`**

```tsx
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'

async function getDashboardData() {
  const [submissions, total] = await Promise.all([
    db.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { client: true, questionnaire: true },
    }),
    db.submission.count(),
  ])
  const sent = await db.submission.count({ where: { status: 'SENT' } })
  const inProgress = await db.submission.count({ where: { status: 'IN_PROGRESS' } })
  const completed = await db.submission.count({ where: { status: 'COMPLETED' } })
  return { submissions, total, sent, inProgress, completed }
}

export default async function DashboardPage() {
  await auth()
  const { submissions, total, sent, inProgress, completed } = await getDashboardData()
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const chartData = [
    { name: 'Envoyé', value: sent, fill: '#f59e0b' },
    { name: 'En cours', value: inProgress, fill: '#3b82f6' },
    { name: 'Complété', value: completed, fill: '#10b981' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: total, color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Envoyés', value: sent, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'En cours', value: inProgress, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Complétés', value: completed, color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-8">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Taux de complétion : {completionRate}%
        </p>
        <DashboardCharts data={chartData} />
      </div>

      {/* Recent */}
      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Dernières activités</h2>
      <div className="space-y-2">
        {submissions.map((s) => (
          <Link key={s.id} href={`/submissions/${s.id}`}
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {s.client.company} — {s.questionnaire.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <StatusBadge status={s.status} />
          </Link>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `src/app/(internal)/dashboard/DashboardCharts.tsx`**

```tsx
'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface Props {
  data: { name: string; value: number; fill: string }[]
}

export function DashboardCharts({ data }: Props) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
        <XAxis dataKey="name" tick={{ fontSize: 12 }} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
        <Tooltip />
        <Bar dataKey="value" radius={[6, 6, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={index} fill={entry.fill} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
```

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(internal\)/dashboard/
git commit -m "feat: add dashboard with Recharts stats and recent submissions"
```

---

## Task 14: Submission detail + Markdown export

**Files:**
- Create: `src/app/(internal)/submissions/[id]/page.tsx`
- Create: `src/lib/export.ts`

- [ ] **Step 1: Write `src/lib/export.ts`**

```ts
import { QuestionType } from '@prisma/client'

interface Question { label: string; type: QuestionType }
interface Section { title: string; owner: { name: string }; questions: Question[] }
interface Answer { questionId: string; value: unknown }

export function submissionToMarkdown(opts: {
  clientCompany: string
  questTitle: string
  completedAt: Date | null
  sections: Section[]
  answersMap: Record<string, unknown>
}) {
  const { clientCompany, questTitle, completedAt, sections, answersMap } = opts
  const date = completedAt ? new Date(completedAt).toLocaleDateString('fr-FR') : 'En cours'

  let md = `# ${questTitle} — ${clientCompany}\n\n`
  md += `**Date :** ${date}\n\n---\n\n`

  for (const section of sections) {
    md += `## ${section.title}\n`
    md += `*Responsable : ${section.owner.name}*\n\n`
    for (const q of section.questions) {
      const v = answersMap[q.label]
      let display = '*(sans réponse)*'
      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) display = v.join(', ')
        else if (typeof v === 'boolean') display = v ? 'Oui' : 'Non'
        else display = String(v)
      }
      md += `**${q.label}**\n${display}\n\n`
    }
    md += '---\n\n'
  }

  return md
}
```

- [ ] **Step 2: Write `src/app/(internal)/submissions/[id]/page.tsx`**

```tsx
import { getSubmission } from '@/actions/submissions'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { ExportButton } from './ExportButton'
import { submissionToMarkdown } from '@/lib/export'

export default async function SubmissionDetailPage({ params }: { params: { id: string } }) {
  const submission = await getSubmission(params.id)
  if (!submission) notFound()

  const answersMap: Record<string, unknown> = {}
  for (const answer of submission.answers) {
    answersMap[answer.questionId] = answer.value
  }

  const markdown = submissionToMarkdown({
    clientCompany: submission.client.company,
    questTitle: submission.questionnaire.title,
    completedAt: submission.completedAt,
    sections: submission.questionnaire.sections.map((s) => ({
      title: s.title,
      owner: s.owner,
      questions: s.questions,
    })),
    answersMap: Object.fromEntries(
      submission.questionnaire.sections.flatMap((s) =>
        s.questions.map((q) => [q.label, answersMap[q.id]])
      )
    ),
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/clients/${submission.clientId}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 block">
            ← {submission.client.company}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {submission.questionnaire.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={submission.status} />
          <ExportButton
            filename={`${submission.client.company}-${submission.questionnaire.title}.md`}
            content={markdown}
          />
        </div>
      </div>

      <div className="space-y-6">
        {submission.questionnaire.sections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{section.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{section.owner.name}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {section.questions.map((q) => {
                const value = answersMap[q.id]
                return (
                  <div key={q.id}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{q.label}</p>
                    {value === undefined || value === null ? (
                      <p className="text-sm italic text-gray-400">Sans réponse</p>
                    ) : (q.type === 'TEXT' || q.type === 'TEXTAREA') ? (
                      <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">{String(value)}</p>
                    ) : (q.type === 'SELECT' || q.type === 'YESNO') ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {q.type === 'YESNO' ? (value ? 'Oui' : 'Non') : String(value)}
                      </span>
                    ) : q.type === 'MULTISELECT' ? (
                      <div className="flex flex-wrap gap-2">
                        {(value as string[]).map((v) => (
                          <span key={v} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{v}</span>
                        ))}
                      </div>
                    ) : q.type === 'SCALE' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(value) / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{String(value)}/5</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create `src/app/(internal)/submissions/[id]/ExportButton.tsx`**

```tsx
'use client'

export function ExportButton({ filename, content }: { filename: string; content: string }) {
  function handleExport() {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={handleExport}
      className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
    >
      Exporter Markdown
    </button>
  )
}
```

- [ ] **Step 4: Verify build**

```bash
npm run build
```

- [ ] **Step 5: Commit**

```bash
git add src/app/\(internal\)/submissions/ src/lib/export.ts
git commit -m "feat: add submission detail view with per-type rendering and Markdown export"
```

---

## Task 15: My answers page

**Files:**
- Create: `src/app/(internal)/my-answers/page.tsx`

- [ ] **Step 1: Write `src/app/(internal)/my-answers/page.tsx`**

```tsx
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { SubStatus } from '@prisma/client'

export default async function MyAnswersPage({
  searchParams,
}: {
  searchParams: { status?: string }
}) {
  const session = await auth()
  if (!session?.user?.id) return null

  const statusFilter = searchParams.status as SubStatus | undefined
  const validStatuses: SubStatus[] = ['SENT', 'IN_PROGRESS', 'COMPLETED']
  const where = statusFilter && validStatuses.includes(statusFilter)
    ? { status: statusFilter }
    : {}

  const sections = await db.section.findMany({
    where: { ownerId: session.user.id },
    include: {
      questionnaire: true,
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            include: {
              submission: {
                include: { client: true },
              },
            },
            where: { submission: { ...where } },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const submissionsWithAnswers = new Map<string, {
    submissionId: string
    clientCompany: string
    status: SubStatus
    questionnaireTitle: string
    answers: Array<{ questionLabel: string; value: unknown }>
  }>()

  for (const section of sections) {
    for (const question of section.questions) {
      for (const answer of question.answers) {
        const sub = answer.submission
        if (!submissionsWithAnswers.has(sub.id)) {
          submissionsWithAnswers.set(sub.id, {
            submissionId: sub.id,
            clientCompany: sub.client.company,
            status: sub.status,
            questionnaireTitle: section.questionnaire.title,
            answers: [],
          })
        }
        submissionsWithAnswers.get(sub.id)!.answers.push({
          questionLabel: question.label,
          value: answer.value,
        })
      }
    }
  }

  const items = Array.from(submissionsWithAnswers.values())

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Mes réponses</h1>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {[
          { value: '', label: 'Tout' },
          { value: 'SENT', label: 'Envoyé' },
          { value: 'IN_PROGRESS', label: 'En cours' },
          { value: 'COMPLETED', label: 'Complété' },
        ].map(({ value, label }) => (
          <Link
            key={value}
            href={value ? `/my-answers?status=${value}` : '/my-answers'}
            className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
              (statusFilter ?? '') === value
                ? 'bg-blue-600 border-blue-600 text-white'
                : 'bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucune réponse pour vos sections.</p>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <div key={item.submissionId} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                <div>
                  <p className="font-medium text-gray-900 dark:text-gray-100">{item.clientCompany}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{item.questionnaireTitle}</p>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={item.status} />
                  <Link href={`/submissions/${item.submissionId}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">
                    Voir tout →
                  </Link>
                </div>
              </div>
              <div className="p-5 space-y-2">
                {item.answers.map((a, i) => (
                  <div key={i} className="text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{a.questionLabel} : </span>
                    <span className="text-gray-900 dark:text-gray-100">
                      {Array.isArray(a.value) ? (a.value as string[]).join(', ')
                        : typeof a.value === 'boolean' ? (a.value ? 'Oui' : 'Non')
                        : String(a.value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/app/\(internal\)/my-answers/
git commit -m "feat: add my-answers page with per-owner section filtering"
```

---

## Task 16: Final build verification + SectionCard component

**Files:**
- Create: `src/components/ui/SectionCard.tsx`

- [ ] **Step 1: Write `src/components/ui/SectionCard.tsx`**

```tsx
interface SectionCardProps {
  title: string
  ownerName: string
  questionCount: number
  children?: React.ReactNode
}

export function SectionCard({ title, ownerName, questionCount, children }: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <span className="text-xs text-gray-400">{questionCount} question(s)</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Responsable : {ownerName}</p>
      </div>
      {children && <div className="p-5">{children}</div>}
    </div>
  )
}
```

- [ ] **Step 2: Final full build**

```bash
npm run build
```
Expected: No TypeScript errors. All pages compile. Exit 0.

- [ ] **Step 3: Test seed + dev server locally**

```bash
npx prisma db seed
npm run dev
```

Navigate to:
- `http://localhost:3000/login` → login as dev@collectif.fr / changeme
- `http://localhost:3000/dashboard` → verify dashboard loads
- `http://localhost:3000/clients` → verify demo client appears
- `http://localhost:3000/questionnaires` → verify demo questionnaire appears
- Create a submission from client detail page, copy link
- Open link in incognito → verify RGPD + multi-step form

- [ ] **Step 4: Commit**

```bash
git add src/components/ui/SectionCard.tsx
git commit -m "feat: complete weboform questionnaire platform - all features implemented"
```

---

## Self-review: Spec coverage check

| Requirement | Task |
|---|---|
| Next.js 15 + TypeScript + Tailwind | Task 1 |
| Prisma + PostgreSQL (NeonDB) | Task 2 |
| NextAuth v5 Credentials + bcrypt | Task 5 |
| Resend emails | Task 9 |
| Zod validation | Task 4 |
| Recharts dashboard | Task 13 |
| `.env.example` | Task 1 |
| Prisma seed (4 users + demo data) | Task 3 |
| `/q/[token]` multi-step form | Task 11 |
| Auto-save (upsert on each answer) | Task 11 |
| RGPD consent first step | Task 11 |
| Expired token error page | Task 11 |
| SENT → IN_PROGRESS → COMPLETED | Task 9 |
| Email on completion to section owners | Task 9 |
| `/login` page | Task 5 |
| Middleware protection | Task 5 |
| `/dashboard` with stats | Task 13 |
| `/questionnaires` list + create | Task 12 |
| `/questionnaires/[id]` builder | Task 12 |
| Section reorder (up/down) | Task 12 |
| `/clients` list + create | Task 8 |
| `/clients/[id]` + send questionnaire | Task 8 |
| `/submissions/[id]` grouped by section | Task 14 |
| Export Markdown | Task 14 |
| `/my-answers` with status filter | Task 15 |
| `QuestionField` all 6 types | Task 10 |
| `StatusBadge`, `ProgressBar`, `SectionCard` | Task 6 |
| Mobile-first public form | Task 11 |
| Dark mode support | All tasks |
| Inter font via next/font | Task 5 |
| `npm run build` check at each step | Every task |
