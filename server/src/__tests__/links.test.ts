import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../app';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';
const OTHER_UUID = '00000000-0000-4000-8000-000000000000';

describe('POST /api/links', () => {
  it('creates a link for a valid https URL', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com', creator_uuid: VALID_UUID });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      short_code: expect.stringMatching(/^[0-9A-Za-z]{6,}$/),
      short_url: expect.stringContaining('/'),
      original_url: 'https://example.com',
      created_at: expect.any(String),
    });
  });

  it('creates a link for a valid http URL', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'http://example.com', creator_uuid: VALID_UUID });
    expect(res.status).toBe(201);
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ creator_uuid: VALID_UUID });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for a ftp:// URL (only http/https allowed)', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'ftp://example.com', creator_uuid: VALID_UUID });
    expect(res.status).toBe(400);
  });

  it('returns 400 for a plain string that is not a URL', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'not-a-url', creator_uuid: VALID_UUID });
    expect(res.status).toBe(400);
  });

  it('still creates a link when creator_uuid is invalid (silently stores null)', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com', creator_uuid: 'not-a-uuid' });
    expect(res.status).toBe(201);
  });

  it('still creates a link without any creator_uuid', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com' });
    expect(res.status).toBe(201);
  });

  it('includes standard RateLimit headers', async () => {
    const res = await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com', creator_uuid: VALID_UUID });
    expect(res.headers['ratelimit-limit']).toBeDefined();
    expect(res.headers['ratelimit-remaining']).toBeDefined();
  });
});

describe('GET /api/links', () => {
  // Use beforeEach (not beforeAll) so seeding happens after each table truncation
  // from the root setup file — beforeAll would run before the root beforeEach.
  beforeEach(async () => {
    await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com/a', creator_uuid: VALID_UUID });
    await request(app)
      .post('/api/links')
      .send({ url: 'https://example.com/b', creator_uuid: VALID_UUID });
  });

  it('returns the links for a known creator_uuid', async () => {
    const res = await request(app)
      .get('/api/links')
      .query({ creator_uuid: VALID_UUID });

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2);
    expect(res.body[0]).toMatchObject({
      short_code: expect.any(String),
      short_url: expect.any(String),
      original_url: expect.any(String),
    });
  });

  it('returns an empty array for an unknown creator_uuid', async () => {
    const res = await request(app)
      .get('/api/links')
      .query({ creator_uuid: OTHER_UUID });
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 400 when creator_uuid is missing', async () => {
    const res = await request(app).get('/api/links');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });

  it('returns 400 for an invalid creator_uuid', async () => {
    const res = await request(app)
      .get('/api/links')
      .query({ creator_uuid: 'not-a-uuid' });
    expect(res.status).toBe(400);
  });

  it('returns links in descending created_at order', async () => {
    const res = await request(app)
      .get('/api/links')
      .query({ creator_uuid: VALID_UUID });
    const dates = res.body.map((l: { created_at: string }) => new Date(l.created_at).getTime());
    expect(dates).toEqual([...dates].sort((a, b) => b - a));
  });
});
