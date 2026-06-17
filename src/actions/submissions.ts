'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { createSubmissionSchema, saveAnswerSchema } from '@/lib/validations'
import { sendSubmissionLink, sendCompletionNotification } from '@/lib/email'
import { revalidatePath } from 'next/cache'
import { QuestionType } from '@prisma/client'

export async function createSubmissionAction(data: { clientId: string; questionnaireId: string; expiresAt?: string; allowedSectionIds?: string[] }) {
  await auth()
  const parsed = createSubmissionSchema.parse(data)
  const submission = await db.submission.create({
    data: {
      clientId: parsed.clientId,
      questionnaireId: parsed.questionnaireId,
      expiresAt: parsed.expiresAt ? new Date(parsed.expiresAt) : undefined,
      allowedSectionIds: data.allowedSectionIds,
    },
  })
  revalidatePath(`/clients/${parsed.clientId}`)
  return submission
}

export async function sendSubmissionLinkEmail(submissionId: string) {
  await auth()
  const sub = await db.submission.findUniqueOrThrow({
    where: { id: submissionId },
    include: {
      client: true,
      questionnaire: true,
    },
  })
  await sendSubmissionLink({
    to: sub.client.contactEmail,
    clientName: sub.client.contactName,
    questTitle: sub.questionnaire.title,
    token: sub.token,
  })
}

export async function upsertAnswer(data: { submissionId: string; questionId: string; value: unknown }) {
  const parsed = saveAnswerSchema.parse(data)
  const question = await db.question.findUniqueOrThrow({ where: { id: parsed.questionId as string } })

  let value = parsed.value
  if (question.type === QuestionType.SCALE && typeof value === 'string') {
    value = parseInt(value as string, 10)
  }

  await db.answer.upsert({
    where: {
      submissionId_questionId: {
        submissionId: parsed.submissionId as string,
        questionId: parsed.questionId as string,
      },
    },
    update: { value: value as never },
    create: {
      submissionId: parsed.submissionId as string,
      questionId: parsed.questionId as string,
      value: value as never,
    },
  })

  await db.submission.updateMany({
    where: { id: parsed.submissionId as string, status: 'SENT' },
    data: { status: 'IN_PROGRESS' },
  })
}

export async function completeSubmission(submissionId: string) {
  const sub = await db.submission.update({
    where: { id: submissionId },
    data: { status: 'COMPLETED', completedAt: new Date() },
    include: {
      client: true,
      questionnaire: {
        include: {
          sections: {
            include: {
              owner: true,
            },
          },
        },
      },
    },
  })

  for (const section of sub.questionnaire.sections) {
    try {
      await sendCompletionNotification({
        to: section.owner.email,
        ownerName: section.owner.name,
        clientCompany: sub.client.company,
        sectionTitle: section.title,
        submissionId: sub.id,
      })
    } catch (e) {
      console.error('Email send failed for', section.owner.email, e)
    }
  }
}

export async function getSubmission(id: string) {
  await auth()
  return db.submission.findUnique({
    where: { id },
    include: {
      client: true,
      questionnaire: {
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              owner: { select: { id: true, name: true, specialty: true } },
              questions: { orderBy: { order: 'asc' } },
            },
          },
        },
      },
      answers: true,
    },
  })
}
