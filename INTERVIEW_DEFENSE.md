# Interview Defense Guide

Quick reference for defending every design decision. Read this before your interview.

---

## "Walk me through the analyze flow"

1. Client hits `POST /api/quotes/:id/analyze`
2. Controller receives it, calls `analysisService.analyzeAndSave(id)`
3. Service first checks the quote exists via `quoteRepository.findById()` — if not, throws `NotFoundError` (404)
4. Service calls `analyzeQuote(quoteId)` in `fastapi.client.ts`
5. The client makes an HTTP POST to the FastAPI `/analyze` endpoint with the quote_id
6. If FastAPI is down → retry with backoff → eventually throw `UpstreamServiceError` (503)
7. If FastAPI responds → Zod-validate the response body against `FastApiResponseSchema`
8. If validation fails → throw `BadGatewayError` (502) — never save bad data
9. If valid → `analysisRepository.create()` persists the result
10. Return combined quote + analysis to the client

**Key point:** The quote's status doesn't change on analysis. Analysis is data gathering; status changes are a separate business action.

## "Why optimistic locking instead of pessimistic?"

Pessimistic locking (`SELECT ... FOR UPDATE`) holds a database lock while the transaction is open. If a user reads a quote, goes to lunch, then submits — the lock was held the whole time, blocking everyone else. With optimistic locking, there's zero cost on the happy path. We only check at write time. For a system where reads vastly outnumber concurrent writes to the same row, this is the right trade-off.

Also: SQLite doesn't support `SELECT FOR UPDATE` — another reason optimistic locking is the practical choice here.

## "Why store all analyses?"

Cheapest correct decision. Analysis results are tiny (50 bytes). If we only store the latest, we lose the ability to see risk trends, audit past decisions, or debug when a customer asks "why did the risk change?" Deleting data is always easier than recreating it.

## "Why Zod for validation?"

Single source of truth. The same Zod schema validates incoming requests, generates TypeScript types (via `z.infer`), and validates upstream FastAPI responses. No drift between what the API accepts, what TypeScript expects, and what we store.

## "What if the FastAPI service changes its response format?"

The Zod validation catches it immediately. `FastApiResponseSchema` validates every response before we persist it. If FastAPI adds, removes, or renames a field, we get a 502 instead of corrupted data. The fix is: update the schema, test, deploy.

## "Why Express over Fastify/Koa/Hono?"

The assignment specified Express as preferred. In production, I'd consider Fastify for its schema-based validation and better performance benchmarks. But Express has the largest ecosystem, most middleware, and the team likely already knows it — reducing onboarding friction.

## "Why SQLite?"

Zero-config demo. The reviewer runs `npm run setup && npm run dev` and it works. No Docker, no Postgres install, no connection strings. The Prisma schema is database-agnostic — changing one env var switches to PostgreSQL.

## "Why not add authentication?"

Out of scope for this assignment, and adding it without the requirement would signal poor scoping judgment. In production, I'd add JWT middleware as a wrapper around the route groups — the controller/service/repository layers don't change.

## "Explain the status machine"

```
New → In Review, Needs Info
In Review → Needs Info, Completed  
Needs Info → In Review
Completed → (terminal, nothing)
```

Defined in `statusMachine.ts`. Before any status update, the service checks `isValidTransition(currentStatus, newStatus)`. Invalid transition → 409 with a message listing what's allowed. This prevents data from entering impossible states even if the client has a bug.

## Common follow-ups

**"How would you add a new status?"** → Add it to the Zod enum in `schemas.ts`, add transitions in `statusMachine.ts`, run migration if needed. Two files, five minutes.

**"How would you add caching?"** → Redis cache in the repository layer. Cache on read, invalidate on write. The service layer doesn't know or care.

**"How would you deploy this?"** → Docker image → container registry → Kubernetes/ECS. The Dockerfile uses multi-stage build (builder + runtime) to keep the image small. Health endpoint at `/api/health` for readiness/liveness probes.

**"What was the hardest part?"** → Getting the optimistic locking right with Prisma. `updateMany` with a `where` clause on both `id` and `version` is the trick — it returns a count, and if the count is 0, someone else got there first. Prisma doesn't have a built-in optimistic lock, so you have to build it yourself.
