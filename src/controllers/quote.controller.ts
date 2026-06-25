import { Request, Response } from "express";
import { quoteService } from "../services/quote.service";
import { analysisService } from "../services/analysis.service";

export const quoteController = {
  async list(req: Request, res: Response) {
    const query = res.locals.query || req.query;
    const result = await quoteService.list(query);
    res.json(result);
  },

  async getById(req: Request, res: Response) {
    const id = req.params.id as string;
    const quote = await quoteService.getById(id);
    res.json({ data: quote });
  },

  async create(req: Request, res: Response) {
    const quote = await quoteService.create(req.body);
    res.status(201).json({ data: quote });
  },

  async analyze(req: Request, res: Response) {
    const id = req.params.id as string;
    const result = await analysisService.analyzeAndSave(id);
    res.json({ data: result });
  },

  async updateStatus(req: Request, res: Response) {
    const id = req.params.id as string;
    const { status, version } = req.body;
    const quote = await quoteService.updateStatus(id, status, version);
    res.json({ data: quote });
  },
};
