import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';
import { kgs } from '../kgs';

const router = Router();

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
});

const fetchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
});

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) && parsed.hostname.length > 0;
  } catch {
    return false;
  }
}

function isValidUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

router.post('/', createLimiter, async (req: Request, res: Response) => {
  const { url, creator_uuid } = req.body;

  if (!url || typeof url !== 'string' || !isValidUrl(url)) {
    return res.status(400).json({ error: 'A valid http or https URL is required.' });
  }

  const creatorUuid =
    creator_uuid && typeof creator_uuid === 'string' && isValidUuid(creator_uuid)
      ? creator_uuid
      : null;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows: [{ id }] } = await client.query<{ id: number }>(
      'INSERT INTO links (original_url, creator_uuid) VALUES ($1, $2) RETURNING id',
      [url, creatorUuid]
    );

    const shortCode = kgs.generate(id);

    const { rows: [link] } = await client.query(
      'UPDATE links SET short_code = $1 WHERE id = $2 RETURNING *',
      [shortCode, id]
    );

    await client.query('COMMIT');

    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    return res.status(201).json({
      short_code: link.short_code,
      short_url: `${baseUrl}/${link.short_code}`,
      original_url: link.original_url,
      created_at: link.created_at,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error(err);
    return res.status(500).json({ error: 'Failed to create short link.' });
  } finally {
    client.release();
  }
});

router.get('/', fetchLimiter, async (req: Request, res: Response) => {
  const { creator_uuid } = req.query;

  if (!creator_uuid || typeof creator_uuid !== 'string' || !isValidUuid(creator_uuid)) {
    return res.status(400).json({ error: 'A valid creator_uuid is required.' });
  }

  try {
    const { rows } = await pool.query(
      'SELECT short_code, original_url, created_at FROM links WHERE creator_uuid = $1 ORDER BY created_at DESC',
      [creator_uuid]
    );

    const baseUrl = process.env.BASE_URL ?? 'http://localhost:3000';
    return res.json(
      rows.map(row => ({ ...row, short_url: `${baseUrl}/${row.short_code}` }))
    );
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to fetch links.' });
  }
});

export default router;
