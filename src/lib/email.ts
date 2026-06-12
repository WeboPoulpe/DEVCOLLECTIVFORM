import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'

export async function sendSubmissionLink(opts: {
  to: string
  clientName: string
  questTitle: string
  token: string
}) {
  const link = `${BASE_URL}/q/${opts.token}`
  await resend.emails.send({
    from: 'Collectif <noreply@weboform.fr>',
    to: opts.to,
    subject: `Votre questionnaire : ${opts.questTitle}`,
    html: `
      <p>Bonjour ${opts.clientName},</p>
      <p>Votre questionnaire "<strong>${opts.questTitle}</strong>" est prêt.</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Remplir le questionnaire</a></p>
      <p>Ou copiez ce lien : ${link}</p>
    `,
  })
}

export async function sendCompletionNotification(opts: {
  to: string
  ownerName: string
  clientCompany: string
  sectionTitle: string
  submissionId: string
}) {
  const link = `${BASE_URL}/submissions/${opts.submissionId}`
  await resend.emails.send({
    from: 'Collectif <noreply@weboform.fr>',
    to: opts.to,
    subject: `${opts.clientCompany} a complété sa section : ${opts.sectionTitle}`,
    html: `
      <p>Bonjour ${opts.ownerName},</p>
      <p><strong>${opts.clientCompany}</strong> a complété la section "<strong>${opts.sectionTitle}</strong>".</p>
      <p><a href="${link}" style="background:#2563eb;color:white;padding:10px 20px;border-radius:8px;text-decoration:none;">Voir les réponses</a></p>
    `,
  })
}
