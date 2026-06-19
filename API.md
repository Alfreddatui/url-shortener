# API Reference

Base URL: `http://localhost:3000` (development)

All request bodies are JSON. All responses are JSON except the redirect endpoint.

---

## Endpoints

### POST /api/links
Shorten a URL.

**Rate limit:** 10 requests / minute per IP

**Request body**
| Field | Type | Required | Description |
|---|---|---|---|
| `url` | string | Yes | The URL to shorten. Must be `http` or `https`. |
| `creator_uuid` | string (UUID v4) | No | Client-generated UUID to associate the link with a user session. |

**Response `201`**
```json
{
  "short_code": "100001",
  "short_url": "http://localhost:3000/100001",
  "original_url": "https://open.gov.sg/",
  "created_at": "2026-06-20T00:00:00.000Z"
}
```

**Errors**
| Status | Reason |
|---|---|
| `400` | Missing or invalid URL (must have `http`/`https` scheme and a hostname) |
| `429` | Rate limit exceeded |
| `500` | Server error |

**curl example**
```bash
curl -X POST http://localhost:3000/api/links \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://open.gov.sg/",
    "creator_uuid": "550e8400-e29b-41d4-a716-446655440000"
  }'
```

---

### GET /:shortCode
Redirect to the original URL.

**Rate limit:** 120 requests / minute per IP

**Response `302`**
Redirects to the original URL.

**Errors**
| Status | Reason |
|---|---|
| `404` | Short code not found |
| `429` | Rate limit exceeded |

**curl example**
```bash
# -L follows the redirect
curl -L http://localhost:3000/100001

# Check the redirect without following it
curl -I http://localhost:3000/100001
```

---

### GET /api/links
Fetch all links created by a user session.

**Rate limit:** 30 requests / minute per IP

**Query params**
| Param | Type | Required | Description |
|---|---|---|---|
| `creator_uuid` | string (UUID v4) | Yes | The UUID stored in the client's localStorage. |

**Response `200`**
```json
[
  {
    "short_code": "100001",
    "short_url": "http://localhost:3000/100001",
    "original_url": "https://open.gov.sg/",
    "created_at": "2026-06-20T00:00:00.000Z"
  }
]
```

**Errors**
| Status | Reason |
|---|---|
| `400` | Missing or invalid `creator_uuid` |
| `429` | Rate limit exceeded |

**curl example**
```bash
curl "http://localhost:3000/api/links?creator_uuid=550e8400-e29b-41d4-a716-446655440000"
```

---

### GET /health
Health check. Verifies the server and database are reachable.

**Response `200`**
```json
{ "status": "ok" }
```

**Response `503`** — database unreachable
```json
{ "status": "unavailable" }
```

**curl example**
```bash
curl http://localhost:3000/health
```

---

## Notes

- **No deduplication** — submitting the same URL twice creates two separate short codes.
- **No authentication** — `creator_uuid` is a client-generated convenience identifier, not a security boundary. See README for details.
- **Links are permanent** — there is no expiry by default.
- **302 not 301** — redirects are intentionally non-cacheable so every click hits the server (required for future analytics).
