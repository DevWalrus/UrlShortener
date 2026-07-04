import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getUserFromRequest } from './auth';

vi.mock('./db', () => ({
  getDb: vi.fn(),
}));

import { getDb } from './db';
import type { HttpRequest } from '@azure/functions';

const getDbMock = vi.mocked(getDb);

function makeRequest(principalHeader?: string): HttpRequest {
  const headers = new Map<string, string>();
  if (principalHeader !== undefined) {
    headers.set('x-ms-client-principal', principalHeader);
  }
  return {
    headers: {
      get: (key: string) => headers.get(key.toLowerCase()) ?? null,
    },
  } as unknown as HttpRequest;
}

function encodeHeader(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

const validUser = { email: 'user@example.com', apiToken: 'tok_abc123' };

function mockDb(user: unknown) {
  const findOne = vi.fn().mockResolvedValue(user);
  const collection = vi.fn().mockReturnValue({ findOne });
  getDbMock.mockResolvedValue({ collection } as any);
  return { findOne };
}

beforeEach(() => vi.clearAllMocks());

describe('getUserFromRequest', () => {
  it('returns null when x-ms-client-principal header is missing', async () => {
    const result = await getUserFromRequest(makeRequest());
    expect(result).toBeNull();
  });

  it('returns null when header is not valid base64 JSON', async () => {
    const result = await getUserFromRequest(makeRequest('not-valid-base64!!'));
    expect(result).toBeNull();
  });

  it('returns null when parsed principal has no userDetails', async () => {
    const header = encodeHeader({ userDetails: null });
    const result = await getUserFromRequest(makeRequest(header));
    expect(result).toBeNull();
  });

  it('returns null when userDetails is not a string', async () => {
    const header = encodeHeader({ userDetails: 42 });
    const result = await getUserFromRequest(makeRequest(header));
    expect(result).toBeNull();
  });

  it('returns null when user is not found in DB', async () => {
    mockDb(null);
    const header = encodeHeader({ userDetails: 'user@example.com' });
    const result = await getUserFromRequest(makeRequest(header));
    expect(result).toBeNull();
  });

  it('returns the user record when found', async () => {
    mockDb(validUser);
    const header = encodeHeader({ userDetails: 'user@example.com' });
    const result = await getUserFromRequest(makeRequest(header));
    expect(result).toEqual(validUser);
  });

  it('queries DB with email and revokedAt filter', async () => {
    const { findOne } = mockDb(validUser);
    const header = encodeHeader({ userDetails: 'user@example.com' });
    await getUserFromRequest(makeRequest(header));
    expect(findOne).toHaveBeenCalledWith({
      email: 'user@example.com',
      revokedAt: { $exists: false },
    });
  });
});
