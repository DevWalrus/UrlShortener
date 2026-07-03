import { HttpRequest } from '@azure/functions'
import { getDb } from './db'

export async function getUserFromRequest(req: HttpRequest) {
  const principalHeader = req.headers.get('x-ms-client-principal')
  if (!principalHeader) return null

  const principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString())
  const email: string | undefined = principal?.userDetails
  if (!email) return null

  console.log(`Fetching user with email: ${email}`)

  const db = await getDb()
  const user = await db.collection('users').findOne({
    email,
    revokedAt: { $exists: false },
  })

  return user ?? null
}
