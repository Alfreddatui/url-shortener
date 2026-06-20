import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

describe('GET /:shortCode', () => {
  let shortCode: string;

  // Use beforeEach (not beforeAll) so the link is created after each table
  // truncation from the root setup file — beforeAll would run before root beforeEach.
  beforeEach(async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'https://destination.example.com/path?q=1' });
    shortCode = res.body.short_code;
  });

  it('redirects with 302 and sets Location to the original URL', async () => {
    const res = await request(app)
      .get(`/${shortCode}`)
      .redirects(0); // do not follow — inspect the raw redirect
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('https://destination.example.com/path?q=1');
  });

  it('returns 404 for an unknown short code', async () => {
    const res = await request(app).get('/ZZZZZZ');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error');
  });
});
