'use server'
import { auth } from '@/auth'
import { db } from '@/lib/db'
import { createClientSchema } from '@/lib/validations'
import { revalidatePath } from 'next/cache'

export async function createClient(data: unknown) {
  await auth()
  const parsed = createClientSchema.parse(data)
  const client = await db.client.create({ data: parsed })
  revalidatePath('/clients')
  return client
}

export async function getClients() {
  await auth()
  return db.client.findMany({ orderBy: { createdAt: 'desc' } })
}

export async function getClient(id: string) {
  await auth()
  return db.client.findUnique({
    where: { id },
    include: {
      submissions: {
        include: { questionnaire: true },
        orderBy: { createdAt: 'desc' },
      },
    },
  })
}
