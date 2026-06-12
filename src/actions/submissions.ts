'use server'
import { db } from '@/lib/db'
import { auth } from '@/auth'
import { revalidatePath } from 'next/cache'

export async function createSubmissionAction(data: { clientId: string; questionnaireId: string; expiresAt?: string }) {
  await auth()
  const submission = await db.submission.create({
    data: {
      clientId: data.clientId,
      questionnaireId: data.questionnaireId,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    },
  })
  revalidatePath(`/clients/${data.clientId}`)
  return submission
}

// Stub — full implementation in Task 9
export async function sendSubmissionLinkEmail(_submissionId: string) {}
export async function upsertAnswer(_data: unknown) {}
export async function completeSubmission(_submissionId: string) {}
export async function getSubmission(_id: string) { return null }
