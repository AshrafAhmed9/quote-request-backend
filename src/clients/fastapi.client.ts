import axios, { AxiosError } from "axios";
import { env } from "../config/env";
import { FastApiResponseSchema, FastApiResponse } from "../models/schemas";
import { UpstreamServiceError, BadGatewayError } from "../utils/errors";
import { logger } from "../middleware/logger.middleware";

const RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 500;

const client = axios.create({
  baseURL: env.FASTAPI_URL,
  timeout: env.FASTAPI_TIMEOUT,
  headers: { "Content-Type": "application/json" },
});

function mockAnalysis(quoteId: string): FastApiResponse {
  const risks = ["Low", "Medium", "High"];
  const allMissing = [
    "Structural drawings",
    "Load requirements",
    "Site survey",
    "Environmental assessment",
    "Budget breakdown",
    "Timeline estimate",
  ];
  const risk = risks[Math.floor(Math.random() * risks.length)];
  const count = Math.floor(Math.random() * 3) + 1;
  const missing = allMissing.sort(() => 0.5 - Math.random()).slice(0, count);
  const confidence = Math.floor(Math.random() * 30) + 70;

  logger.info({ quoteId }, "Using mock FastAPI response");
  return { risk, missing_items: missing, confidence };
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function analyzeQuote(quoteId: string): Promise<FastApiResponse> {
  if (env.FASTAPI_MOCK_ENABLED) {
    return mockAnalysis(quoteId);
  }

  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= RETRY_ATTEMPTS; attempt++) {
    try {
      const start = Date.now();
      const response = await client.post("/analyze", { quote_id: quoteId });
      const duration = Date.now() - start;
      logger.info({ quoteId, duration, attempt }, "FastAPI call succeeded");

      const parsed = FastApiResponseSchema.safeParse(response.data);
      if (!parsed.success) {
        throw new BadGatewayError(
          "FastAPI",
          "Response failed schema validation"
        );
      }

      return parsed.data;
    } catch (err) {
      if (err instanceof BadGatewayError) throw err;

      lastError = err as Error;
      const isAxiosError = err instanceof AxiosError;
      const isRetryable =
        isAxiosError &&
        (!err.response || err.response.status >= 500 || err.code === "ECONNABORTED");

      if (!isRetryable || attempt === RETRY_ATTEMPTS) break;

      logger.warn(
        { quoteId, attempt, error: (err as Error).message },
        "FastAPI call failed, retrying"
      );
      await sleep(RETRY_DELAY_MS * attempt);
    }
  }

  const msg = lastError instanceof AxiosError
    ? lastError.code === "ECONNREFUSED"
      ? "Service is not running"
      : lastError.code === "ECONNABORTED"
        ? "Request timed out"
        : lastError.message
    : (lastError?.message ?? "Unknown error");

  throw new UpstreamServiceError("FastAPI", msg);
}
