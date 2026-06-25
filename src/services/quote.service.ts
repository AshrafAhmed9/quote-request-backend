import { quoteRepository } from "../repositories/quote.repository";
import {
  CreateQuoteInput,
  PaginationQuery,
} from "../models/schemas";
import { NotFoundError, ConflictError } from "../utils/errors";
import {
  isValidTransition,
  getAllowedTransitions,
} from "../utils/statusMachine";
import { buildPaginationMeta } from "../utils/pagination";

export const quoteService = {
  async list(query: PaginationQuery) {
    const { data, total } = await quoteRepository.findAll(query);
    const meta = buildPaginationMeta(query.page, query.limit, total);
    return { data, meta };
  },

  async getById(id: string) {
    const quote = await quoteRepository.findById(id);
    if (!quote) throw new NotFoundError("Quote", id);

    const latestAnalysis = quote.analyses[0] ?? null;
    return {
      ...quote,
      latestAnalysis: latestAnalysis
        ? {
            ...latestAnalysis,
            missingItems: JSON.parse(latestAnalysis.missingItems),
          }
        : null,
      analyses: undefined,
    };
  },

  async create(input: CreateQuoteInput) {
    return quoteRepository.create(input);
  },

  async updateStatus(id: string, status: string, version: number) {
    const existing = await quoteRepository.findById(id);
    if (!existing) throw new NotFoundError("Quote", id);

    if (!isValidTransition(existing.status, status)) {
      const allowed = getAllowedTransitions(existing.status);
      throw new ConflictError(
        `Cannot transition from '${existing.status}' to '${status}'. ` +
          `Allowed transitions: ${allowed.length ? allowed.join(", ") : "none (terminal state)"}`
      );
    }

    const updated = await quoteRepository.updateStatus(id, status, version);
    if (!updated) {
      throw new ConflictError(
        "Quote was modified by another request. Please refresh and try again."
      );
    }

    const latestAnalysis = updated.analyses[0] ?? null;
    return {
      ...updated,
      latestAnalysis: latestAnalysis
        ? {
            ...latestAnalysis,
            missingItems: JSON.parse(latestAnalysis.missingItems),
          }
        : null,
      analyses: undefined,
    };
  },
};
