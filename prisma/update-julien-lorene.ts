import 'dotenv/config'
import { PrismaClient, QuestionType } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const prisma = new PrismaClient({ adapter })

async function main() {
  // Récupérer les users
  const julien = await prisma.user.findUniqueOrThrow({ where: { email: 'design@collectif.fr' } })

  // Décaler les ordres existants pour faire de la place en position 1
  await prisma.section.updateMany({
    where: { questionnaireId: 'demo-questionnaire' },
    data: { order: { increment: 1 } },
  })

  // ─── 1. Créer section "Informations générales" (order 1, owner: Julien) ───
  const general = await prisma.section.create({
    data: {
      questionnaireId: 'demo-questionnaire',
      ownerId: julien.id,
      title: 'Informations générales',
      description: 'Pour mieux vous connaître et préparer notre échange.',
      order: 1,
    },
  })

  await prisma.question.createMany({
    data: [
      { sectionId: general.id, label: 'Nom & Prénom', type: QuestionType.TEXT, required: true, order: 1 },
      { sectionId: general.id, label: 'Numéro de téléphone', type: QuestionType.TEXT, required: true, order: 2 },
      { sectionId: general.id, label: 'Adresse de facturation', type: QuestionType.TEXT, required: false, order: 3 },
      { sectionId: general.id, label: 'Comment décririez-vous votre entreprise en quelques mots ?', type: QuestionType.TEXTAREA, required: true, order: 4 },
      { sectionId: general.id, label: 'Quel est votre rôle dans ce projet ?', type: QuestionType.SELECT, required: true, order: 5, options: ['Dirigeant(e)', 'Directeur·trice marketing', 'Chef(fe) de projet', 'Responsable communication', 'Autre'] },
      { sectionId: general.id, label: 'À qui s\'adressent vos offres ? Qui est votre client idéal ?', type: QuestionType.TEXTAREA, required: true, order: 6 },
      { sectionId: general.id, label: 'Qu\'est-ce qui vous distingue vraiment de vos concurrents, selon vous ?', type: QuestionType.TEXTAREA, required: false, order: 7 },
      { sectionId: general.id, label: 'Aujourd\'hui, comment vos clients vous trouvent-ils ?', type: QuestionType.MULTISELECT, required: false, order: 8, options: ['Bouche à oreille', 'Google / SEO', 'Réseaux sociaux', 'Publicité payante', 'Salons / événements', 'Recommandations partenaires', 'Autre'] },
    ],
  })

  // ─── 2. Mettre à jour section "Design & identité visuelle" (Julien) ───
  const designSection = await prisma.section.findFirst({
    where: { questionnaireId: 'demo-questionnaire', title: 'Design & identité visuelle' },
  })
  if (!designSection) { console.log('Section design introuvable'); return }

  await prisma.question.deleteMany({ where: { sectionId: designSection.id } })

  await prisma.question.createMany({
    data: [
      { sectionId: designSection.id, label: 'Quel est le projet pour lequel vous souhaitez être accompagné(e) ?', type: QuestionType.MULTISELECT, required: true, order: 1, options: ['Création de logo', 'Charte graphique complète', 'Refonte d\'identité', 'Supports print (flyers, cartes…)', 'Supports digitaux', 'Autre'] },
      { sectionId: designSection.id, label: 'Avez-vous déjà une identité visuelle (logo, charte graphique) ?', type: QuestionType.YESNO, required: true, order: 2 },
      { sectionId: designSection.id, label: 'Si oui, qu\'est-ce qui vous convient dans cette identité, et qu\'est-ce qui vous manque ?', type: QuestionType.TEXTAREA, required: false, order: 3 },
      { sectionId: designSection.id, label: 'Sur une échelle de 1 à 10, quelle place tient votre image de marque dans votre stratégie de développement ?', type: QuestionType.SCALE, required: false, order: 4, options: { min: 1, max: 10, minLabel: 'Pas prioritaire', maxLabel: 'Essentielle' } },
      { sectionId: designSection.id, label: 'Pourquoi est-ce le bon moment pour lancer ce projet ?', type: QuestionType.TEXTAREA, required: false, order: 5 },
      { sectionId: designSection.id, label: 'Si ce projet était une réussite totale dans 12 mois, qu\'est-ce qui aurait changé pour votre entreprise ?', type: QuestionType.TEXTAREA, required: false, order: 6 },
      { sectionId: designSection.id, label: 'Avez-vous défini une enveloppe budgétaire pour ce projet ?', type: QuestionType.YESNO, required: false, order: 7 },
      { sectionId: designSection.id, label: 'Dans quelle fourchette budgétaire vous situez-vous ?', type: QuestionType.SELECT, required: false, order: 8, options: ['Moins de 500 €', '500 – 1 500 €', '1 500 – 3 000 €', 'Plus de 3 000 €', 'À définir ensemble'] },
      { sectionId: designSection.id, label: 'Qu\'est-ce qui vous a amené(e) à me contacter plutôt qu\'à chercher une autre solution ?', type: QuestionType.TEXTAREA, required: false, order: 9 },
      { sectionId: designSection.id, label: 'Y a-t-il autre chose que vous souhaiteriez partager avant qu\'on échange ?', type: QuestionType.TEXTAREA, required: false, order: 10 },
    ],
  })

  // ─── 3. Mettre à jour section "Réseaux sociaux" (Lorène) ───
  const socialSection = await prisma.section.findFirst({
    where: { questionnaireId: 'demo-questionnaire', title: 'Réseaux sociaux' },
  })
  if (!socialSection) { console.log('Section réseaux introuvable'); return }

  await prisma.question.deleteMany({ where: { sectionId: socialSection.id } })

  await prisma.question.createMany({
    data: [
      { sectionId: socialSection.id, label: 'Sur quels réseaux sociaux êtes-vous présent(e) aujourd\'hui ?', type: QuestionType.MULTISELECT, required: true, order: 1, options: ['Instagram', 'Facebook', 'LinkedIn', 'TikTok', 'YouTube', 'X (Twitter)', 'Pinterest', 'Aucun'] },
      { sectionId: socialSection.id, label: 'Qui gère actuellement vos réseaux sociaux ?', type: QuestionType.SELECT, required: true, order: 2, options: ['Moi-même', 'Mon équipe', 'Un(e) prestataire externe', 'Personne pour le moment', 'Autre'] },
      { sectionId: socialSection.id, label: 'Quel est votre objectif principal sur les réseaux sociaux ?', type: QuestionType.SELECT, required: true, order: 3, options: ['Gagner en visibilité', 'Trouver de nouveaux clients', 'Fidéliser ma clientèle', 'Développer ma notoriété', 'Recruter'] },
      { sectionId: socialSection.id, label: 'Quelles sont vos principales difficultés aujourd\'hui ?', type: QuestionType.MULTISELECT, required: true, order: 4, options: ['Manque de temps', 'Manque d\'idées', 'Manque de compétences', 'Pas de stratégie définie', 'Manque de budget', 'Résultats insuffisants'] },
      { sectionId: socialSection.id, label: 'Qu\'est-ce qui n\'a pas fonctionné jusqu\'à présent ?', type: QuestionType.TEXTAREA, required: false, order: 5 },
      { sectionId: socialSection.id, label: 'Souhaitez-vous déléguer vos réseaux sociaux ou plutôt vous former ?', type: QuestionType.SELECT, required: true, order: 6, options: ['Déléguer totalement', 'Déléguer partiellement', 'Me former pour gérer moi-même', 'Je ne sais pas encore'] },
      { sectionId: socialSection.id, label: 'Si délégation — volume de publications envisagé par mois ?', type: QuestionType.SELECT, required: false, order: 7, options: ['1 à 4 publications', '5 à 8 publications', '9 et plus', 'À définir ensemble'] },
      { sectionId: socialSection.id, label: 'Si formation — quels sujets souhaitez-vous maîtriser ?', type: QuestionType.MULTISELECT, required: false, order: 8, options: ['Création de contenu', 'Canva', 'Reels & vidéos', 'Publicité payante', 'Stratégie éditoriale', 'Analyse des résultats'] },
      { sectionId: socialSection.id, label: 'Quel est votre budget ou enveloppe prévisionnelle ?', type: QuestionType.SELECT, required: false, order: 9, options: ['Moins de 200 €/mois', '200 – 500 €/mois', '500 – 1 000 €/mois', 'Plus de 1 000 €/mois', 'À définir'] },
      { sectionId: socialSection.id, label: 'Avez-vous une échéance ou un objectif de lancement ?', type: QuestionType.SELECT, required: false, order: 10, options: ['Urgent (moins d\'1 mois)', 'Dans 1 à 3 mois', 'Dans 3 à 6 mois', 'Pas d\'urgence'] },
    ],
  })

  console.log('✓ Section "Informations générales" créée (8 questions)')
  console.log('✓ Section "Design & identité visuelle" mise à jour (10 questions)')
  console.log('✓ Section "Réseaux sociaux" mise à jour (10 questions)')
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
