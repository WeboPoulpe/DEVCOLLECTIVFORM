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

function inputClass(extra = '') {
  return `w-full px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 ${extra}`
}

export function QuestionField({ questionId, label, helpText, type, options, required, value, onChange }: QuestionFieldProps) {
  const opts = Array.isArray(options) ? (options as string[]) : []
  const scaleOpts = !Array.isArray(options) && options ? (options as { min: number; max: number; minLabel?: string; maxLabel?: string }) : null

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-800 dark:text-gray-200">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {helpText && <p className="text-xs text-gray-500 dark:text-gray-400">{helpText}</p>}

      {type === 'TEXT' && (
        <input
          id={questionId}
          type="text"
          required={required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass()}
        />
      )}

      {type === 'TEXTAREA' && (
        <textarea
          id={questionId}
          required={required}
          rows={4}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass('resize-none')}
        />
      )}

      {type === 'SELECT' && (
        <select
          id={questionId}
          required={required}
          value={(value as string) ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass()}
        >
          <option value="">Choisir…</option>
          {opts.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {type === 'MULTISELECT' && (
        <div className="space-y-2">
          {opts.map((opt) => {
            const checked = Array.isArray(value) ? (value as string[]).includes(opt) : false
            return (
              <label key={opt} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => {
                    const current = Array.isArray(value) ? (value as string[]) : []
                    onChange(e.target.checked ? [...current, opt] : current.filter((v) => v !== opt))
                  }}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                {opt}
              </label>
            )
          })}
        </div>
      )}

      {type === 'SCALE' && scaleOpts && (
        <div className="space-y-2">
          <div className="flex gap-2">
            {Array.from({ length: scaleOpts.max - scaleOpts.min + 1 }, (_, i) => scaleOpts.min + i).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => onChange(n)}
                className={`w-10 h-10 rounded-lg border text-sm font-medium transition-colors ${
                  value === n
                    ? 'bg-blue-600 border-blue-600 text-white'
                    : 'border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:border-blue-400'
                }`}
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
        <div className="flex gap-4">
          {[{ v: true, label: 'Oui' }, { v: false, label: 'Non' }].map(({ v, label: lbl }) => (
            <label key={lbl} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
              <input
                type="radio"
                name={questionId}
                checked={value === v}
                onChange={() => onChange(v)}
                className="text-blue-600 focus:ring-blue-500"
              />
              {lbl}
            </label>
          ))}
        </div>
      )}
    </div>
  )
}
