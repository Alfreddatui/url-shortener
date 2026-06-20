import express from 'express';
import cors from 'cors';
import { pool } from './db';
import linksRouter from './routes/links';
import redirectRouter from './routes/redirect';

const app = express();

app.set('trust proxy', 1);
app.use(cors({ origin: process.env.CLIENT_URL ?? 'http://localhost:5173' }));
app.use(express.json());

app.get('/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok' });
  } catch {
    res.status(503).json({ status: 'unavailable' });
  }
});

app.use('/api/links', linksRouter);
app.use('/', redirectRouter);

export { app };
