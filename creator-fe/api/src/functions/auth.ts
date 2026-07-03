import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getUserFromRequest } from '../lib/auth';

async function handler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const user = await getUserFromRequest(req);
  if (!user) return { status: 403 };
  return { status: 200, jsonBody: { email: user.email } };
}

app.http('auth', {
  methods: ['GET'],
  route: 'auth',
  authLevel: 'anonymous',
  handler,
});
