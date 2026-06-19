import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { pool } from '../db';

const router = Router();

const redirectLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Try again in a minute.' },
});

router.get('/:shortCode', redirectLimiter, async (req: Request, res: Response) => {
  const { shortCode } = req.params;

  try {
    const { rows } = await pool.query<{ original_url: string }>(
      'SELECT original_url FROM links WHERE short_code = $1',
      [shortCode]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Short URL not found.' });
    }

    return res.redirect(302, rows[0].original_url);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Internal server error.' });
  }
});

export default router;
