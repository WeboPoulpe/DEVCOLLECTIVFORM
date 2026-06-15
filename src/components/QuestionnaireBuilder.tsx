'use client'
import { useState } from 'react'
import {
  createSection, deleteSection, moveSectionOrder,
  createQuestion, deleteQuestion,
} from '@/actions/questionnaires'
import { QuestionType } from '@prisma/client'

interface Owner { id: string; name: string; specialty: string | null }
interface Question {
  id: string; label: string; helpText: string | null; type: QuestionType
  options: unknown; required: boolean; order: number
}
interface Section {
  id: string; title: string; description: string | null; order: number
  owner: Owner; questions: Question[]
}
interface Props {
  questionnaireId: string
  sections: Section[]
  users: Owner[]
}

const QUESTION_TYPES: { value: QuestionType; label: string }[] = [
  { value: 'TEXT', label: 'Texte court' },
  { value: 'TEXTAREA', label: 'Texte long' },
  { value: 'SELECT', label: 'Choix unique' },
  { value: 'MULTISELECT', label: 'Choix multiple' },
  { value: 'SCALE', label: 'Échelle' },
  { value: 'YESNO', label: 'Oui / Non' },
]

export function QuestionnaireBuilder({ questionnaireId, sections: initSections, users }: Props) {
  const [sections, setSections] = useState(initSections)
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [addingQuestion, setAddingQuestion] = useState<string | null>(null)

  async function handleAddSection(fd: FormData) {
    const maxOrder = sections.length > 0 ? Math.max(...sections.map((s) => s.order)) : 0
    await createSection({
      questionnaireId,
      ownerId: fd.get('ownerId') as string,
      title: fd.get('title') as string,
      description: (fd.get('description') as string) || undefined,
      order: maxOrder + 1,
    })
    window.location.reload()
  }

  async function handleMoveSection(id: string, dir: 'up' | 'down') {
    await moveSectionOrder(id, dir)
    window.location.reload()
  }

  async function handleDeleteSection(id: string) {
    if (!confirm('Supprimer cette section et toutes ses questions ?')) return
    await deleteSection(id)
    window.location.reload()
  }

  async function handleAddQuestion(sectionId: string, fd: FormData) {
    const section = sections.find((s) => s.id === sectionId)!
    const maxOrder = section.questions.length > 0 ? Math.max(...section.questions.map((q) => q.order)) : 0
    const type = fd.get('type') as QuestionType
    let options: unknown = undefined
    if (type === 'SELECT' || type === 'MULTISELECT') {
      const raw = fd.get('options') as string
      options = raw.split('\n').map((s) => s.trim()).filter(Boolean)
    }
    if (type === 'SCALE') {
      options = { min: 1, max: 5, minLabel: fd.get('minLabel') as string, maxLabel: fd.get('maxLabel') as string }
    }
    await createQuestion({
      sectionId,
      label: fd.get('label') as string,
      helpText: (fd.get('helpText') as string) || undefined,
      type,
      options,
      required: fd.get('required') === 'on',
      order: maxOrder + 1,
    })
    setAddingQuestion(null)
    window.location.reload()
  }

  async function handleDeleteQuestion(id: string) {
    if (!confirm('Supprimer cette question ?')) return
    await deleteQuestion(id)
    window.location.reload()
  }

  return (
    <div className="space-y-4">
      {sections.map((section, idx) => (
        <div key={section.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800">
          <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100 dark:border-gray-800">
            <div className="flex flex-col gap-0.5">
              <button onClick={() => handleMoveSection(section.id, 'up')} disabled={idx === 0}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▲</button>
              <button onClick={() => handleMoveSection(section.id, 'down')} disabled={idx === sections.length - 1}
                className="text-gray-400 hover:text-gray-600 disabled:opacity-20 text-xs leading-none">▼</button>
            </div>
            <button
              onClick={() => setExpandedSection(expandedSection === section.id ? null : section.id)}
              className="flex-1 text-left"
            >
              <p className="font-medium text-gray-900 dark:text-gray-100">{section.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {section.owner.name} · {section.questions.length} question(s)
              </p>
            </button>
            <button onClick={() => handleDeleteSection(section.id)}
              className="text-red-400 hover:text-red-600 text-sm px-2 py-1">✕</button>
          </div>

          {expandedSection === section.id && (
            <div className="p-4 space-y-3">
              {section.questions.map((q) => (
                <div key={q.id} className="flex items-start justify-between gap-3 px-3 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{q.label}</p>
                    <p className="text-xs text-gray-400">{q.type}{q.required ? ' · requis' : ''}</p>
                  </div>
                  <button onClick={() => handleDeleteQuestion(q.id)}
                    className="text-red-400 hover:text-red-600 text-xs shrink-0">✕</button>
                </div>
              ))}

              {addingQuestion === section.id ? (
                <AddQuestionForm
                  onSubmit={(fd) => handleAddQuestion(section.id, fd)}
                  onCancel={() => setAddingQuestion(null)}
                />
              ) : (
                <button onClick={() => setAddingQuestion(section.id)}
                  className="w-full py-2 text-sm text-blue-600 dark:text-blue-400 border border-dashed border-blue-300 dark:border-blue-700 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors">
                  + Ajouter une question
                </button>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add section form */}
      <form action={handleAddSection} className="bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">+ Nouvelle section</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input name="title" placeholder="Titre de la section" required
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <select name="ownerId" required
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Assigner à…</option>
            {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
        </div>
        <input name="description" placeholder="Description (optionnel)"
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        <button type="submit"
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
          Ajouter la section
        </button>
      </form>
    </div>
  )
}

function AddQuestionForm({ onSubmit, onCancel }: { onSubmit: (fd: FormData) => void; onCancel: () => void }) {
  const [type, setType] = useState<QuestionType>('TEXT')
  return (
    <form
      onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.currentTarget)) }}
      className="space-y-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800"
    >
      <input name="label" placeholder="Intitulé de la question" required
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input name="helpText" placeholder="Texte d'aide (optionnel)"
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <select name="type" value={type} onChange={(e) => setType(e.target.value as QuestionType)}
        className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500">
        {QUESTION_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      {(type === 'SELECT' || type === 'MULTISELECT') && (
        <textarea name="options" placeholder="Une option par ligne" rows={3} required
          className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      )}
      {type === 'SCALE' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <input name="minLabel" placeholder="Label min (ex: Médiocre)"
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="maxLabel" placeholder="Label max (ex: Excellent)"
            className="px-3 py-2 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
      )}
      <div className="flex items-center justify-between">
        <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <input type="checkbox" name="required" className="rounded border-gray-300" />
          Requis
        </label>
        <div className="flex gap-2">
          <button type="button" onClick={onCancel}
            className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors">
            Annuler
          </button>
          <button type="submit"
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors">
            Ajouter
          </button>
        </div>
      </div>
    </form>
  )
}
