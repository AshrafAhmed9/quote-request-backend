import { quoteRepository } from "../repositories/quote.repository";
import { analysisRepository } from "../repositories/analysis.repository";
import { analyzeQuote } from "../clients/fastapi.client";
import { NotFoundError } from "../utils/errors";

export const analysisService = {
  async analyzeAndSave(quoteId: string) {
    const quote = await quoteRepository.findById(quoteId);
    if (!quote) throw new NotFoundError("Quote", quoteId);

    const fastapiResult = await analyzeQuote(quoteId);

    const analysis = await analysisRepository.create({
      quoteId,
      risk: fastapiResult.risk,
      confidence: fastapiResult.confidence,
      missingItems: fastapiResult.missing_items,
    });

    return {
      quote: {
        id: quote.id,
        customer: quote.customer,
        project: quote.project,
        status: quote.status,
        estimatedValue: quote.estimatedValue,
        createdDate: quote.createdDate,
      },
      analysis: {
        id: analysis.id,
        risk: analysis.risk,
        confidence: analysis.confidence,
        missingItems: fastapiResult.missing_items,
        analyzedAt: analysis.analyzedAt,
      },
    };
  },
};
