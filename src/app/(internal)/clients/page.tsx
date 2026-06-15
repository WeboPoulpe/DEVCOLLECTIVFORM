import { getClients, createClient } from '@/actions/clients'
import Link from 'next/link'

const COLORS = ['#7c3aed', '#4f46e5', '#0891b2', '#059669', '#d97706', '#dc2626']

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Clients</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{clients.length} client{clients.length !== 1 ? 's' : ''} au total</p>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 p-5 mb-6">
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Ajouter un client</p>
        <form
          action={async (fd: FormData) => {
            'use server'
            await createClient({
              company: fd.get('company'),
              contactName: fd.get('contactName'),
              contactEmail: fd.get('contactEmail'),
            })
          }}
          className="flex flex-wrap gap-2"
        >
          <input name="company" placeholder="Société" required
            className="flex-1 min-w-[140px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <input name="contactName" placeholder="Contact" required
            className="flex-1 min-w-[140px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <input name="contactEmail" type="email" placeholder="Email" required
            className="flex-1 min-w-[180px] px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-violet-400" />
          <button type="submit"
            className="px-5 py-2 text-white text-sm font-semibold rounded-xl transition-opacity hover:opacity-90"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            + Ajouter
          </button>
        </form>
      </div>

      {clients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-4">🏢</p>
          <p className="text-sm">Aucun client pour le moment</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {clients.map((c, i) => (
            <Link key={c.id} href={`/clients/${c.id}`}
              className="flex items-center gap-4 px-5 py-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700 hover:shadow-md transition-all group">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-base font-black text-white shrink-0"
                style={{ background: COLORS[i % COLORS.length] }}>
                {c.company[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{c.company}</p>
                <p className="text-sm text-gray-400 truncate">{c.contactName} · {c.contactEmail}</p>
              </div>
              <svg className="w-4 h-4 text-gray-300 group-hover:text-violet-400 transition-colors shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
