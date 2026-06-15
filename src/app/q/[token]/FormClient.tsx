'use client'
import { useState, useCallback, useRef } from 'react'
import { QuestionField } from '@/components/QuestionField'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { upsertAnswer, completeSubmission } from '@/actions/submissions'
import { QuestionType } from '@prisma/client'

interface Question {
  id: string
  label: string
  helpText: string | null
  type: QuestionType
  options: unknown
  required: boolean
  order: number
}

interface Section {
  id: string
  title: string
  description: string | null
  questions: Question[]
}

interface FormClientProps {
  submissionId: string
  questTitle: string
  clientName: string
  sections: Section[]
  initialAnswers: Record<string, unknown>
}

export function FormClient({ submissionId, questTitle, clientName, sections, initialAnswers }: FormClientProps) {
  const [step, setStep] = useState(0) // 0 = RGPD, 1..N = sections, N+1 = recap, N+2 = done
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [consented, setConsented] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const totalSteps = sections.length + 2 // RGPD + sections + recap
  const isRgpdStep = step === 0
  const isDoneStep = step === totalSteps
  const isRecapStep = step === totalSteps - 1
  const currentSection = !isRgpdStep && !isRecapStep && !isDoneStep ? sections[step - 1] : null

  const handleChange = useCallback((questionId: string, value: unknown) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }))
    clearTimeout(saveTimers.current[questionId])
    saveTimers.current[questionId] = setTimeout(() => {
      upsertAnswer({ submissionId, questionId, value }).catch(console.error)
    }, 600)
  }, [submissionId])

  function canProceed() {
    if (isRgpdStep) return consented
    if (!currentSection) return true
    return currentSection.questions
      .filter((q) => q.required)
      .every((q) => {
        const v = answers[q.id]
        if (v === undefined || v === null || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        return true
      })
  }

  async function handleComplete() {
    setSubmitting(true)
    await completeSubmission(submissionId)
    setStep(totalSteps)
    setSubmitting(false)
  }

  if (isDoneStep) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-3">Merci, {clientName} !</h1>
          <p className="text-gray-500 dark:text-gray-400">Vos réponses ont été enregistrées. Le collectif vous recontactera prochainement.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950 py-8 px-4">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100">{questTitle}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Bonjour {clientName}</p>
        </div>

        {/* Progress */}
        {!isRgpdStep && (
          <div className="mb-6">
            <ProgressBar value={step} max={totalSteps - 1} label={`Étape ${step} sur ${totalSteps - 1}`} />
          </div>
        )}

        {/* RGPD step */}
        {isRgpdStep && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Avant de commencer</h2>
            <div className="text-gray-600 dark:text-gray-400 space-y-2 text-sm">
              <p><strong>Finalité :</strong> Vos réponses servent à préparer votre projet avec le collectif.</p>
              <p><strong>Destinataires :</strong> Les membres du collectif impliqués dans votre projet uniquement.</p>
              <p><strong>Durée de conservation :</strong> 2 ans après la fin du projet.</p>
              <p><strong>Vos droits :</strong> Pour toute demande de modification ou de suppression, contactez-nous à <a href="mailto:contact@collectif.fr" className="text-blue-600 dark:text-blue-400">contact@collectif.fr</a>.</p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={consented}
                onChange={(e) => setConsented(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                J'ai lu et j'accepte que mes données soient utilisées dans ce cadre.
              </span>
            </label>
          </div>
        )}

        {/* Section step */}
        {currentSection && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-1">{currentSection.title}</h2>
            {currentSection.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">{currentSection.description}</p>
            )}
            <div className="space-y-6">
              {currentSection.questions.map((q) => (
                <QuestionField
                  key={q.id}
                  questionId={q.id}
                  label={q.label}
                  helpText={q.helpText}
                  type={q.type}
                  options={q.options}
                  required={q.required}
                  value={answers[q.id]}
                  onChange={(v) => handleChange(q.id, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Recap step */}
        {isRecapStep && (
          <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Récapitulatif</h2>
            <div className="space-y-6">
              {sections.map((section) => (
                <div key={section.id}>
                  <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{section.title}</h3>
                  <div className="space-y-2">
                    {section.questions.map((q) => {
                      const v = answers[q.id]
                      const display = v === undefined ? <span className="italic text-gray-400">Sans réponse</span>
                        : Array.isArray(v) ? v.join(', ')
                        : typeof v === 'boolean' ? (v ? 'Oui' : 'Non')
                        : String(v)
                      return (
                        <div key={q.id} className="text-sm">
                          <span className="text-gray-500 dark:text-gray-400">{q.label} : </span>
                          <span className="text-gray-900 dark:text-gray-100">{display}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors"
          >
            Précédent
          </button>

          {isRecapStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              {submitting ? 'Envoi…' : 'Valider et envoyer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              disabled={!canProceed()}
              className="px-5 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-xl transition-colors"
            >
              Suivant
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
