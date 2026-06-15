import { QuestionType } from '@prisma/client'

interface Question { label: string; type: QuestionType }
interface Section { title: string; owner: { name: string }; questions: Question[] }

export function submissionToMarkdown(opts: {
  clientCompany: string
  questTitle: string
  completedAt: Date | null
  sections: Section[]
  answersMap: Record<string, unknown>
}) {
  const { clientCompany, questTitle, completedAt, sections, answersMap } = opts
  const date = completedAt ? new Date(completedAt).toLocaleDateString('fr-FR') : 'En cours'

  let md = `# ${questTitle} — ${clientCompany}\n\n`
  md += `**Date :** ${date}\n\n---\n\n`

  for (const section of sections) {
    md += `## ${section.title}\n`
    md += `*Responsable : ${section.owner.name}*\n\n`
    for (const q of section.questions) {
      const v = answersMap[q.label]
      let display = '*(sans réponse)*'
      if (v !== undefined && v !== null && v !== '') {
        if (Array.isArray(v)) display = v.join(', ')
        else if (typeof v === 'boolean') display = v ? 'Oui' : 'Non'
        else display = String(v)
      }
      md += `**${q.label}**\n${display}\n\n`
    }
    md += '---\n\n'
  }

  return md
}
