import { useState, FormEvent, useId } from 'react';
import { createLink, Link } from '../api';

interface Props {
  creatorUuid: string;
  onSuccess: (link: Link) => void;
}

export default function ShortenForm({ creatorUuid, onSuccess }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Link | null>(null);
  const [copied, setCopied] = useState(false);

  const inputId = useId();
  const statusId = useId();
  const canShare = 'share' in navigator;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const link = await createLink(url, creatorUuid);
      setResult(link);
      setUrl('');
      onSuccess(link);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    if (!result) return;
    if (canShare) {
      try {
        await navigator.share({ title: 'Short link', url: result.short_url });
        return;
      } catch {
        // user cancelled share — fall through to clipboard
      }
    }
    await navigator.clipboard.writeText(result.short_url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6">
      <h2 className="text-base font-semibold text-slate-700 mb-4">Shorten a URL</h2>

      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        {/* sr-only keeps the label invisible but available to screen readers */}
        <label htmlFor={inputId} className="sr-only">
          Enter a URL to shorten
        </label>
        <input
          id={inputId}
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://example.com/very/long/url"
          required
          aria-describedby={statusId}
          aria-invalid={error ? 'true' : undefined}
          className="flex-1 px-4 py-3 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-400 placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={loading}
          aria-busy={loading}
          className="w-full sm:w-auto px-5 py-3 bg-slate-900 text-white text-sm font-medium rounded-lg hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Shortening...' : 'Shorten'}
        </button>
      </form>

      {/* aria-live="polite" announces changes to screen readers without interrupting */}
      <div id={statusId} aria-live="polite" aria-atomic="true">
        {error && (
          <p role="alert" className="mt-3 text-sm text-red-500">{error}</p>
        )}

        {result && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-widest mb-2">
              Your short link
            </p>
            <div className="flex items-center gap-3">
              <a
                href={result.short_url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Short link ${result.short_url}, opens in a new tab`}
                className="flex-1 font-mono text-slate-900 font-semibold hover:underline truncate"
              >
                {result.short_url}
              </a>
              <button
                onClick={handleShare}
                aria-label={copied ? 'Copied to clipboard' : canShare ? `Share ${result.short_url}` : `Copy ${result.short_url} to clipboard`}
                className="shrink-0 px-3 py-1.5 text-xs font-medium bg-slate-900 text-white rounded-lg hover:bg-slate-700 transition-colors"
              >
                {copied ? 'Copied!' : canShare ? 'Share' : 'Copy'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
