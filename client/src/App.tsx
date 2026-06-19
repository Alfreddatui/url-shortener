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
      <header className="bg-slate-900 text-white py-6 shadow-md">
        <div className="max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold tracking-tight">OGP URL Shortener</h1>
          <p className="text-slate-400 text-sm mt-1">Simple, fast URL shortening</p>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-10 space-y-4">
        <ShortenForm creatorUuid={creatorUuid} onSuccess={setNewLink} />
        <LinkList creatorUuid={creatorUuid} newLink={newLink} />
      </main>

      <footer className="text-center text-slate-400 text-xs py-6">
        Links are public and permanent · built for OGP
      </footer>
    </div>
  );
}
