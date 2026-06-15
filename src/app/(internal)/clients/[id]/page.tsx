import { getClient } from '@/actions/clients'
import { getQuestionnaires } from '@/actions/questionnaires'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { StatusBadge } from '@/components/ui/StatusBadge'
import { CopyLinkButton } from '@/components/ui/CopyLinkButton'
import { createSubmissionAction } from '@/actions/submissions'

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [client, questionnaires] = await Promise.all([
    getClient(id),
    getQuestionnaires(),
  ])
  if (!client) notFound()

  const templates = questionnaires.filter((q) => q.isTemplate)

  const createAndFill = async (fd: FormData) => {
    'use server'
    const sub = await createSubmissionAction({
      clientId: id,
      questionnaireId: fd.get('questionnaireId') as string,
    })
    redirect(`/q/${sub.token}`)
  }

  const createOnly = async (fd: FormData) => {
    'use server'
    await createSubmissionAction({
      clientId: id,
      questionnaireId: fd.get('questionnaireId') as string,
    })
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{client.company}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          {client.contactName} · {client.contactEmail}
        </p>
      </div>

      <div className="mb-8 p-4 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Nouveau questionnaire</h2>
        <form className="flex flex-col gap-3">
          <select name="questionnaireId" required
            className="px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Choisir un questionnaire…</option>
            {templates.map((q) => (
              <option key={q.id} value={q.id}>{q.title}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            <button formAction={createOnly} type="submit"
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 text-sm font-medium rounded-lg transition-colors">
              Générer le lien
            </button>
            <button formAction={createAndFill} type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
              Remplir maintenant →
            </button>
          </div>
        </form>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3">Questionnaires envoyés</h2>
      {client.submissions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">Aucun questionnaire pour ce client.</p>
      ) : (
        <div className="space-y-2">
          {client.submissions.map((s) => (
            <div key={s.id} className="px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800">
              <div className="flex items-center justify-between">
                <p className="font-medium text-gray-900 dark:text-gray-100">{s.questionnaire.title}</p>
                <div className="flex items-center gap-3">
                  <StatusBadge status={s.status} />
                  <Link href={`/q/${s.token}`}
                    className="text-sm text-emerald-600 dark:text-emerald-400 hover:underline">Remplir →</Link>
                  <Link href={`/submissions/${s.id}`}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline">Voir →</Link>
                </div>
              </div>
              <CopyLinkButton url={`${BASE_URL}/q/${s.token}`} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
