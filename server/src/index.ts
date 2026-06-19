import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { runMigrations, pool } from './db';
import linksRouter from './routes/links';
import redirectRouter from './routes/redirect';

const app = express();
const PORT = process.env.PORT ?? 3000;

// Trust the first proxy so express-rate-limit sees the real client IP
// instead of the load balancer's IP when deployed behind one
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

async function start() {
  try {
    await runMigrations();
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
