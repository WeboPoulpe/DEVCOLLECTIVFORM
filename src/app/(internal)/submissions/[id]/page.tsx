import { getSubmission } from '@/actions/submissions'
import { notFound } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { ExportButton } from './ExportButton'
import { submissionToMarkdown } from '@/lib/export'

export default async function SubmissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const submission = await getSubmission(id)
  if (!submission) notFound()

  const answersById: Record<string, unknown> = {}
  for (const answer of submission.answers) {
    answersById[answer.questionId] = answer.value
  }

  // Build answersMap keyed by question label (for markdown export)
  const answersByLabel: Record<string, unknown> = {}
  for (const section of submission.questionnaire.sections) {
    for (const q of section.questions) {
      answersByLabel[q.label] = answersById[q.id]
    }
  }

  const markdown = submissionToMarkdown({
    clientCompany: submission.client.company,
    questTitle: submission.questionnaire.title,
    completedAt: submission.completedAt,
    sections: submission.questionnaire.sections.map((s) => ({
      title: s.title,
      owner: s.owner,
      questions: s.questions,
    })),
    answersMap: answersByLabel,
  })

  const filename = `${submission.client.company}-${submission.questionnaire.title}.md`
    .replace(/[^a-z0-9-_.]/gi, '-')
    .toLowerCase()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link href={`/clients/${submission.clientId}`}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1 block">
            ← {submission.client.company}
          </Link>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
            {submission.questionnaire.title}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={submission.status} />
          <ExportButton filename={filename} content={markdown} />
        </div>
      </div>

      <div className="space-y-6">
        {submission.questionnaire.sections.map((section) => (
          <div key={section.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900 dark:text-gray-100">{section.title}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{section.owner.name}</p>
              </div>
            </div>
            <div className="p-5 space-y-4">
              {section.questions.map((q) => {
                const value = answersById[q.id]
                return (
                  <div key={q.id}>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">{q.label}</p>
                    {value === undefined || value === null ? (
                      <p className="text-sm italic text-gray-400">Sans réponse</p>
                    ) : (q.type === 'TEXT' || q.type === 'TEXTAREA') ? (
                      <p className="text-sm text-gray-900 dark:text-gray-100 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-lg">{String(value)}</p>
                    ) : (q.type === 'SELECT') ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {String(value)}
                      </span>
                    ) : (q.type === 'YESNO') ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                        {value ? 'Oui' : 'Non'}
                      </span>
                    ) : q.type === 'MULTISELECT' ? (
                      <div className="flex flex-wrap gap-2">
                        {(value as string[]).map((v) => (
                          <span key={v} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300">{v}</span>
                        ))}
                      </div>
                    ) : q.type === 'SCALE' ? (
                      <div className="flex items-center gap-2">
                        <div className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(Number(value) / 5) * 100}%` }} />
                        </div>
                        <span className="text-sm text-gray-900 dark:text-gray-100">{String(value)}/5</span>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
