import { getClient } from '@/actions/clients'
import { getQuestionnairesWithSections } from '@/actions/questionnaires'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CopyLinkButton } from '@/components/ui/CopyLinkButton'
import { CreateSubmissionForm } from './CreateSubmissionForm'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, questionnaires] = await Promise.all([
    getClient(id),
    getQuestionnairesWithSections(),
  ])
  if (!client) notFound()

  const templates = questionnaires.filter(q => q.isTemplate)

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">{client.company}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {client.contactName} · {client.contactEmail}
        </p>
      </div>

      <div className="mb-8 p-5 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nouveau questionnaire</h2>
        <CreateSubmissionForm clientId={id} questionnaires={templates} />
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Questionnaires envoyés</h2>
      {client.submissions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun questionnaire pour ce client.</p>
      ) : (
        <div className="space-y-2">
          {client.submissions.map((s) => {
            const allowed = s.allowedSectionIds as string[] | null
            return (
              <div key={s.id} className="px-4 py-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-100">{s.questionnaire.title}</p>
                    {allowed && (
                      <p className="text-xs text-violet-600 dark:text-violet-400 mt-0.5">
                        {allowed.length} section{allowed.length > 1 ? 's' : ''} sélectionnée{allowed.length > 1 ? 's' : ''}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <StatusBadge status={s.status} />
                    <Link href={`/q/${s.token}`} className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">Remplir →</Link>
                    <Link href={`/submissions/${s.id}`} className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Voir →</Link>
                  </div>
                </div>
                <CopyLinkButton url={`${BASE_URL}/q/${s.token}`} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
