import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  checkAuth,
  createLink,
  listLinks,
  listDeletedLinks,
  deleteLink,
  ForbiddenError,
} from './links';

function mockFetch(status: number, body: unknown = null) {
  const res = {
    ok: status >= 200 && status < 300,
    status,
    json: vi.fn().mockResolvedValue(body),
    text: vi.fn().mockResolvedValue(typeof body === 'string' ? body : ''),
  };
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
  return res;
}

beforeEach(() => vi.unstubAllGlobals());

describe('checkAuth', () => {
  it('resolves on 200', async () => {
    mockFetch(200);
    await expect(checkAuth()).resolves.toBeUndefined();
  });

  it('throws ForbiddenError on 403', async () => {
    mockFetch(403);
    await expect(checkAuth()).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws generic Error on other non-ok status', async () => {
    mockFetch(500);
    await expect(checkAuth()).rejects.toThrow('Auth check failed');
  });
});

describe('createLink', () => {
  const link = { slug: 'ABC1234', destination: 'https://example.com', hitCount: 0, createdAt: '' };

  it('returns parsed link on success', async () => {
    mockFetch(201, link);
    await expect(createLink({ destination: 'https://example.com' })).resolves.toEqual(link);
  });

  it('sends customSlug when provided', async () => {
    mockFetch(201, link);
    await createLink({ destination: 'https://example.com', customSlug: 'ABC1234' });
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.customSlug).toBe('ABC1234');
  });

  it('omits customSlug when not provided', async () => {
    mockFetch(201, link);
    await createLink({ destination: 'https://example.com' });
    const fetchMock = vi.mocked(fetch);
    const body = JSON.parse(fetchMock.mock.calls[0][1]!.body as string);
    expect(body.customSlug).toBeUndefined();
  });

  it('throws ForbiddenError on 403', async () => {
    mockFetch(403);
    await expect(createLink({ destination: 'https://example.com' })).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('throws error with server message on failure', async () => {
    const res = {
      ok: false,
      status: 400,
      json: vi.fn(),
      text: vi.fn().mockResolvedValue('slug already taken'),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
    await expect(createLink({ destination: 'https://example.com' })).rejects.toThrow('slug already taken');
  });

  it('throws fallback message when server body is empty', async () => {
    const res = {
      ok: false,
      status: 400,
      json: vi.fn(),
      text: vi.fn().mockResolvedValue(''),
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(res));
    await expect(createLink({ destination: 'https://example.com' })).rejects.toThrow('Failed to create link');
  });
});

describe('listLinks', () => {
  it('returns array on success', async () => {
    mockFetch(200, []);
    await expect(listLinks()).resolves.toEqual([]);
  });

  it('throws ForbiddenError on 403', async () => {
    mockFetch(403);
    await expect(listLinks()).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('listDeletedLinks', () => {
  it('returns array on success', async () => {
    mockFetch(200, []);
    await expect(listDeletedLinks()).resolves.toEqual([]);
  });

  it('throws ForbiddenError on 403', async () => {
    mockFetch(403);
    await expect(listDeletedLinks()).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('deleteLink', () => {
  it('resolves on success', async () => {
    mockFetch(204);
    await expect(deleteLink('ABC1234')).resolves.toBeUndefined();
  });

  it('throws ForbiddenError on 403', async () => {
    mockFetch(403);
    await expect(deleteLink('ABC1234')).rejects.toBeInstanceOf(ForbiddenError);
  });

  it('sends DELETE request to correct URL', async () => {
    mockFetch(204);
    await deleteLink('ABC1234');
    const fetchMock = vi.mocked(fetch);
    expect(fetchMock.mock.calls[0][0]).toContain('/ABC1234');
    expect(fetchMock.mock.calls[0][1]!.method).toBe('DELETE');
  });
});
