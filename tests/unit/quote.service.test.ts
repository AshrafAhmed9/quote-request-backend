import { quoteService } from "../../src/services/quote.service";
import { quoteRepository } from "../../src/repositories/quote.repository";
import { NotFoundError, ConflictError } from "../../src/utils/errors";

jest.mock("../../src/repositories/quote.repository");

const mockRepo = quoteRepository as jest.Mocked<typeof quoteRepository>;

describe("quoteService", () => {
  beforeEach(() => jest.clearAllMocks());

  describe("getById", () => {
    it("should return quote with latest analysis", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "q1",
        customer: "Acme",
        project: "Bridge",
        status: "New",
        estimatedValue: 100000,
        createdDate: new Date(),
        updatedAt: new Date(),
        version: 1,
        analyses: [
          {
            id: "a1",
            quoteId: "q1",
            risk: "Medium",
            confidence: 85,
            missingItems: JSON.stringify(["Structural drawings"]),
            analyzedAt: new Date(),
          },
        ],
      });

      const result = await quoteService.getById("q1");
      expect(result.customer).toBe("Acme");
      expect(result.latestAnalysis).toBeTruthy();
      expect(result.latestAnalysis!.risk).toBe("Medium");
      expect(result.latestAnalysis!.missingItems).toEqual([
        "Structural drawings",
      ]);
    });

    it("should throw NotFoundError for missing quote", async () => {
      mockRepo.findById.mockResolvedValue(null);
      await expect(quoteService.getById("missing")).rejects.toThrow(
        NotFoundError
      );
    });
  });

  describe("updateStatus", () => {
    it("should reject invalid status transition", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "q1",
        customer: "Acme",
        project: "Bridge",
        status: "Completed",
        estimatedValue: 100000,
        createdDate: new Date(),
        updatedAt: new Date(),
        version: 1,
        analyses: [],
      });

      await expect(
        quoteService.updateStatus("q1", "New", 1)
      ).rejects.toThrow(ConflictError);
    });

    it("should reject stale version (optimistic lock)", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "q1",
        customer: "Acme",
        project: "Bridge",
        status: "New",
        estimatedValue: 100000,
        createdDate: new Date(),
        updatedAt: new Date(),
        version: 2,
        analyses: [],
      });
      mockRepo.updateStatus.mockResolvedValue(null);

      await expect(
        quoteService.updateStatus("q1", "In Review", 1)
      ).rejects.toThrow(ConflictError);
    });

    it("should allow valid transition", async () => {
      mockRepo.findById.mockResolvedValue({
        id: "q1",
        customer: "Acme",
        project: "Bridge",
        status: "New",
        estimatedValue: 100000,
        createdDate: new Date(),
        updatedAt: new Date(),
        version: 1,
        analyses: [],
      });
      mockRepo.updateStatus.mockResolvedValue({
        id: "q1",
        customer: "Acme",
        project: "Bridge",
        status: "In Review",
        estimatedValue: 100000,
        createdDate: new Date(),
        updatedAt: new Date(),
        version: 2,
        analyses: [],
      });

      const result = await quoteService.updateStatus("q1", "In Review", 1);
      expect(result.status).toBe("In Review");
    });
  });
});
