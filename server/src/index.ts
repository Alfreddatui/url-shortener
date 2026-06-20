import 'dotenv/config';
import { app } from './app';
import { runMigrations } from './db';

const PORT = process.env.PORT ?? 3000;

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
