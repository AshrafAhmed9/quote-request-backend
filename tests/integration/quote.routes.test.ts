import request from "supertest";
import app from "../../src/app";
import prisma from "../../src/utils/prisma";

beforeAll(async () => {
  await prisma.$connect();
  await prisma.analysisResult.deleteMany();
  await prisma.quoteRequest.deleteMany();
});

afterAll(async () => {
  await prisma.$disconnect();
});

let createdQuoteId: string;

describe("POST /api/quotes", () => {
  it("should create a quote", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .send({
        customer: "Test Corp",
        project: "Test Project",
        estimatedValue: 50000,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.customer).toBe("Test Corp");
    expect(res.body.data.status).toBe("New");
    createdQuoteId = res.body.data.id;
  });

  it("should reject missing customer", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .send({ project: "X", estimatedValue: 100 });

    expect(res.status).toBe(422);
    expect(res.body.error.type).toBe("VALIDATION_ERROR");
  });

  it("should reject negative estimated value", async () => {
    const res = await request(app)
      .post("/api/quotes")
      .send({ customer: "A", project: "B", estimatedValue: -500 });

    expect(res.status).toBe(422);
  });
});

describe("GET /api/quotes", () => {
  it("should return paginated quotes", async () => {
    const res = await request(app).get("/api/quotes");

    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.meta).toHaveProperty("page");
    expect(res.body.meta).toHaveProperty("totalPages");
  });

  it("should support search", async () => {
    const res = await request(app).get("/api/quotes?q=Test");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

describe("GET /api/quotes/:id", () => {
  it("should return quote by id", async () => {
    const res = await request(app).get(`/api/quotes/${createdQuoteId}`);

    expect(res.status).toBe(200);
    expect(res.body.data.id).toBe(createdQuoteId);
  });

  it("should return 404 for unknown id", async () => {
    const res = await request(app).get(
      "/api/quotes/00000000-0000-0000-0000-000000000000"
    );

    expect(res.status).toBe(404);
  });
});

describe("POST /api/quotes/:id/analyze", () => {
  it("should analyze a quote (mock mode)", async () => {
    const res = await request(app).post(
      `/api/quotes/${createdQuoteId}/analyze`
    );

    expect(res.status).toBe(200);
    expect(res.body.data.analysis).toHaveProperty("risk");
    expect(res.body.data.analysis).toHaveProperty("confidence");
    expect(res.body.data.analysis).toHaveProperty("missingItems");
  });
});

describe("PATCH /api/quotes/:id/status", () => {
  it("should update status with valid transition", async () => {
    const res = await request(app)
      .patch(`/api/quotes/${createdQuoteId}/status`)
      .send({ status: "In Review", version: 1 });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("In Review");
  });

  it("should reject invalid transition", async () => {
    const res = await request(app)
      .patch(`/api/quotes/${createdQuoteId}/status`)
      .send({ status: "New", version: 2 });

    expect(res.status).toBe(409);
  });
});

describe("GET /api/health", () => {
  it("should return healthy", async () => {
    const res = await request(app).get("/api/health");

    expect(res.status).toBe(200);
    expect(res.body.status).toBe("healthy");
  });
});
