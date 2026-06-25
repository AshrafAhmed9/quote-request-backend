import prisma from "../utils/prisma";

export interface CreateAnalysisInput {
  quoteId: string;
  risk: string;
  confidence: number;
  missingItems: string[];
}

export const analysisRepository = {
  async create(data: CreateAnalysisInput) {
    return prisma.analysisResult.create({
      data: {
        quoteId: data.quoteId,
        risk: data.risk,
        confidence: data.confidence,
        missingItems: JSON.stringify(data.missingItems),
      },
    });
  },

  async findLatestByQuoteId(quoteId: string) {
    return prisma.analysisResult.findFirst({
      where: { quoteId },
      orderBy: { analyzedAt: "desc" },
    });
  },
};
