import 'dotenv/config'
import { PrismaClient, QuestionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const section = await prisma.section.findFirst({
    where: { questionnaireId: 'demo-questionnaire', title: 'Développement web' },
  })
  if (!section) { console.log('Section dev introuvable'); return }

  await prisma.question.deleteMany({ where: { sectionId: section.id } })

  await prisma.question.createMany({
    data: [
      { sectionId: section.id, label: 'Type de projet', type: QuestionType.SELECT, required: true, order: 1, options: ['Site vitrine', 'E-commerce', 'Autre'] },
      { sectionId: section.id, label: 'Le besoin en une phrase', type: QuestionType.TEXTAREA, required: true, order: 2 },
      { sectionId: section.id, label: 'Site / outil existant ?', type: QuestionType.SELECT, required: true, order: 3, options: ['Non', 'WordPress', 'Wix / autre', 'Autre'] },
      { sectionId: section.id, label: 'Fonctionnalités clés', type: QuestionType.MULTISELECT, required: false, order: 4, options: ['Contact', 'Prise de RDV', 'Paiement', 'Catalogue', 'Comptes / rôles', 'Espace client', 'Back-office', 'Notifications', 'Devis / Factures', 'Appli / SaaS', 'Logiciel métier', 'Sur-mesure', 'Refonte', 'Ne sait pas', 'Autre'] },
      { sectionId: section.id, label: 'Intégrations / outils à connecter', type: QuestionType.MULTISELECT, required: false, order: 5, options: ['Stripe', 'Compta', 'Mailing', 'CRM', 'Agenda Google', 'Autre outil', 'Aucune'] },
      { sectionId: section.id, label: 'Données à reprendre ?', type: QuestionType.SELECT, required: false, order: 6, options: ['Non', 'Oui — Excel / CSV', 'Oui — autre outil'] },
      { sectionId: section.id, label: 'Budget évoqué ?', type: QuestionType.YESNO, required: false, order: 7 },
      { sectionId: section.id, label: 'Délai', type: QuestionType.SELECT, required: false, order: 8, options: ['Pas pressé', '1 à 3 mois', 'Urgent', 'Fourchette donnée', 'Aucune'] },
      { sectionId: section.id, label: 'Référent technique + prochaine étape', type: QuestionType.TEXTAREA, required: false, order: 9 },
    ],
  })

  console.log('Section dev mise à jour avec', 9, 'questions')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
