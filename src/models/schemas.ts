import { z } from "zod";

export const QUOTE_STATUSES = [
  "New",
  "In Review",
  "Needs Info",
  "Completed",
] as const;

export const QuoteStatusEnum = z.enum(QUOTE_STATUSES);
export type QuoteStatus = z.infer<typeof QuoteStatusEnum>;

export const CreateQuoteSchema = z.object({
  customer: z
    .string()
    .min(1, "Customer name is required")
    .max(255, "Customer name too long"),
  project: z
    .string()
    .min(1, "Project name is required")
    .max(255, "Project name too long"),
  estimatedValue: z
    .number()
    .nonnegative("Estimated value cannot be negative"),
  status: QuoteStatusEnum.optional().default("New"),
});

export type CreateQuoteInput = z.infer<typeof CreateQuoteSchema>;

export const UpdateStatusSchema = z.object({
  status: QuoteStatusEnum,
  version: z.number().int().positive("Version must be a positive integer"),
});

export type UpdateStatusInput = z.infer<typeof UpdateStatusSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  q: z.string().optional(),
  status: QuoteStatusEnum.optional(),
});

export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

export const FastApiResponseSchema = z.object({
  risk: z.string(),
  missing_items: z.array(z.string()),
  confidence: z.number(),
});

export type FastApiResponse = z.infer<typeof FastApiResponseSchema>;
