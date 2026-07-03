import { HttpRequest } from '@azure/functions'
import { getDb } from './db'

export async function getUserFromRequest(req: HttpRequest) {
  const principalHeader = req.headers.get('x-ms-client-principal')
  if (!principalHeader) return null

  let principal: any
  try {
    principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf8'))
  } catch {
    return null
  }

  const email: string | undefined = principal?.userDetails
  if (!email) return null
  const db = await getDb()
  const user = await db.collection('users').findOne({
    email,
    revokedAt: { $exists: false },
  })

  return user ?? null
}
