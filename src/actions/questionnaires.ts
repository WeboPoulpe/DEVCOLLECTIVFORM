'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { QuestionType } from '@prisma/client'
import {
  createQuestionnaireSchema,
  createSectionSchema,
  createQuestionSchema,
} from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createQuestionnaire(data: unknown) {
  await auth()
  const parsed = createQuestionnaireSchema.parse(data)
  const q = await db.questionnaire.create({ data: parsed })
  revalidatePath('/questionnaires')
  return q
}

export async function getQuestionnaires() {
  await auth()
  return db.questionnaire.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getQuestionnaire(id: string) {
  await auth()
  return db.questionnaire.findUnique({
    where: { id },
    include: {
      sections: {
        orderBy: { order: 'asc' },
        include: {
          owner: { select: { id: true, name: true, specialty: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
    },
  })
}

export async function createSection(data: unknown) {
  await auth()
  const parsed = createSectionSchema.parse(data)
  const section = await db.section.create({ data: parsed })
  revalidatePath(`/questionnaires/${parsed.questionnaireId}`)
  return section
}

export async function updateSection(id: string, data: { title?: string; description?: string; ownerId?: string }) {
  await auth()
  const section = await db.section.update({ where: { id }, data })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return section
}

export async function moveSectionOrder(id: string, direction: 'up' | 'down') {
  await auth()
  const section = await db.section.findUniqueOrThrow({ where: { id } })
  const sibling = await db.section.findFirst({
    where: {
      questionnaireId: section.questionnaireId,
      order: direction === 'up' ? { lt: section.order } : { gt: section.order },
    },
    orderBy: { order: direction === 'up' ? 'desc' : 'asc' },
  })
  if (!sibling) return

  await db.$transaction([
    db.section.update({ where: { id: section.id }, data: { order: sibling.order } }),
    db.section.update({ where: { id: sibling.id }, data: { order: section.order } }),
  ])
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
}

export async function deleteSection(id: string) {
  await auth()
  const section = await db.section.findUniqueOrThrow({ where: { id } })
  await db.section.delete({ where: { id } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
}

export async function createQuestion(data: unknown) {
  await auth()
  const parsed = createQuestionSchema.parse(data)
  const q = await db.question.create({
    data: { ...parsed, options: (parsed.options ?? undefined) as never },
  })
  const section = await db.section.findUniqueOrThrow({ where: { id: parsed.sectionId } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return q
}

export async function updateQuestion(
  id: string,
  data: {
    label?: string
    helpText?: string
    type?: string
    options?: unknown
    required?: boolean
    order?: number
  }
) {
  await auth()
  const q = await db.question.update({
    where: { id },
    data: {
      ...data,
      type: data.type as QuestionType | undefined,
      options: (data.options ?? undefined) as never,
    },
  })
  const section = await db.section.findUniqueOrThrow({ where: { id: q.sectionId } })
  revalidatePath(`/questionnaires/${section.questionnaireId}`)
  return q
}

export async function deleteQuestion(id: string) {
  await auth()
  const q = await db.question.findUniqueOrThrow({ where: { id }, include: { section: true } })
  await db.question.delete({ where: { id } })
  revalidatePath(`/questionnaires/${q.section.questionnaireId}`)
}

export async function getUsers() {
  await auth()
  return db.user.findMany({ select: { id: true, name: true, specialty: true } })
}
