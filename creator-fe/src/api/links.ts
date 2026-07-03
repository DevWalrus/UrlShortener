const BASE = import.meta.env.VITE_API_BASE ?? '/api';

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

export async function createLink(req: CreateLinkRequest): Promise<Link> {
  const res = await fetch(`${BASE}/links`, {
    method: 'POST',
    headers,
    body: JSON.stringify(req),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || 'Failed to create link');
  }
  return res.json();
}

export async function listLinks(): Promise<Link[]> {
  const res = await fetch(`${BASE}/links`, { headers });
  if (!res.ok) throw new Error('Failed to fetch links');
  return res.json();
}

export async function listDeletedLinks(): Promise<Link[]> {
  const res = await fetch(`${BASE}/links/deleted`, { headers });
  if (!res.ok) throw new Error('Failed to fetch deleted links');
  return res.json();
}

export async function deleteLink(slug: string): Promise<void> {
  const res = await fetch(`${BASE}/links/${slug}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete link');
}