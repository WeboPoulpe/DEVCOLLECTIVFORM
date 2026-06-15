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

  const stats = [
    { label: 'Total', value: total, icon: '📋', from: '#f8fafc', to: '#f1f5f9', border: '#e2e8f0', valueColor: '#1e293b' },
    { label: 'Envoyés', value: sent, icon: '📤', from: '#fffbeb', to: '#fef3c7', border: '#fde68a', valueColor: '#d97706' },
    { label: 'En cours', value: inProgress, icon: '✍️', from: '#eff6ff', to: '#dbeafe', border: '#bfdbfe', valueColor: '#2563eb' },
    { label: 'Complétés', value: completed, icon: '✅', from: '#f0fdf4', to: '#dcfce7', border: '#bbf7d0', valueColor: '#059669' },
  ]

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Vue d'ensemble de l'activité du collectif</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, icon, from, to, border, valueColor }) => (
          <div key={label} className="rounded-2xl p-5" style={{ background: `linear-gradient(135deg, ${from}, ${to})`, border: `1px solid ${border}` }}>
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{label}</p>
              <span className="text-lg">{icon}</span>
            </div>
            <p className="text-4xl font-black" style={{ color: valueColor }}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5">
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Répartition des statuts</p>
            <span className="text-xs text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">{total} total</span>
          </div>
          <DashboardCharts data={chartData} />
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 flex flex-col justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">Taux de complétion</p>
            <p className="text-5xl font-black text-gray-900 dark:text-gray-100 mt-4">
              {completionRate}<span className="text-2xl text-gray-400">%</span>
            </p>
          </div>
          <div className="mt-4">
            <div className="w-full h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${completionRate}%`, background: 'linear-gradient(90deg, #7c3aed, #10b981)' }} />
            </div>
            <p className="text-xs text-gray-400 mt-2">{completed} complétés sur {total}</p>
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-3">Dernières activités</h2>
        <div className="space-y-2">
          {submissions.map((s) => (
            <Link key={s.id} href={`/submissions/${s.id}`}
              className="flex items-center justify-between px-4 py-3.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-sm transition-all group">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black text-white shrink-0"
                  style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
                  {s.client.company[0].toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {s.client.company}
                    <span className="text-gray-400 font-normal"> — {s.questionnaire.title}</span>
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {new Date(s.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={s.status} />
                <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
              </div>
            </Link>
          ))}
          {submissions.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-4">📭</p>
              <p className="text-sm">Aucune activité récente</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
