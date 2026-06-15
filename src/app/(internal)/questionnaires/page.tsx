import { getQuestionnaires, createQuestionnaire } from '@/actions/questionnaires'
import Link from 'next/link'

export default async function QuestionnairesPage() {
  const questionnaires = await getQuestionnaires()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Questionnaires</h1>
        <form action={async (fd: FormData) => {
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
