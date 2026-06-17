import { db } from '@/lib/db'
import { notFound } from 'next/navigation'
import { FormClient } from './FormClient'

export default async function PublicFormPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params

  const submission = await db.submission.findUnique({
    where: { token },
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

  const allowedIds = submission.allowedSectionIds as string[] | null
  const visibleSections = allowedIds
    ? submission.questionnaire.sections.filter(s => allowedIds.includes(s.id))
    : submission.questionnaire.sections

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
    initialAnswers[answer.questionId] = answer.value as unknown
  }

  return (
    <FormClient
      submissionId={submission.id}
      questTitle={submission.questionnaire.title}
      clientName={submission.client.contactName}
      sections={visibleSections}
      initialAnswers={initialAnswers}
    />
  )
}
