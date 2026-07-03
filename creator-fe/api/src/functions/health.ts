import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { getDb } from '../lib/db';

async function handler(_req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  try {
    const db = await getDb();
    await db.command({ ping: 1 });
    return { status: 200, body: 'ok' };
  } catch {
    return { status: 503, body: 'mongodb unavailable' };
  }
}

app.http('health', {
  methods: ['GET'],
  route: 'health',
  authLevel: 'anonymous',
  handler,
});
