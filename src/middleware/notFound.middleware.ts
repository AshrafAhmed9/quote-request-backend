import { Request, Response } from "express";

export function notFoundMiddleware(req: Request, res: Response): void {
  res.status(404).json({
    error: {
      type: "NOT_FOUND",
      title: "Route Not Found",
      status: 404,
      detail: `Cannot ${req.method} ${req.path}`,
      requestId: req.requestId,
    },
  });
}
