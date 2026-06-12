import { SubStatus } from '@prisma/client'

const config: Record<SubStatus, { label: string; className: string }> = {
  SENT: { label: 'Envoyé', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' },
  IN_PROGRESS: { label: 'En cours', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' },
  COMPLETED: { label: 'Complété', className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' },
}

export function StatusBadge({ status }: { status: SubStatus }) {
  const { label, className } = config[status]
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${className}`}>
      {label}
    </span>
  )
}
