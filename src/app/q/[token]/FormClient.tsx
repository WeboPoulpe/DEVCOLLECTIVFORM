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

const STEP_RGPD = 0
const STEP_SELECTION = 1
const STEP_FIRST_SECTION = 2

function getSectionIcon(title: string) {
  const t = title.toLowerCase()
  if (t.includes('général') || t.includes('information')) return '📋'
  if (t.includes('dev') || t.includes('web') || t.includes('tech')) return '💻'
  if (t.includes('design') || t.includes('graphi') || t.includes('identit')) return '🎨'
  if (t.includes('seo') || t.includes('contenu') || t.includes('référ')) return '🔍'
  if (t.includes('réseau') || t.includes('social') || t.includes('market')) return '📱'
  return '📝'
}

export function FormClient({ submissionId, questTitle, clientName, sections, initialAnswers }: FormClientProps) {
  const [step, setStep] = useState(STEP_RGPD)
  const [answers, setAnswers] = useState<Record<string, unknown>>(initialAnswers)
  const [consented, setConsented] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(sections.map(s => s.id)))
  const [orderedIds, setOrderedIds] = useState<string[]>(sections.map(s => s.id))
  const [submitting, setSubmitting] = useState(false)
  const saveTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const activeSections = orderedIds
    .map(id => sections.find(s => s.id === id)!)
    .filter(s => s && selectedIds.has(s.id))

  function moveSection(id: string, dir: 'up' | 'down') {
    setOrderedIds(prev => {
      const idx = prev.indexOf(id)
      if (idx === -1) return prev
      const next = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }
  const stepRecap = STEP_FIRST_SECTION + activeSections.length
  const stepDone = stepRecap + 1

  const isRgpdStep = step === STEP_RGPD
  const isSelectionStep = step === STEP_SELECTION
  const isRecapStep = step === stepRecap
  const isDoneStep = step === stepDone
  const currentSection = (!isRgpdStep && !isSelectionStep && !isRecapStep && !isDoneStep && step >= STEP_FIRST_SECTION)
    ? activeSections[step - STEP_FIRST_SECTION]
    : null

  const handleChange = useCallback((questionId: string, value: unknown) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
    clearTimeout(saveTimers.current[questionId])
    saveTimers.current[questionId] = setTimeout(() => {
      upsertAnswer({ submissionId, questionId, value }).catch(console.error)
    }, 600)
  }, [submissionId])

  function toggleSection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function canProceed() {
    if (isRgpdStep) return consented
    if (isSelectionStep) return selectedIds.size > 0
    if (!currentSection) return true
    return currentSection.questions
      .filter(q => q.required)
      .every(q => {
        const v = answers[q.id]
        if (v === undefined || v === null || v === '') return false
        if (Array.isArray(v) && v.length === 0) return false
        return true
      })
  }

  async function handleComplete() {
    setSubmitting(true)
    await completeSubmission(submissionId)
    setStep(stepDone)
    setSubmitting(false)
  }

  if (isDoneStep) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: '#f8fafc' }}>
        <div className="max-w-md text-center">
          <div className="text-6xl mb-6">🎉</div>
          <h1 className="text-2xl font-semibold text-gray-900 mb-3">Merci, {clientName} !</h1>
          <p className="text-gray-500">Vos réponses ont été enregistrées. Le collectif vous recontactera prochainement.</p>
        </div>
      </div>
    )
  }

  const showProgress = step >= STEP_FIRST_SECTION
  const progressValue = step - STEP_FIRST_SECTION + 1
  const progressMax = activeSections.length + 1

  return (
    <div className="min-h-screen py-8 px-4" style={{ background: '#f8fafc' }}>
      <div className="max-w-xl mx-auto">

        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-6 h-6 rounded flex items-center justify-center text-white text-xs font-black"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>C</div>
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">CollectivForm</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900">{questTitle}</h1>
          <p className="text-sm text-gray-500 mt-0.5">Bonjour {clientName} 👋</p>
        </div>

        {/* Progress bar (sections only) */}
        {showProgress && (
          <div className="mb-6">
            <ProgressBar
              value={progressValue}
              max={progressMax}
              label={isRecapStep ? 'Récapitulatif' : `Section ${progressValue} sur ${activeSections.length}`}
            />
          </div>
        )}

        {/* ─── RGPD ─── */}
        {isRgpdStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Avant de commencer</h2>
            <div className="text-gray-600 space-y-2 text-sm leading-relaxed">
              <p><strong>Finalité :</strong> Vos réponses servent à préparer votre projet avec le collectif.</p>
              <p><strong>Destinataires :</strong> Les membres du collectif impliqués dans votre projet uniquement.</p>
              <p><strong>Durée de conservation :</strong> 2 ans après la fin du projet.</p>
              <p><strong>Vos droits :</strong> Pour toute demande, contactez-nous à{' '}
                <a href="mailto:contact@collectif.fr" className="text-violet-600">contact@collectif.fr</a>.
              </p>
            </div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input type="checkbox" checked={consented} onChange={e => setConsented(e.target.checked)}
                className="mt-0.5 rounded border-gray-300 text-violet-600 focus:ring-violet-500" />
              <span className="text-sm text-gray-700">
                J'ai lu et j'accepte que mes données soient utilisées dans ce cadre.
              </span>
            </label>
          </div>
        )}

        {/* ─── Sélection des sections ─── */}
        {isSelectionStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Que concerne votre projet ?</h2>
            <p className="text-sm text-gray-500 mb-5">Sélectionnez uniquement les parties qui vous concernent — les autres seront ignorées.</p>
            <div className="space-y-2">
              {orderedIds.map((id, idx) => {
                const section = sections.find(s => s.id === id)
                if (!section) return null
                const selected = selectedIds.has(section.id)
                return (
                  <div key={section.id} className="flex items-center gap-2">
                    {/* Flèches de réordonnancement */}
                    <div className="flex flex-col gap-0.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => moveSection(id, 'up')}
                        disabled={idx === 0}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 8V2M2 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(id, 'down')}
                        disabled={idx === orderedIds.length - 1}
                        className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-20 transition-all"
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M5 2v6M2 5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </button>
                    </div>

                    {/* Card cliquable */}
                    <button
                      type="button"
                      onClick={() => toggleSection(section.id)}
                      className="flex-1 flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-left transition-all"
                      style={{
                        borderColor: selected ? '#7c3aed' : '#e5e7eb',
                        background: selected ? '#faf5ff' : '#f9fafb',
                      }}
                    >
                      <span className="text-xl shrink-0">{getSectionIcon(section.title)}</span>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{section.title}</p>
                        {section.description && (
                          <p className="text-xs text-gray-400 mt-0.5 truncate">{section.description}</p>
                        )}
                      </div>
                      <div className="shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                        style={{ borderColor: selected ? '#7c3aed' : '#d1d5db', background: selected ? '#7c3aed' : 'transparent' }}>
                        {selected && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                      </div>
                    </button>
                  </div>
                )
              })}
            </div>
            {selectedIds.size === 0 && (
              <p className="text-xs text-red-500 mt-3">Sélectionnez au moins une section pour continuer.</p>
            )}
          </div>
        )}

        {/* ─── Section questions ─── */}
        {currentSection && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-2xl">{getSectionIcon(currentSection.title)}</span>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{currentSection.title}</h2>
                {currentSection.description && (
                  <p className="text-sm text-gray-400">{currentSection.description}</p>
                )}
              </div>
            </div>
            <div className="space-y-6">
              {currentSection.questions.map(q => (
                <QuestionField
                  key={q.id}
                  questionId={q.id}
                  label={q.label}
                  helpText={q.helpText}
                  type={q.type}
                  options={q.options}
                  required={q.required}
                  value={answers[q.id]}
                  onChange={v => handleChange(q.id, v)}
                />
              ))}
            </div>
          </div>
        )}

        {/* ─── Récapitulatif ─── */}
        {isRecapStep && (
          <div className="bg-white rounded-2xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-5">Récapitulatif</h2>
            <div className="space-y-6">
              {activeSections.map(section => (
                <div key={section.id}>
                  <div className="flex items-center gap-2 mb-2">
                    <span>{getSectionIcon(section.title)}</span>
                    <h3 className="text-sm font-semibold text-gray-700">{section.title}</h3>
                  </div>
                  <div className="space-y-1.5 pl-6">
                    {section.questions.map(q => {
                      const v = answers[q.id]
                      if (v === undefined || v === null || v === '') return null
                      const display = Array.isArray(v) ? v.join(', ')
                        : typeof v === 'boolean' ? (v ? 'Oui' : 'Non')
                        : String(v)
                      return (
                        <div key={q.id} className="text-sm">
                          <span className="text-gray-400">{q.label} : </span>
                          <span className="text-gray-800 font-medium">{display}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ─── Navigation ─── */}
        <div className="flex justify-between mt-6">
          <button
            type="button"
            onClick={() => setStep(s => s - 1)}
            disabled={step === 0}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 disabled:opacity-30 transition-colors"
          >
            Précédent
          </button>

          {isRecapStep ? (
            <button
              type="button"
              onClick={handleComplete}
              disabled={submitting}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #059669, #10b981)' }}
            >
              {submitting ? 'Envoi…' : '✓ Valider et envoyer'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep(s => s + 1)}
              disabled={!canProceed()}
              className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl disabled:opacity-50 transition-opacity"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              Suivant →
            </button>
          )}
        </div>

      </div>
    </div>
  )
}
