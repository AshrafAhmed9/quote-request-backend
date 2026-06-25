import prisma from "../utils/prisma";
import { CreateQuoteInput } from "../models/schemas";

export const quoteRepository = {
  async findAll(params: {
    page: number;
    limit: number;
    q?: string;
    status?: string;
  }) {
    const { page, limit, q, status } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (status) {
      where.status = status;
    }
    if (q) {
      where.OR = [
        { customer: { contains: q } },
        { project: { contains: q } },
      ];
    }

    const [data, total] = await Promise.all([
      prisma.quoteRequest.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdDate: "desc" },
      }),
      prisma.quoteRequest.count({ where }),
    ]);

    return { data, total };
  },

  async findById(id: string) {
    return prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { analyzedAt: "desc" },
          take: 1,
        },
      },
    });
  },

  async findByIdWithAllAnalyses(id: string) {
    return prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { analyzedAt: "desc" },
        },
      },
    });
  },

  async create(data: CreateQuoteInput) {
    return prisma.quoteRequest.create({ data });
  },

  async updateStatus(id: string, status: string, expectedVersion: number) {
    const result = await prisma.quoteRequest.updateMany({
      where: { id, version: expectedVersion },
      data: {
        status,
        version: { increment: 1 },
      },
    });

    if (result.count === 0) return null;

    return prisma.quoteRequest.findUnique({
      where: { id },
      include: {
        analyses: {
          orderBy: { analyzedAt: "desc" },
          take: 1,
        },
      },
    });
  },
};
