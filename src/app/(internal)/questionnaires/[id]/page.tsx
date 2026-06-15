import { getQuestionnaire, getUsers } from '@/actions/questionnaires'
import { notFound } from 'next/navigation'
import { QuestionnaireBuilder } from '@/components/QuestionnaireBuilder'

export default async function QuestionnairePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [questionnaire, users] = await Promise.all([
    getQuestionnaire(id),
    getUsers(),
  ])
  if (!questionnaire) notFound()

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{questionnaire.title}</h1>
        {questionnaire.description && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{questionnaire.description}</p>
        )}
      </div>
      <QuestionnaireBuilder
        questionnaireId={questionnaire.id}
        sections={questionnaire.sections}
        users={users}
      />
    </div>
  )
}
