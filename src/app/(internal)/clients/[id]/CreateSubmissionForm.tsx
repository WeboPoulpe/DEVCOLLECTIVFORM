'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createSubmissionAction } from '@/actions/submissions'

interface Section { id: string; title: string; order: number }
interface Questionnaire { id: string; title: string; sections: Section[] }

const SECTION_ICONS: Record<string, string> = {
  général: '📋', information: '📋',
  dev: '💻', web: '💻', tech: '💻',
  design: '🎨', graphi: '🎨', identit: '🎨',
  seo: '🔍', contenu: '🔍',
  réseau: '📱', social: '📱', market: '📱',
}
function sectionIcon(title: string) {
  const t = title.toLowerCase()
  return Object.entries(SECTION_ICONS).find(([k]) => t.includes(k))?.[1] ?? '📝'
}

export function CreateSubmissionForm({ clientId, questionnaires }: { clientId: string; questionnaires: Questionnaire[] }) {
  const router = useRouter()
  const [questId, setQuestId] = useState('')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)

  const currentQ = questionnaires.find(q => q.id === questId)

  function handleQuestChange(id: string) {
    setQuestId(id)
    const q = questionnaires.find(q => q.id === id)
    setSelectedIds(new Set(q?.sections.map(s => s.id) ?? []))
  }

  function toggleSection(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSubmit(fillNow: boolean) {
    if (!questId || selectedIds.size === 0) return
    setLoading(true)
    const allSelected = currentQ?.sections.every(s => selectedIds.has(s.id))
    const sub = await createSubmissionAction({
      clientId,
      questionnaireId: questId,
      allowedSectionIds: allSelected ? undefined : Array.from(selectedIds),
    })
    if (fillNow) {
      router.push(`/q/${sub.token}`)
    } else {
      router.refresh()
      setQuestId('')
      setSelectedIds(new Set())
    }
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <select
        value={questId}
        onChange={e => handleQuestChange(e.target.value)}
        className="w-full px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
      >
        <option value="">Choisir un questionnaire…</option>
        {questionnaires.map(q => (
          <option key={q.id} value={q.id}>{q.title}</option>
        ))}
      </select>

      {currentQ && currentQ.sections.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
            Sections à inclure
          </p>
          <div className="flex flex-wrap gap-2">
            {currentQ.sections.map(s => {
              const on = selectedIds.has(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSection(s.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border-2 transition-all"
                  style={{
                    borderColor: on ? '#7c3aed' : '#e5e7eb',
                    background: on ? '#faf5ff' : '#f9fafb',
                    color: on ? '#6d28d9' : '#9ca3af',
                  }}
                >
                  <span>{sectionIcon(s.title)}</span>
                  {s.title}
                  {on && <span className="ml-0.5 text-violet-500">✓</span>}
                </button>
              )
            })}
          </div>
          {selectedIds.size === 0 && (
            <p className="text-xs text-red-400 mt-1">Sélectionnez au moins une section</p>
          )}
        </div>
      )}

      {questId && (
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => handleSubmit(false)}
            disabled={loading || selectedIds.size === 0}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 disabled:opacity-40 transition-all"
          >
            {loading ? '…' : 'Générer le lien'}
          </button>
          <button
            onClick={() => handleSubmit(true)}
            disabled={loading || selectedIds.size === 0}
            className="px-4 py-2 text-sm font-semibold rounded-xl text-white disabled:opacity-40 transition-all hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
          >
            {loading ? '…' : 'Remplir maintenant →'}
          </button>
        </div>
      )}
    </div>
  )
}
