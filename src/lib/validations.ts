import { z } from 'zod'
import { QuestionType } from '@prisma/client'

export const answerValueSchema = (type: QuestionType) => {
  switch (type) {
    case 'TEXT':
      return z.string()
    case 'TEXTAREA':
      return z.string()
    case 'SELECT':
      return z.string()
    case 'MULTISELECT':
      return z.array(z.string())
    case 'SCALE':
      return z.number().int().min(1).max(10)
    case 'YESNO':
      return z.boolean()
    default:
      return z.unknown()
  }
}

export const saveAnswerSchema = z.object({
  submissionId: z.string().min(1),
  questionId: z.string().min(1),
  value: z.unknown(),
})

export const createClientSchema = z.object({
  company: z.string().min(1, 'Nom de société requis'),
  contactName: z.string().min(1, 'Nom du contact requis'),
  contactEmail: z.string().email('Email invalide'),
})

export const createQuestionnaireSchema = z.object({
  title: z.string().min(1, 'Titre requis'),
  description: z.string().optional(),
})

export const createSectionSchema = z.object({
  questionnaireId: z.string().min(1),
  ownerId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  order: z.number().int().min(0),
})

export const createQuestionSchema = z.object({
  sectionId: z.string().min(1),
  label: z.string().min(1),
  helpText: z.string().optional(),
  type: z.nativeEnum(QuestionType),
  options: z.unknown().optional(),
  required: z.boolean().default(false),
  order: z.number().int().min(0),
})

export const createSubmissionSchema = z.object({
  clientId: z.string().min(1),
  questionnaireId: z.string().min(1),
  expiresAt: z.string().datetime().optional(),
})

export const sendSubmissionEmailSchema = z.object({
  submissionId: z.string().min(1),
})
