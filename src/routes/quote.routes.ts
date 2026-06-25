import { Router } from "express";
import { quoteController } from "../controllers/quote.controller";
import { validate } from "../middleware/validate.middleware";
import {
  CreateQuoteSchema,
  UpdateStatusSchema,
  PaginationQuerySchema,
} from "../models/schemas";

const router = Router();

router.get("/", validate(PaginationQuerySchema, "query"), quoteController.list);
router.get("/:id", quoteController.getById);
router.post("/", validate(CreateQuoteSchema, "body"), quoteController.create);
router.post("/:id/analyze", quoteController.analyze);
router.patch(
  "/:id/status",
  validate(UpdateStatusSchema, "body"),
  quoteController.updateStatus
);

export default router;
