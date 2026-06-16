'use client'
import { QuestionType } from '@prisma/client'

interface QuestionFieldProps {
  questionId: string
  label: string
  helpText?: string | null
  type: QuestionType
  options?: unknown
  required?: boolean
  value: unknown
  onChange: (value: unknown) => void
}

const inputBase = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all placeholder:text-gray-400'

export function QuestionField({ questionId, label, helpText, type, options, required, value, onChange }: QuestionFieldProps) {
  const opts = Array.isArray(options) ? (options as string[]) : []
  const scaleOpts = !Array.isArray(options) && options ? (options as { min: number; max: number; minLabel?: string; maxLabel?: string }) : null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-semibold text-gray-800">
        {label}
        {required && <span className="text-violet-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-400">{helpText}</p>}

      {type === 'TEXT' && (
        <input
          id={questionId}
          type="text"
          required={required}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={inputBase}
        />
      )}

      {type === 'TEXTAREA' && (
        <textarea
          id={questionId}
          required={required}
          rows={4}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={`${inputBase} resize-none`}
        />
      )}

      {type === 'SELECT' && (
        <select
          id={questionId}
          required={required}
          value={(value as string) ?? ''}
          onChange={e => onChange(e.target.value)}
          className={inputBase}
        >
          <option value="">Choisir…</option>
          {opts.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {type === 'MULTISELECT' && (
        <div className="flex flex-wrap gap-2">
          {opts.map(opt => {
            const checked = Array.isArray(value) ? (value as string[]).includes(opt) : false
            return (
              <button
                key={opt}
                type="button"
                onClick={() => {
                  const current = Array.isArray(value) ? (value as string[]) : []
                  onChange(checked ? current.filter(v => v !== opt) : [...current, opt])
                }}
                className="px-3 py-1.5 rounded-full text-sm font-medium border-2 transition-all"
                style={{
                  borderColor: checked ? '#7c3aed' : '#e5e7eb',
                  background: checked ? '#faf5ff' : '#f9fafb',
                  color: checked ? '#6d28d9' : '#6b7280',
                }}
              >
                {checked && <span className="mr-1">✓</span>}{opt}
              </button>
            )
          })}
        </div>
      )}

      {type === 'SCALE' && scaleOpts && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {Array.from({ length: scaleOpts.max - scaleOpts.min + 1 }, (_, i) => scaleOpts.min + i).map(n => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className="w-10 h-10 rounded-xl border-2 text-sm font-bold transition-all"
                style={{
                  borderColor: value === n ? '#7c3aed' : '#e5e7eb',
                  background: value === n ? '#7c3aed' : '#f9fafb',
                  color: value === n ? '#fff' : '#6b7280',
                }}
              >
                {n}
              </button>
            ))}
          </div>
          {(scaleOpts.minLabel || scaleOpts.maxLabel) && (
            <div className="flex justify-between text-xs text-gray-400">
              <span>{scaleOpts.minLabel}</span>
              <span>{scaleOpts.maxLabel}</span>
            </div>
          )}
        </div>
      )}

      {type === 'YESNO' && (
        <div className="flex gap-3">
          {[{ v: true, label: 'Oui' }, { v: false, label: 'Non' }].map(({ v, label: lbl }) => (
            <button
              key={lbl}
              type="button"
              onClick={() => onChange(v)}
              className="px-6 py-2 rounded-xl border-2 text-sm font-semibold transition-all"
              style={{
                borderColor: value === v ? '#7c3aed' : '#e5e7eb',
                background: value === v ? '#7c3aed' : '#f9fafb',
                color: value === v ? '#fff' : '#6b7280',
              }}
            >
              {lbl}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
