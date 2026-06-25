# Quote Request Management API

A backend service for managing engineering quote requests with integrated AI-powered document analysis via FastAPI.

Built with **Node.js**, **TypeScript**, **Express**, **Prisma ORM**, and **FastAPI**.

## Architecture

```
┌──────────────┐     ┌──────────────────────────────────────────────┐
│   Client     │────▶│  Express API (Node.js + TypeScript)          │
│  (Postman)   │     │                                              │
└──────────────┘     │  ┌────────────┐  ┌────────────┐  ┌────────┐ │     ┌──────────────┐
                     │  │ Controller │─▶│  Service   │─▶│  Repo  │─┼────▶│  SQLite DB   │
                     │  └────────────┘  └─────┬──────┘  └────────┘ │     │  (Prisma)    │
                     │                        │                    │     └──────────────┘
                     │                        ▼                    │
                     │                 ┌──────────────┐            │     ┌──────────────┐
                     │                 │ FastAPI      │────────────┼────▶│  FastAPI      │
                     │                 │ Client       │            │     │  (Python)     │
                     │                 │ (retry/mock) │            │     │  /analyze     │
                     │                 └──────────────┘            │     └──────────────┘
                     └──────────────────────────────────────────────┘
```

**Layering rationale:**
- **Controllers** handle HTTP I/O only (parse request, send response)
- **Services** contain business logic (status machine, orchestration, validation rules)
- **Repositories** abstract database access (swap DB without touching logic)
- **Clients** manage external service communication (timeout, retry, schema validation)

## Quick Start

### Option 1: Local (recommended for review)

```bash
# Install and set up
npm run setup

# Start the server
npm run dev
```

The server runs at `http://localhost:3000`. API docs at `http://localhost:3000/docs`.

### Option 2: Docker

```bash
docker compose up --build
```

This starts both the Node.js API and the FastAPI analysis service.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3000` | Server port |
| `NODE_ENV` | `development` | Environment |
| `DATABASE_URL` | `file:./dev.db` | Prisma database URL |
| `FASTAPI_URL` | `http://localhost:8000` | FastAPI service URL |
| `FASTAPI_TIMEOUT` | `10000` | FastAPI request timeout (ms) |
| `FASTAPI_MOCK_ENABLED` | `true` | Use mock FastAPI responses |

To switch to PostgreSQL, change `DATABASE_URL` to a Postgres connection string and update `provider` in `prisma/schema.prisma`.

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check with DB ping |
| `GET` | `/api/quotes` | List quotes (paginated, searchable) |
| `GET` | `/api/quotes/:id` | Get quote with latest analysis |
| `POST` | `/api/quotes` | Create a new quote |
| `POST` | `/api/quotes/:id/analyze` | Trigger FastAPI analysis |
| `PATCH` | `/api/quotes/:id/status` | Update quote status |
| `GET` | `/docs` | Swagger UI |

### Query Parameters (GET /api/quotes)

- `page` (default: 1) — Page number
- `limit` (default: 10, max: 100) — Items per page
- `q` — Search customer or project name
- `status` — Filter by status: `New`, `In Review`, `Needs Info`, `Completed`

### Status Transitions

```
New ──────────▶ In Review ──────────▶ Completed
 │                  │
 ▼                  ▼
Needs Info ◀───── Needs Info
    │
    ▼
 In Review
```

Only valid transitions are allowed. Invalid transitions return `409 Conflict`.

### Optimistic Locking

The `PATCH /api/quotes/:id/status` endpoint requires a `version` field. If another user has modified the quote since you read it, you'll get a `409 Conflict` with a message to refresh and retry. This prevents lost updates from concurrent edits.

## Error Handling

All errors follow a consistent RFC 7807-inspired format:

```json
{
  "error": {
    "type": "NOT_FOUND",
    "title": "NotFoundError",
    "status": 404,
    "detail": "Quote with id 'abc' not found",
    "requestId": "550e8400-e29b-41d4-a716-446655440000"
  }
}
```

| Code | When |
|---|---|
| `422` | Validation error (missing fields, negative value, invalid status) |
| `404` | Quote not found |
| `409` | Invalid status transition or stale version |
| `502` | FastAPI returned invalid/unparseable response |
| `503` | FastAPI is down or timed out |
| `429` | Rate limit exceeded |

## Testing

```bash
npm test              # All tests
npm run test:unit     # Unit tests only
npm run test:integration  # Integration tests only
```

## Project Structure

```
src/
├── config/env.ts              # Zod-validated environment
├── controllers/               # HTTP handlers (thin)
├── routes/                    # Express routers
├── services/                  # Business logic
├── repositories/              # Database access (Prisma)
├── clients/fastapi.client.ts  # Upstream service client
├── models/schemas.ts          # Zod schemas (single source of truth)
├── middleware/                # Request ID, logger, validation, errors
├── utils/                     # Error classes, status machine, pagination
└── docs/openapi.ts            # Swagger specification
```

## Design Decisions

- **SQLite for zero-friction review** — one env var switches to PostgreSQL. No Docker/Postgres required to evaluate the submission.
- **Store all analyses, return latest** — `AnalysisResult` is one-to-many for audit trail and reproducibility. GET returns only the most recent.
- **Optimistic locking over pessimistic** — `version` field avoids database-level locks while preventing lost updates. Scales better for read-heavy workloads.
- **FastAPI client with schema validation** — upstream responses are Zod-validated before storage. Malformed JSON returns 502, never corrupts the database.
- **Mock fallback** — the stack runs fully without Python/FastAPI via `FASTAPI_MOCK_ENABLED=true`.

## What I Intentionally Did Not Build (and why)

- **Message queue / async processing** — at this scale, synchronous with a timeout is simpler and correct. Documented the production pattern (202 + job polling) in the design questions.
- **Authentication** — out of scope for this assignment. Would add JWT middleware as the first production step.
- **Caching** — with SQLite and small data volumes, the overhead of a cache layer adds complexity without measurable benefit.

## Tech Stack

Node.js · TypeScript (strict) · Express · Prisma · SQLite · Zod · Axios · Pino · Helmet · Swagger UI · Jest · Supertest · Docker · FastAPI (Python)
