'use client'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const fd = new FormData(e.currentTarget)
    const result = await signIn('credentials', {
      email: fd.get('email'),
      password: fd.get('password'),
      redirect: false,
    })
    setLoading(false)
    if (result?.error) {
      setError('Email ou mot de passe incorrect')
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden" style={{ background: '#0f0e17' }}>
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full opacity-20 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7c3aed, transparent)' }} />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #4f46e5, transparent)' }} />

      <div className="relative w-full max-w-sm mx-4">
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl font-black mb-4"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}>
            C
          </div>
          <h1 className="text-2xl font-bold text-white">CollectivForm</h1>
          <p className="text-sm mt-1" style={{ color: '#6b7280' }}>Espace réservé au collectif</p>
        </div>

        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                Email
              </label>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.currentTarget.style.border = '1px solid rgba(124,58,237,0.6)')}
                onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#9ca3af' }}>
                Mot de passe
              </label>
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="w-full px-3 py-2.5 rounded-xl text-sm text-white focus:outline-none transition-all"
                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
                onFocus={e => (e.currentTarget.style.border = '1px solid rgba(124,58,237,0.6)')}
                onBlur={e => (e.currentTarget.style.border = '1px solid rgba(255,255,255,0.1)')}
              />
            </div>

            {error && (
              <p className="text-sm text-red-400 rounded-lg px-3 py-2" style={{ background: 'rgba(239,68,68,0.1)' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 text-white text-sm font-semibold rounded-xl transition-opacity disabled:opacity-50 mt-2"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #4f46e5)' }}
            >
              {loading ? 'Connexion…' : 'Se connecter'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
