import { app, HttpRequest, HttpResponseInit, InvocationContext } from '@azure/functions';
import { sendRequest } from '../lib/request';

async function handler(req: HttpRequest, _context: InvocationContext): Promise<HttpResponseInit> {
  const slug = req.params.slug;
  return sendRequest(`/links/${slug}`, req);
}

app.http('linksSlug', {
  methods: ['DELETE'],
  route: 'links/{slug}',
  authLevel: 'anonymous',
  handler,
});
