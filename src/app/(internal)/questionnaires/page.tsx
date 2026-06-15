import { getQuestionnaires, createQuestionnaire } from '@/actions/questionnaires'
import Link from 'next/link'

export default async function QuestionnairesPage() {
  const questionnaires = await getQuestionnaires()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Questionnaires</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{questionnaires.length} questionnaire{questionnaires.length !== 1 ? 's' : ''}</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Nouveau questionnaire</p>
        <form action={async (fd: FormData) => {
          'use server'
          await createQuestionnaire({ title: fd.get('title'), description: fd.get('description') || undefined })
        }} className="flex gap-2">
          <input name="title" placeholder="Titre du questionnaire" required
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <input name="description" placeholder="Description (optionnel)"
            className="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <button type="submit"
            className="px-5 py-2 text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            + Créer
          </button>
        </form>
      </div>

      {questionnaires.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">📝</p>
          <p className="text-sm">Aucun questionnaire pour le moment</p>
        </div>
      ) : (
        <div className="space-y-2">
          {questionnaires.map((q) => (
            <Link key={q.id} href={`/questionnaires/${q.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all group">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: 'linear-gradient(135deg, #ede9fe, #ddd6fe)' }}>
                📋
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100">{q.title}</p>
                {q.description && <p className="text-sm text-gray-400 truncate">{q.description}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-medium px-2.5 py-1 rounded-full"
                  style={{ background: '#ede9fe', color: '#6d28d9' }}>
                  {q.isTemplate ? 'Template' : 'Instance'}
                </span>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
