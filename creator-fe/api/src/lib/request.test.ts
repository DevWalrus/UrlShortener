import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { HttpRequest } from '@azure/functions';

// Must run before module evaluation so request.ts captures the correct value
vi.hoisted(() => {
  process.env.CREATOR_API_URL = 'http://localhost:4201';
});

vi.mock('./auth', () => ({
  getUserFromRequest: vi.fn(),
}));

import { sendRequest } from './request';
import { getUserFromRequest } from './auth';

const getUserMock = vi.mocked(getUserFromRequest);

const validUser = { email: 'user@example.com', apiToken: 'tok_abc123' };

function makeRequest(method = 'GET', body = ''): HttpRequest {
  return {
    method,
    text: vi.fn().mockResolvedValue(body),
  } as unknown as HttpRequest;
}

function mockFetch(status: number, body = '', extraHeaders: Record<string, string> = {}) {
  const responseHeaders = new Map(Object.entries({
    'content-type': 'application/json',
    ...extraHeaders,
  }));
  const res = {
    status,
    headers: { get: (key: string) => responseHeaders.get(key) ?? null },
    text: vi.fn().mockResolvedValue(body),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('sendRequest — auth gating', () => {
  it('returns 403 when user is not found', async () => {
    getUserMock.mockResolvedValue(null);
    const result = await sendRequest('/links', makeRequest());
    expect(result.status).toBe(403);
  });

  it('returns 403 when user has no apiToken', async () => {
    getUserMock.mockResolvedValue({ email: 'user@example.com' });
    const result = await sendRequest('/links', makeRequest());
    expect(result.status).toBe(403);
  });

  it('returns 403 when apiToken is empty string', async () => {
    getUserMock.mockResolvedValue({ email: 'user@example.com', apiToken: '' });
    const result = await sendRequest('/links', makeRequest());
    expect(result.status).toBe(403);
  });
});

describe('sendRequest — proxy behaviour', () => {
  beforeEach(() => {
    getUserMock.mockResolvedValue(validUser);
  });

  it('proxies GET and returns upstream status + body', async () => {
    mockFetch(200, '[{"slug":"ABC1234"}]');
    const result = await sendRequest('/links', makeRequest('GET'));
    expect(result.status).toBe(200);
    expect(result.body).toBe('[{"slug":"ABC1234"}]');
  });

  it('includes X-API-Key header in upstream request', async () => {
    mockFetch(200, '{}');
    await sendRequest('/links', makeRequest('GET'));
    const headers = vi.mocked(fetch).mock.calls[0][1]!.headers as Record<string, string>;
    expect(headers['X-API-Key']).toBe('tok_abc123');
  });

  it('sends request body for POST', async () => {
    mockFetch(201, '{"slug":"ABC1234"}');
    const req = makeRequest('POST', '{"destination":"https://example.com"}');
    await sendRequest('/links', req);
    expect(vi.mocked(fetch).mock.calls[0][1]!.body).toBe('{"destination":"https://example.com"}');
  });

  it('does not send body for GET', async () => {
    mockFetch(200, '{}');
    await sendRequest('/links', makeRequest('GET'));
    expect(vi.mocked(fetch).mock.calls[0][1]!.body).toBeUndefined();
  });

  it('forwards the correct upstream URL', async () => {
    mockFetch(200, '{}');
    await sendRequest('/links/ABC1234', makeRequest('DELETE'));
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe('http://localhost:4201/links/ABC1234');
  });

  it('returns 502 when upstream fetch throws', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('connection refused')));
    const result = await sendRequest('/links', makeRequest());
    expect(result.status).toBe(502);
  });

  it('returns no body for 204 responses', async () => {
    mockFetch(204, '', { 'content-length': '0' });
    const result = await sendRequest('/links/ABC1234', makeRequest('DELETE'));
    expect(result.status).toBe(204);
    expect(result.body).toBeUndefined();
  });
});

// Tested in isolation because it requires module reload to clear the cached API_URL
describe('sendRequest — missing CREATOR_API_URL', () => {
  it('returns 500 when CREATOR_API_URL is not set', async () => {
    vi.resetModules();
    delete process.env.CREATOR_API_URL;
    const { sendRequest: fresh } = await import('./request');
    getUserMock.mockResolvedValue(validUser);
    const result = await fresh('/links', makeRequest());
    expect(result.status).toBe(500);
    // restore for other test files
    process.env.CREATOR_API_URL = 'http://localhost:4201';
  });
});
