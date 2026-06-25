import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import { logger } from "./logger.middleware";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: {
        type: err.code,
        title: err.name,
        status: err.statusCode,
        detail: err.message,
        requestId: req.requestId,
        ...(err.details ? { errors: err.details } : {}),
      },
    });
    return;
  }

  logger.error({ err, requestId: req.requestId }, "Unhandled error");

  res.status(500).json({
    error: {
      type: "INTERNAL_ERROR",
      title: "Internal Server Error",
      status: 500,
      detail: "An unexpected error occurred",
      requestId: req.requestId,
    },
  });
}
