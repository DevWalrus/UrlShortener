import { HttpRequest } from '@azure/functions';
import { getDb } from './db';

export type UserRecord = {
  apiToken?: string;
  email?: string;
  revokedAt?: unknown;
};

type ClientPrincipal = {
  userDetails?: unknown;
};

export async function getUserFromRequest(req: HttpRequest): Promise<UserRecord | null> {
  const principalHeader = req.headers.get('x-ms-client-principal');
  if (!principalHeader) return null;

  let principal: ClientPrincipal;
  try {
    principal = JSON.parse(Buffer.from(principalHeader, 'base64').toString('utf8')) as ClientPrincipal;
  } catch {
    return null;
  }

  const email = typeof principal.userDetails === 'string' ? principal.userDetails : undefined;
  if (!email) return null;
  const db = await getDb();
  const user = await db.collection<UserRecord>('users').findOne({
    email,
    revokedAt: { $exists: false },
  });

  return user ?? null;
}
