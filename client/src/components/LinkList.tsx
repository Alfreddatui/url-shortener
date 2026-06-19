import { useState, useEffect, useCallback } from 'react';
import { getMyLinks, Link } from '../api';

interface Props {
  creatorUuid: string;
  newLink: Link | null;
}

export default function LinkList({ creatorUuid, newLink }: Props) {
  const [links, setLinks] = useState<Link[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLinks = useCallback(async () => {
    try {
      const data = await getMyLinks(creatorUuid);
      setLinks(data);
    } catch {
      // silently fail — "my links" is a convenience feature, not core functionality
    } finally {
      setLoading(false);
    }
  }, [creatorUuid]);

  useEffect(() => { fetchLinks(); }, [fetchLinks]);
  useEffect(() => { if (newLink) fetchLinks(); }, [newLink, fetchLinks]);

  if (loading || links.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">My Links</h2>

      <div className="divide-y divide-slate-100">
        {links.map((link) => (
          <div key={link.short_code} className="py-3 flex items-start gap-4">
            <div className="flex-1 min-w-0">
              <a
                href={link.short_url}
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-sm font-semibold text-slate-900 hover:underline"
              >
                {link.short_url}
              </a>
              <p className="text-xs text-slate-400 truncate mt-0.5">{link.original_url}</p>
            </div>
            <span className="shrink-0 text-xs text-slate-400 pt-0.5">
              {new Date(link.created_at).toLocaleDateString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
