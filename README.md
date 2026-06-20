# OGP URL Shortener

A production-ready URL shortening service. Paste a long URL, get a short one. Click the short one, get redirected.

**Stack:** TypeScript · Node.js · Express · PostgreSQL · React · Vite · Tailwind CSS

**Live demo:** https://url-shortener-gilt-nu-33.vercel.app

---

## Quick Start

**Prerequisites:** Node.js 20+, Docker Desktop

```bash
git clone https://github.com/Alfreddatui/url-shortener.git
cd url-shortener
npm install && npm run install:all
```

**Configure your database credentials** — edit both files before starting:

```bash
cp .env.example .env
cp server/.env.example server/.env
```

Open `.env` and set:
```
DB_NAME=urlshortener
DB_USER=postgres
DB_PASSWORD=yourpassword
```

Open `server/.env` and set (same credentials):
```
DATABASE_URL=postgres://postgres:yourpassword@localhost:5432/urlshortener
```

```bash
docker compose up -d
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000
- Health: http://localhost:3000/health

See [API.md](./API.md) for full endpoint documentation and curl examples.

---

## Project Structure

```
url-shortener/
├── docker-compose.yml     # PostgreSQL container (dev)
├── server/                # Express API
│   ├── migrations/        # SQL migration files (run on startup)
│   ├── vitest.config.ts   # Test config — redirects DATABASE_URL to test DB
│   └── src/
│       ├── app.ts         # Express app (exported for testing)
│       ├── index.ts       # Entry point — runs migrations, starts server
│       ├── kgs.ts         # Key Generation Service
│       ├── db.ts          # pg pool + migration runner
│       ├── routes/
│       │   ├── links.ts   # POST /api/links, GET /api/links
│       │   └── redirect.ts # GET /:shortCode
│       └── __tests__/
│           ├── globalSetup.ts   # Creates test DB, runs migrations
│           ├── setup.ts         # Truncates links table before each test
│           ├── kgs.test.ts
│           ├── links.test.ts
│           └── redirect.test.ts
└── client/                # React frontend (Vite)
    ├── vitest.config.ts   # Test config — jsdom environment
    └── src/
        ├── App.tsx
        ├── setupTests.ts  # jest-dom matchers + afterEach cleanup
        ├── components/
        │   ├── ShortenForm.tsx
        │   └── LinkList.tsx
        └── __tests__/
            ├── ShortenForm.test.tsx
            └── LinkList.test.tsx
```

---

## Design Decisions

### Why 302 and not 301?

301 is a permanent redirect — browsers cache it indefinitely. Once a browser caches a 301, it will redirect the user locally without ever hitting our server again. This breaks two things:

1. **Analytics** — we can never count clicks if browsers skip us
2. **Mutability** — if a destination URL ever needs to change, cached 301s on client machines are impossible to invalidate

302 (Found / temporary redirect) is non-cacheable by default. Every click hits our server. This is the correct choice for a URL shortener where analytics and future mutability matter.

---

### Key Generation Service (KGS)

The KGS is an **in-process class** with two methods: `generate(id)` and `resolve(code)`. It is deliberately not a separate microservice — the interface is clean enough to extract later if needed, but doing so now would add network latency and operational complexity with no benefit at this scale.

**Why auto-increment ID → base62 instead of random strings?**

Random strings require collision detection: generate a code, check if it exists in the DB, retry if it does. The probability per insert is low but non-zero, and grows with scale:

| Links stored | Collision probability per insert (6-char base62) |
|---|---|
| 100,000 | 0.00018% |
| 1,000,000 | 0.0018% |
| 10,000,000 | 0.018% |

Under high write load, retries become a bottleneck. Auto-increment ID → base62 is **collision-free by construction** — no retry logic, no race conditions, no extra DB round-trip.

The trade-off: codes are sequential and therefore guessable. This is acceptable because all links are public URLs — there is nothing sensitive to protect by making codes unguessable.

**Why the `62^5` offset?**

Without an offset, the first link would have code `"1"` and the tenth `"A"`. These single-character codes look unprofessional. Adding `62^5` (916,132,832) to every ID before encoding ensures all codes are at least 6 characters, starting from `"100001"`.

**Maximum capacity**

PostgreSQL's `SERIAL` (32-bit) supports up to 2,147,483,647 rows. In base62 that is 6 characters (`"2LKcb1"`). `VARCHAR(12)` on `short_code` gives ample headroom even for a future upgrade to `BIGSERIAL` (64-bit), which would need at most 11 characters.

---

### Rate Limiting

Rate limits are applied **per route** because each endpoint has a different risk profile:

| Endpoint | Limit | Reasoning |
|---|---|---|
| `POST /api/links` | 10 / min | Prevent spam creation |
| `GET /api/links` | 30 / min | DB query, prevent scraping |
| `GET /:shortCode` | 120 / min | High legitimate traffic, caps enumeration |

All limits are keyed on **IP address**, not `creator_uuid`. The UUID is client-controlled — a malicious user could rotate UUIDs trivially, making UUID-based rate limiting useless.

**Known trade-offs:**

- *Fixed window, not sliding window* — the boundary burst problem means a user could send 2× the limit in a short window straddling a reset. A sliding window (e.g., via Redis sorted sets) would be more accurate.
- *In-memory store* — limits are not shared across server instances. In a multi-instance deployment, each instance has its own counter, effectively multiplying the limit by the number of instances. The production fix is a shared Redis store (`rate-limit-redis`).

---

### URL Validation

Validation uses the native `URL` constructor and checks that the scheme is `http` or `https` and the hostname is non-empty. **We deliberately do not fetch or resolve the destination URL.** Making an outbound HTTP request to validate a user-supplied URL is an SSRF (Server-Side Request Forgery) vulnerability — an attacker could supply `http://169.254.169.254/latest/meta-data/` and probe internal infrastructure.

Syntactic validation is sufficient: we trust the user knows what URL they want to shorten.

---

### "My Links" and UUID — Not Authentication

When a user first visits the app, the browser generates a UUID v4 via `crypto.randomUUID()` and stores it in `localStorage`. This UUID is sent with every `POST /api/links` request and used to retrieve the user's link history via `GET /api/links?creator_uuid=...`.

**This is not authentication.** It is a convenience feature so users can see their previously created links in the same browser session. Specific implications:

- Anyone who knows your UUID can retrieve your link list
- A new device or cleared `localStorage` produces a new UUID — link history is lost
- The UUID is 122 bits of randomness (UUIDv4), making it practically unguessable — but it is not a security boundary

**Why not add real auth?** The core value of a URL shortener is speed — no sign-up friction. The data being protected (a list of public URLs) does not justify requiring authentication in v1.

**v2 consideration:** Replace `creator_uuid` with an email OTP or OAuth session. The `creator_uuid` column in the DB already stores a UUID, so migrating to a proper user ID is a schema-compatible change.

---

### No Deduplication

Submitting the same long URL twice creates two separate short codes. Deduplication would require either a unique index on `original_url` (preventing multiple users from shortening the same URL independently) or a per-user dedup check (an extra query on every create). Neither is worth the complexity for v1. If a user submits the same URL twice, they get two short codes — a minor UX annoyance, not a correctness issue.

---

### No Link Expiry (v1)

Links are permanent by default. Expiry is intentionally left out of v1 — permanent links are the simpler and more useful default for most use cases. A future implementation would add an optional `expires_at TIMESTAMPTZ` column and a cleanup worker that periodically runs `DELETE FROM links WHERE expires_at < NOW()`. The redirect route would gain a `AND (expires_at IS NULL OR expires_at > NOW())` clause.

---

### Accessibility

By 2030, 25% of Singapore's population will be 65 or older. For a government digital service, accessibility is not optional — it directly determines whether the product serves everyone or excludes a significant demographic. The frontend includes ARIA live regions, semantic landmarks, keyboard navigation support, and a skip-to-content link so the experience works for screen reader users and keyboard-only users, not just mouse users.

---

## Development Approach

The project was built in deliberate layers: schema first, then business logic (KGS), then API routes, then the frontend on top. DB credentials were moved out of `docker-compose.yml` early after recognising that hardcoding them is a bad habit even in local dev. The API was documented before the frontend was started — the same handoff a backend team would give a frontend team. Each commit is tagged `[URL-XX][layer]` so the git log tells the story of the build.

---

## Testing

Server tests (requires Docker postgres running):

```bash
npm test --prefix server
```

Client tests (no server needed):

```bash
npm test --prefix client
```

**Server tests** (`server/src/__tests__/`):
- `kgs.test.ts` — unit tests for the Key Generation Service: encode, decode, roundtrip, edge cases
- `links.test.ts` — integration: POST validation, GET by UUID, rate-limit headers, ordering
- `redirect.test.ts` — integration: 302 redirect, 404 for unknown codes

Integration tests run against a dedicated `urlshortener_test` database. `vitest.config.ts` derives the credentials from `server/.env` and overrides the database name — no separate test credentials needed. Migrations are applied automatically by `globalSetup.ts` before the first test, and the `links` table is truncated before each test for isolation.

**Client tests** (`client/src/__tests__/`):
- `ShortenForm.test.tsx` — renders, submits, shows result, shows error, aria-invalid, Copy button
- `LinkList.test.tsx` — renders links, handles empty state, refetches on new link

API calls are mocked with `vi.spyOn` — client tests run entirely in jsdom with no server required.

---

## Deployment (EC2 + Terraform)

The production stack runs three Docker containers behind Nginx: **postgres** (database), **server** (Express API), **nginx** (React static files + reverse proxy). Infrastructure is provisioned with Terraform.

### Architecture

```
Internet → EC2 port 80
  └── nginx container
        ├── /api/*                       → proxy → server:3000 (Express)
        ├── /health                      → proxy → server:3000
        ├── /:shortCode (6–12 base62)    → proxy → server:3000
        └── everything else              → React static files
```

Short codes are distinguished from React routes by a regex (`^/[0-9A-Za-z]{6,12}$`) in `client/nginx.conf`. All redirect logic stays server-side.

### Prerequisites

- [Terraform](https://developer.hashicorp.com/terraform/install) installed
- AWS credentials configured (`aws configure`)
- An EC2 key pair created in your AWS account (EC2 → Key Pairs → Create, `.pem` format)

### Deploy

```bash
cd terraform

# 1. Copy and fill in your values
cp terraform.tfvars.example terraform.tfvars
# Edit terraform.tfvars — set key_pair_name and db_password at minimum

# 2. Initialise Terraform and preview changes
terraform init
terraform plan

# 3. Provision infrastructure (~2 min)
terraform apply

# Terraform prints the outputs:
#   app_url     = "http://<elastic-ip>"
#   ssh_command = "ssh ubuntu@<elastic-ip>"
```

The EC2 instance bootstraps itself on first boot: installs Docker, clones the repo, writes the `.env`, and runs `docker compose -f docker-compose.prod.yml up --build`. Allow ~3 minutes after `apply` for the app to be reachable.

```bash
# Verify (allow ~3 min after apply for Docker build to complete)
curl http://<elastic-ip>/health   # → {"status":"ok"}
```

> **Note:** Once deployed, update `BASE_URL` and `CLIENT_URL` in `/app/.env` on the EC2 instance to use your domain or IP, then restart with `docker compose -f docker-compose.prod.yml up -d --build`.

### Updating the deployment

```bash
ssh ubuntu@<elastic-ip>
cd /app && git pull
docker compose -f docker-compose.prod.yml up -d --build
```

The server runs migrations on startup, so schema changes apply automatically.

### SSL (HTTPS) with Let's Encrypt

Point a domain at the Elastic IP, then SSH in and run:

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

Update `BASE_URL` and `CLIENT_URL` in `/app/.env` to `https://yourdomain.com`, then restart:

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

### Tear down

```bash
terraform destroy
```

---

## Future Work

- **Link expiry** — add `expires_at TIMESTAMPTZ DEFAULT NULL` column, check on redirect, cleanup worker
- **Click analytics** — record each redirect hit in a `link_clicks` table for time-series reporting
- **Redis rate limiting** — share rate limit state across instances using `rate-limit-redis`
- **Sliding window rate limiter** — replace fixed window to eliminate the boundary burst vulnerability
- **Optional authentication** — let users optionally sign in (email OTP or OAuth) to persist their links across devices. The UUID flow stays for anonymous, frictionless use — auth would be an opt-in addition, not a replacement
- **CDN for redirects** — put a CDN in front of the redirect endpoint to cache 302s at the edge, reducing latency for popular short links without hitting the server
