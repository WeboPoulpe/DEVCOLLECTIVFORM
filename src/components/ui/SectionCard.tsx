interface SectionCardProps {
  title: string
  ownerName: string
  questionCount: number
  children?: React.ReactNode
}

export function SectionCard({ title, ownerName, questionCount, children }: SectionCardProps) {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <p className="font-semibold text-gray-900 dark:text-gray-100">{title}</p>
          <span className="text-xs text-gray-400">{questionCount} question(s)</span>
        </div>
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Responsable : {ownerName}</p>
      </div>
      {children && <div className="p-5">{children}</div>}
    </div>
  )
}
