# Backend Internship Assignment — Submission

## Section 0: Profile Info

- **Name:** K Ashraf Ahmed
- **Phone:** 9901916318
- **Email:** ashrafahmed1232@gmail.com

---

## Design Questions

### Q1. Why did you separate controllers, services and repositories?

To keep things clean and testable. Controllers just handle the HTTP stuff — what comes in, what goes out. Services have the actual business logic like checking if a status transition is valid. Repositories are the only ones that talk to the database.

The big win is testing. I can test my service logic by mocking the repository — no database needed. And if we ever swap SQLite for PostgreSQL, only the repository layer changes. Everything else stays the same.

### Q2. If FastAPI takes 30 seconds to respond, should the client wait? If not, what would you do?

Definitely not. No user should wait 30 seconds for an API call.

Right now I have a 10-second timeout with retry. If it fails, the client gets a 503 right away.

For production I'd make it async — the analyze endpoint returns 202 immediately with a job ID, pushes the work to a queue (something like BullMQ + Redis), and a background worker handles the actual FastAPI call. The client can poll the quote endpoint to see when the analysis shows up.

### Q3. Suppose FastAPI returns invalid JSON. How should your backend behave?

Don't trust it. I validate every FastAPI response with Zod before touching the database. If the response doesn't match the expected shape:

- Return 502 Bad Gateway (it's the upstream's fault, not ours)
- Log the details with the request ID so we can debug it
- Don't save anything — bad data in the database is worse than no data

### Q4. If there are 500,000 quote requests, how would you improve performance?

A few things, roughly in order of impact:

1. Switch from offset to cursor-based pagination — offset gets slow on large datasets
2. I already added indexes on `status` and `createdDate` which helps a lot
3. Only select the fields we actually need instead of full rows
4. Move to PostgreSQL with connection pooling (SQLite has a single-writer limit)
5. Add Redis caching for frequently read quotes
6. Read replicas for GET requests
7. Archive old analysis results to keep the table small

### Q5. Suppose two users update the same quote simultaneously. How would you prevent inconsistent data?

I use optimistic locking. Every quote has a `version` field. When you update a quote, you send the version you read. The database query does `UPDATE WHERE id = ? AND version = ?`. If someone else already changed it, version won't match, zero rows update, and you get a 409 Conflict telling you to refresh and try again.

I picked optimistic over pessimistic locking because this isn't a high-contention system. Most quotes won't have two people editing at the same time. Optimistic locking costs nothing on the happy path.

On top of that, the status state machine blocks invalid transitions regardless — you can't go from Completed back to New even if the version matches.

### Q6. Would you store every FastAPI analysis or only the latest? Explain.

I store every one. The AnalysisResult table is one-to-many with QuoteRequest. The API just returns the latest one by default.

Why keep them all? If a risk score changes from Low to High, someone's going to ask what happened. Having the history answers that without extra work. Analysis results are tiny so storage isn't an issue. And it's always easier to delete old data later than to recreate data you never saved.

### Q7. Where would you place business rules (controller, service or database)? Why?

Service layer. That's where the status machine, the analyze flow, and the optimistic lock check all live.

Controllers should just be the HTTP translation layer — if I wanted to add a CLI or GraphQL later, I shouldn't have to rewrite business logic. And putting rules in database triggers or stored procedures makes them invisible, hard to test, and locks you into one database engine.

Simple stuff like non-null constraints and foreign keys are fine in the schema — those are data integrity, not business rules.

---

## AI Usage Reflection

### 1. Did you use AI tools?
Yes. I used Claude to speed up the boilerplate and scaffolding parts.

### 2. Which sections used AI?
- Project setup (package.json, tsconfig, Prisma config, Express wiring)
- Boilerplate middleware structure (request ID, error handler skeleton)
- Postman collection
- OpenAPI spec layout

### 3. What did I implement myself?
- Architecture decisions — the layering, where each piece lives
- Status state machine and transition rules
- Optimistic locking approach (version field + updateMany)
- FastAPI client — retry logic, Zod validation of upstream responses, mock fallback
- Error handling strategy (which HTTP codes for which failures)
- Decision to store all analyses, not just the latest
- Design question answers — these are my own thinking
- What to test and why

### 4. What design decisions were mine?
All the architectural stuff — layered structure, optimistic locking, storing full analysis history, validating upstream responses with Zod, the state machine, RFC 7807 error format. I used AI as a productivity tool, not a decision-maker.

### 5. What would I improve with one more day?
- Make the analyze endpoint truly async with a job queue
- Add JWT authentication
- Write end-to-end tests against the real FastAPI service
- Switch to cursor-based pagination
- Add API versioning (like `/api/v1/quotes`)
