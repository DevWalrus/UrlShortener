const BASE = import.meta.env.VITE_API_BASE ?? '/api';

export class ForbiddenError extends Error {}

const headers = {
  'Content-Type': 'application/json',
};

export interface Link {
  slug: string
  destination: string
  hitCount: number
  createdAt: string
  expiresAt?: string
  deletedAt?: string
}

export interface CreateLinkRequest {
  destination: string
  customSlug?: string
}


export async function checkAuth(): Promise<void> {
  const res = await fetch(`${BASE}/auth`, { headers });
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new Error('Auth check failed');
}

function checkResponse(res: Response, message: string) {
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) throw new Error(message);
}

export async function createLink(req: CreateLinkRequest): Promise<Link> {
  const res = await fetch(`${BASE}/links`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (res.status === 403) throw new ForbiddenError();
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to create link');
  }
  return res.json();
}

export async function listLinks(): Promise<Link[]> {
  const res = await fetch(`${BASE}/links`, { headers });
  checkResponse(res, 'Failed to fetch links');
  return res.json();
}

export async function listDeletedLinks(): Promise<Link[]> {
  const res = await fetch(`${BASE}/links/deleted`, { headers });
  checkResponse(res, 'Failed to fetch deleted links');
  return res.json();
}

export async function deleteLink(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/links/${slug}`, {
    method: 'DELETE',
    headers,
  });
  checkResponse(res, 'Failed to delete link');
}
