import { auth } from '@/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { SubStatus } from '@prisma/client'

export default async function MyAnswersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const session = await auth()
  if (!session?.user?.id) return null

  const { status: statusParam } = await searchParams
  const validStatuses: SubStatus[] = ['SENT', 'IN_PROGRESS', 'COMPLETED']
  const statusFilter = statusParam && validStatuses.includes(statusParam as SubStatus)
    ? (statusParam as SubStatus)
    : undefined

  const sections = await db.section.findMany({
    where: { ownerId: (session.user as { id: string }).id },
    include: {
      questionnaire: { select: { title: true } },
      questions: {
        orderBy: { order: 'asc' },
        include: {
          answers: {
            include: {
              submission: {
                include: { client: true },
              },
            },
            where: statusFilter ? { submission: { status: statusFilter } } : undefined,
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  // Group answers by submission
  const submissionsMap = new Map<string, {
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
        if (!submissionsMap.has(sub.id)) {
          submissionsMap.set(sub.id, {
            submissionId: sub.id,
            clientCompany: sub.client.company,
            status: sub.status,
            questionnaireTitle: section.questionnaire.title,
            answers: [],
          })
        }
        submissionsMap.get(sub.id)!.answers.push({
          questionLabel: question.label,
          value: answer.value,
        })
      }
    }
  }

  const items = Array.from(submissionsMap.values())

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Mes réponses</h1>

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
