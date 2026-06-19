export interface Link {
  short_code: string;
  short_url: string;
  original_url: string;
  created_at: string;
}

export async function createLink(url: string, creatorUuid: string): Promise<Link> {
  const res = await fetch('/api/links', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url, creator_uuid: creatorUuid }),
  });
  if (!res.ok) {
    const { error } = await res.json();
    throw new Error(error ?? 'Failed to shorten URL');
  }
  return res.json();
}

export async function getMyLinks(creatorUuid: string): Promise<Link[]> {
  const res = await fetch(`/api/links?creator_uuid=${encodeURIComponent(creatorUuid)}`);
  if (!res.ok) throw new Error('Failed to fetch links');
  return res.json();
}
