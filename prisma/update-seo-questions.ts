import 'dotenv/config'
import { PrismaClient, QuestionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  const section = await prisma.section.findFirst({
    where: { questionnaireId: 'demo-questionnaire', title: 'SEO & contenu' },
  })
  if (!section) { console.log('Section SEO introuvable'); return }

  await prisma.question.deleteMany({ where: { sectionId: section.id } })

  await prisma.question.createMany({
    data: [
      { sectionId: section.id, label: 'Que vendez-vous et à qui ?', type: QuestionType.TEXTAREA, required: true, order: 1 },
      { sectionId: section.id, label: 'Vous êtes-vous déjà penché sur le SEO (ou référencement naturel) avant de me contacter ?', type: QuestionType.TEXTAREA, required: true, order: 2 },
      { sectionId: section.id, label: 'Quelles sont vos 3 plus grosses problématiques actuelles concernant votre SEO et votre communication ? Comment vous sentez-vous face à ces problématiques ?', type: QuestionType.TEXTAREA, required: true, order: 3 },
      { sectionId: section.id, label: 'Si j\'avais une baguette magique, quel objectif pourrais-je vous aider à atteindre dans votre business grâce à un site personnalisé et optimisé SEO ?', type: QuestionType.TEXTAREA, required: true, order: 4 },
      { sectionId: section.id, label: 'Qu\'est-ce qui vous a empêché d\'atteindre ces objectifs dans le passé ?', type: QuestionType.TEXTAREA, required: true, order: 5 },
      { sectionId: section.id, label: 'Pourquoi est-ce important pour vous d\'atteindre cet objectif aujourd\'hui ? Et comment vous sentiriez-vous si vous atteigniez vos objectifs ?', type: QuestionType.TEXTAREA, required: true, order: 6 },
    ],
  })

  console.log('Section SEO mise à jour avec 6 questions')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
