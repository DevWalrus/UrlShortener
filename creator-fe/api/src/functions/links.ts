import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { sendRequest } from '../lib/request';

async function handler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return sendRequest('/links', req);
}

app.http('links', {
  methods: ['GET', 'POST'],
  route: 'links',
  authLevel: 'anonymous',
  handler,
});
