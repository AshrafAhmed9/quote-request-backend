# Backend Internship Assignment — Submission

## Section 0: Profile Info

- **Name:** K Ashraf Ahmed
- **Phone:** 9901916318
- **Email:** ashrafahmed1232@gmail.com

---

## Design Questions

### Q1. Why did you separate controllers, services and repositories?

Each layer has one job. Controllers handle HTTP — parsing request params, sending response codes. Services contain business rules — the status machine, orchestrating the analyze flow, applying validation logic. Repositories talk to the database through Prisma and nothing else.

This matters for three practical reasons. First, I can unit test services by mocking repositories — no database needed. Second, if we switch from SQLite to PostgreSQL (or a different ORM), only the repository layer changes. Third, controllers stay thin enough that a new developer can read a route and immediately know what it does without wading through database queries.

In this project: `quote.controller.ts` calls `quoteService.updateStatus()`, which checks the status machine, then calls `quoteRepository.updateStatus()` which does the Prisma query with optimistic locking. Each piece is independently testable.

### Q2. If FastAPI takes 30 seconds to respond, should the client wait? If not, what would you do?

No. A 30-second HTTP request is unacceptable for the client.

Currently, the FastAPI client has a configurable timeout (default 10s) with retry and backoff. If it times out, the client gets a `503` immediately rather than hanging.

For production, I would make the analyze endpoint asynchronous:
1. `POST /quotes/:id/analyze` returns `202 Accepted` with a `jobId` immediately
2. The analysis request goes into a job queue (Bull/BullMQ with Redis)
3. A background worker picks it up, calls FastAPI, stores the result
4. The client polls `GET /quotes/:id` to check if the analysis has arrived, or we send a webhook

This decouples the client's experience from FastAPI's response time. The queue also gives us retry semantics, dead-letter handling, and backpressure for free.

### Q3. Suppose FastAPI returns invalid JSON. How should your backend behave?

Never trust upstream. In `fastapi.client.ts`, I Zod-validate every response from FastAPI against `FastApiResponseSchema` before doing anything with it. If validation fails:

1. Return `502 Bad Gateway` to the client — not 500, because the fault is upstream, not ours
2. Log the raw response body and the validation errors with the `requestId` for debugging
3. Do NOT write anything to the database — partially valid data is worse than no data

The client gets a clear error they can report. The ops team gets a log trail. The database stays clean.

### Q4. If there are 500,000 quote requests, how would you improve performance?

Several concrete changes, ordered by impact:

1. **Cursor-based pagination** instead of offset — offset pagination degrades at high page numbers because the DB still scans skipped rows. Cursor pagination (`WHERE createdDate < ?`) is constant-time.
2. **Database indexes** — already added on `status` and `createdDate` (the two fields we filter and sort by). For 500k rows, this is the difference between a full table scan and an index lookup.
3. **Select only needed fields** — use Prisma `select` instead of returning entire rows when listing quotes.
4. **Connection pooling** — switch to PostgreSQL with PgBouncer. SQLite has a single-writer bottleneck.
5. **Read replicas** — route GET requests to replicas, writes to primary.
6. **Caching** — Redis cache for frequently accessed quotes with short TTL. Invalidate on write.
7. **Archive old analyses** — move analyses older than N months to cold storage. Keep the table lean.

### Q5. Suppose two users update the same quote simultaneously. How would you prevent inconsistent data?

I use optimistic locking with a `version` field. Here is how it works:

1. User A reads quote (version: 1). User B reads the same quote (version: 1).
2. User A sends `PATCH` with `status: "In Review", version: 1`. The repository does `updateMany WHERE id = ? AND version = 1`, then increments version to 2. Succeeds — 1 row updated.
3. User B sends `PATCH` with `status: "Needs Info", version: 1`. Same query: `WHERE id = ? AND version = 1`. But version is now 2. Zero rows updated → return `409 Conflict` with a message: "Quote was modified by another request. Please refresh and try again."

Why optimistic over pessimistic? This is a low-contention system — most quotes are not being edited simultaneously. Pessimistic locks (`SELECT FOR UPDATE`) hold database locks that block other readers and scale poorly. Optimistic locking has zero overhead on the happy path and only rejects on actual conflicts.

Additionally, the status state machine prevents illegal transitions regardless of locking — you cannot go from `Completed` back to `New` even if the version matches.

### Q6. Would you store every FastAPI analysis or only the latest? Explain.

I store every analysis. The `AnalysisResult` table has a one-to-many relationship with `QuoteRequest`. When returning a quote via GET, I include only the latest analysis for simplicity.

Reasons:
- **Audit trail** — if a quote's risk assessment changes from "Low" to "High", stakeholders will want to know when and why. Keeping history makes this possible without additional infrastructure.
- **Reproducibility** — re-running analysis may produce different results (the AI model may be updated). Storing previous results lets us compare.
- **Cheap to store** — analysis results are small (a string, a number, a short array). The storage cost is negligible compared to the value of having the history.
- **Easy to clean up later** — if storage becomes a concern at scale, we can archive old analyses. It is harder to recreate data we never stored.

The API returns the latest by default (`ORDER BY analyzedAt DESC LIMIT 1`), so clients are unaffected by the history.

### Q7. Where would you place business rules (controller, service or database)? Why?

Service layer. In this project, all business rules live in `quote.service.ts` and `analysis.service.ts`.

- **Not in controllers** — controllers should only translate HTTP to function calls. If business rules live there, they cannot be reused from a CLI tool, a background worker, or a different transport layer (e.g. GraphQL).
- **Not in the database** — database triggers and stored procedures are invisible, hard to test, hard to version, and tightly couple you to a specific database engine. We want to be able to switch from SQLite to PostgreSQL without rewriting business logic.
- **In services** — they are pure TypeScript functions that take data in and return results. They can be unit tested with mocked repositories (no DB needed). The status machine, the analyze-and-save orchestration, and the optimistic lock check all live here.

The exception: I put simple constraints in the schema (non-null fields, foreign keys, cascading deletes) because those are data integrity rules, not business rules. The database should enforce structural correctness; the service layer should enforce domain correctness.

---

## AI Usage Reflection

### 1. Did you use AI tools?
Yes. I used Claude to accelerate scaffolding and boilerplate generation.

### 2. Which sections used AI?
- Initial project scaffolding (package.json, tsconfig, Prisma setup, Express wiring)
- Boilerplate middleware (request-id, error handler structure)
- Postman collection generation
- OpenAPI spec structure

### 3. What did I implement myself?
- The overall architecture decisions (layering, where each responsibility lives)
- The status state machine and its transition rules
- The optimistic locking strategy (version field + updateMany pattern)
- The FastAPI client design (retry with backoff, Zod schema validation of upstream responses, mock fallback)
- The error taxonomy (which HTTP codes map to which failure modes)
- The one-to-many analysis storage decision
- All design question answers (these reflect my actual understanding)
- Test case design (what to test and why)

### 4. What design decisions were mine?
All architectural decisions were mine: the layered structure, optimistic over pessimistic locking, storing all analyses vs. only the latest, making the FastAPI client validate upstream responses with Zod, the status state machine with defined transitions, and RFC 7807-style error responses.

### 5. What would I improve with one more day?
- **Async analysis with a job queue** — BullMQ + Redis, return 202 + polling endpoint
- **End-to-end tests** against a real running server with the real FastAPI service
- **Authentication** — JWT middleware with role-based access
- **Request/response logging to a file** for production observability
- **Cursor-based pagination** for better performance at scale
- **API versioning** (e.g. `/api/v1/quotes`) for future evolution
