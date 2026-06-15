'use client'
import { useState } from 'react'

export function CopyLinkButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(url)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex items-center gap-2 mt-1">
      <span className="text-xs text-gray-400 font-mono truncate max-w-[280px]">{url}</span>
      <button
        onClick={handleCopy}
        className="shrink-0 px-2 py-0.5 text-xs rounded border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {copied ? '✓ Copié !' : 'Copier'}
      </button>
    </div>
  )
}
