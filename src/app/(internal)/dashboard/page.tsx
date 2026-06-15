import { auth } from '@/auth'
import { db } from '@/lib/db'
import { StatusBadge } from '@/components/ui/StatusBadge'
import Link from 'next/link'
import { DashboardCharts } from './DashboardCharts'

async function getDashboardData() {
  const [submissions, total, sent, inProgress, completed] = await Promise.all([
    db.submission.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: { client: true, questionnaire: true },
    }),
    db.submission.count(),
    db.submission.count({ where: { status: 'SENT' } }),
    db.submission.count({ where: { status: 'IN_PROGRESS' } }),
    db.submission.count({ where: { status: 'COMPLETED' } }),
  ])
  return { submissions, total, sent, inProgress, completed }
}

export default async function DashboardPage() {
  await auth()
  const { submissions, total, sent, inProgress, completed } = await getDashboardData()
  const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0

  const chartData = [
    { name: 'Envoyé', value: sent, fill: '#f59e0b' },
    { name: 'En cours', value: inProgress, fill: '#3b82f6' },
    { name: 'Complété', value: completed, fill: '#10b981' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100 mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total', value: total, color: 'text-gray-900 dark:text-gray-100' },
          { label: 'Envoyés', value: sent, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: 'En cours', value: inProgress, color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Complétés', value: completed, color: 'text-green-600 dark:text-green-400' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4">
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{label}</p>
            <p className={`text-3xl font-bold ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 p-4 mb-8">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Taux de complétion : {completionRate}%
        </p>
        <DashboardCharts data={chartData} />
      </div>

      <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Dernières activités</h2>
      <div className="space-y-2">
        {submissions.map((s) => (
          <Link key={s.id} href={`/submissions/${s.id}`}
            className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors">
            <div>
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {s.client.company} — {s.questionnaire.title}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">{new Date(s.createdAt).toLocaleDateString('fr-FR')}</p>
            </div>
            <StatusBadge status={s.status} />
          </Link>
        ))}
        {submissions.length === 0 && (
          <p className="text-sm text-gray-500 dark:text-gray-400">Aucune activité récente.</p>
        )}
      </div>
    </div>
  )
}
