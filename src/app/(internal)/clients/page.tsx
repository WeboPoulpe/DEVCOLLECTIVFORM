import { getClients, createClient } from '@/actions/clients'
import Link from 'next/link'

export default async function ClientsPage() {
  const clients = await getClients()

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Clients</h1>
        <form
          action={async (fd: FormData) => {
            'use server'
            await createClient({
              company: fd.get('company'),
              contactName: fd.get('contactName'),
              contactEmail: fd.get('contactEmail'),
            })
          }}
          className="flex gap-2"
        >
          <input name="company" placeholder="Société" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="contactName" placeholder="Contact" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <input name="contactEmail" type="email" placeholder="Email" required
            className="px-3 py-1.5 text-sm rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          <button type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors">
            Ajouter
          </button>
        </form>
      </div>

      {clients.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-sm">Aucun client pour le moment.</p>
      ) : (
        <div className="space-y-2">
          {clients.map((c) => (
            <Link key={c.id} href={`/clients/${c.id}`}
              className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 hover:border-blue-300 transition-colors">
              <div>
                <p className="font-medium text-gray-900 dark:text-gray-100">{c.company}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{c.contactName} · {c.contactEmail}</p>
              </div>
              <span className="text-gray-400">→</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
