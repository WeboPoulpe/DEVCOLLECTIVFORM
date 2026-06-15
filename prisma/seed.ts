import 'dotenv/config'
import { PrismaClient, QuestionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import bcrypt from 'bcryptjs'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const hash = await bcrypt.hash('changeme', 10)

  const [dev, design, seo, social] = await Promise.all([
    prisma.user.upsert({
      where: { email: 'dev@collectif.fr' },
      update: { name: 'Max' },
      create: { name: 'Max', email: 'dev@collectif.fr', password: hash, specialty: 'dev' },
    }),
    prisma.user.upsert({
      where: { email: 'design@collectif.fr' },
      update: { name: 'Julien' },
      create: { name: 'Julien', email: 'design@collectif.fr', password: hash, specialty: 'graphisme' },
    }),
    prisma.user.upsert({
      where: { email: 'seo@collectif.fr' },
      update: { name: 'Lauriane' },
      create: { name: 'Lauriane', email: 'seo@collectif.fr', password: hash, specialty: 'seo' },
    }),
    prisma.user.upsert({
      where: { email: 'social@collectif.fr' },
      update: { name: 'Lorène' },
      create: { name: 'Lorène', email: 'social@collectif.fr', password: hash, specialty: 'marketing' },
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
                { label: 'Type de projet', type: QuestionType.SELECT, required: true, order: 1, options: ['Site vitrine', 'E-commerce', 'Autre'] },
                { label: 'Le besoin en une phrase', type: QuestionType.TEXTAREA, required: true, order: 2 },
                { label: 'Site / outil existant ?', type: QuestionType.SELECT, required: true, order: 3, options: ['Non', 'WordPress', 'Wix / autre', 'Autre'] },
                { label: 'Fonctionnalités clés', type: QuestionType.MULTISELECT, required: false, order: 4, options: ['Contact', 'Prise de RDV', 'Paiement', 'Catalogue', 'Comptes / rôles', 'Espace client', 'Back-office', 'Notifications', 'Devis / Factures', 'Appli / SaaS', 'Logiciel métier', 'Sur-mesure', 'Refonte', 'Ne sait pas', 'Autre'] },
                { label: 'Intégrations / outils à connecter', type: QuestionType.MULTISELECT, required: false, order: 5, options: ['Stripe', 'Compta', 'Mailing', 'CRM', 'Agenda Google', 'Autre outil', 'Aucune'] },
                { label: 'Données à reprendre ?', type: QuestionType.SELECT, required: false, order: 6, options: ['Non', 'Oui — Excel / CSV', 'Oui — autre outil'] },
                { label: 'Budget évoqué ?', type: QuestionType.YESNO, required: false, order: 7 },
                { label: 'Délai', type: QuestionType.SELECT, required: false, order: 8, options: ['Pas pressé', '1 à 3 mois', 'Urgent', 'Fourchette donnée', 'Aucune'] },
                { label: 'Référent technique + prochaine étape', type: QuestionType.TEXTAREA, required: false, order: 9 },
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
