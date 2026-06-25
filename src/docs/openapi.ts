export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Quote Request Management API",
    description:
      "Backend service for managing quote requests with FastAPI document analysis integration.",
    version: "1.0.0",
  },
  servers: [{ url: "/api", description: "API base path" }],
  paths: {
    "/quotes": {
      get: {
        summary: "List all quotes",
        tags: ["Quotes"],
        parameters: [
          {
            name: "page",
            in: "query",
            schema: { type: "integer", default: 1 },
          },
          {
            name: "limit",
            in: "query",
            schema: { type: "integer", default: 10, maximum: 100 },
          },
          { name: "q", in: "query", schema: { type: "string" } },
          {
            name: "status",
            in: "query",
            schema: {
              type: "string",
              enum: ["New", "In Review", "Needs Info", "Completed"],
            },
          },
        ],
        responses: {
          "200": { description: "Paginated list of quotes" },
        },
      },
      post: {
        summary: "Create a new quote",
        tags: ["Quotes"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["customer", "project", "estimatedValue"],
                properties: {
                  customer: { type: "string", minLength: 1 },
                  project: { type: "string", minLength: 1 },
                  estimatedValue: { type: "number", minimum: 0 },
                  status: {
                    type: "string",
                    enum: ["New", "In Review", "Needs Info", "Completed"],
                    default: "New",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": { description: "Quote created" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/quotes/{id}": {
      get: {
        summary: "Get quote by ID with latest analysis",
        tags: ["Quotes"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Quote details with latest analysis" },
          "404": { description: "Quote not found" },
        },
      },
    },
    "/quotes/{id}/analyze": {
      post: {
        summary: "Trigger document analysis via FastAPI",
        tags: ["Analysis"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        responses: {
          "200": { description: "Combined quote and analysis result" },
          "404": { description: "Quote not found" },
          "502": { description: "Invalid response from FastAPI" },
          "503": { description: "FastAPI service unavailable" },
        },
      },
    },
    "/quotes/{id}/status": {
      patch: {
        summary: "Update quote status",
        tags: ["Quotes"],
        parameters: [
          { name: "id", in: "path", required: true, schema: { type: "string" } },
        ],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["status", "version"],
                properties: {
                  status: {
                    type: "string",
                    enum: ["New", "In Review", "Needs Info", "Completed"],
                  },
                  version: { type: "integer", minimum: 1 },
                },
              },
            },
          },
        },
        responses: {
          "200": { description: "Status updated" },
          "404": { description: "Quote not found" },
          "409": { description: "Conflict — invalid transition or stale version" },
          "422": { description: "Validation error" },
        },
      },
    },
    "/health": {
      get: {
        summary: "Health check",
        tags: ["System"],
        responses: {
          "200": { description: "Service healthy" },
          "503": { description: "Service unhealthy" },
        },
      },
    },
  },
};
