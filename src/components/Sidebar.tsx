'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'

const links = [
  { href: '/dashboard', label: 'Dashboard', icon: '◈' },
  { href: '/clients', label: 'Clients', icon: '◉' },
  { href: '/questionnaires', label: 'Questionnaires', icon: '◫' },
  { href: '/my-answers', label: 'Mes réponses', icon: '◌' },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-60 shrink-0 flex flex-col bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 h-full">
      <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-800">
        <span className="text-lg font-bold text-gray-900 dark:text-gray-100 tracking-tight">
          CollectivForm
        </span>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? 'bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300'
                  : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span>{icon}</span>
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="px-3 py-4 border-t border-gray-200 dark:border-gray-800">
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          <span>⎋</span>
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
