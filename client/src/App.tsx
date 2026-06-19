import { useState } from 'react';
import ShortenForm from './components/ShortenForm';
import LinkList from './components/LinkList';
import { Link } from './api';

function getOrCreateUuid(): string {
  const key = 'creator_uuid';
  let uuid = localStorage.getItem(key);
  if (!uuid) {
    uuid = crypto.randomUUID();
    localStorage.setItem(key, uuid);
  }
  return uuid;
}

export default function App() {
  const [creatorUuid] = useState<string>(getOrCreateUuid);
  const [newLink, setNewLink] = useState<Link | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:px-4 focus:py-2 focus:bg-white focus:text-slate-900 focus:rounded-lg focus:shadow"
      >
        Skip to main content
      </a>

      <header className="bg-slate-900 text-white py-6 shadow-md">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold tracking-tight">OGP URL Shortener</h1>
          <p className="text-slate-400 text-sm mt-1">Simple, fast URL shortening</p>
        </div>
      </header>

      <main id="main-content" className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 space-y-4">
        <ShortenForm creatorUuid={creatorUuid} onSuccess={setNewLink} />
        <LinkList creatorUuid={creatorUuid} newLink={newLink} />
      </main>

      <footer className="text-center text-slate-400 text-xs py-6">
        Links are public and permanent · built for OGP
      </footer>
    </div>
  );
}
