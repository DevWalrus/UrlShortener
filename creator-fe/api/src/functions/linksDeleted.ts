import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions'
import { sendRequest } from '../lib/request'

async function handler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  return sendRequest('/links/deleted', req)
}

app.http('linksDeleted', {
  methods: ['GET'],
  route: 'links/deleted',
  authLevel: 'anonymous',
  handler,
})
