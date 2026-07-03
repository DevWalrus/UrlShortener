import { HttpRequest, HttpResponseInit } from '@azure/functions'
import { getUserFromRequest } from './auth'

const API_URL = process.env.CREATOR_API_URL

export async function sendRequest(endpoint: string, req: HttpRequest): Promise<HttpResponseInit> {
  if (!API_URL) {
    return { status: 500, body: 'Server misconfigured: CREATOR_API_URL is not set.' }
  }

  const user = await getUserFromRequest(req)

  if (!user) {
    return {
      status: 403,
      body: 'Forbidden — you do not have access to this resource.',
    }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-API-Key': user.apiToken as string,
  }

  const body = req.method === 'POST' ? await req.text() : undefined

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: req.method,
    headers,
    body,
  })

  const hasBody = response.status !== 204 && response.headers.get('content-length') !== '0'

  return {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
    body: hasBody ? await response.text() : undefined,
  }
}
