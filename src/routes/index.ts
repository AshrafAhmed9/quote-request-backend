import { Router, Request, Response } from "express";
import quoteRoutes from "./quote.routes";
import prisma from "../utils/prisma";

const router = Router();

router.get("/health", async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    });
  } catch {
    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      database: "disconnected",
    });
  }
});

router.use("/quotes", quoteRoutes);

export default router;
