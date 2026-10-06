import type { Request, Response } from "express";
import { z } from "zod";
import { getJournal, getJournalSummary, syncJournal } from "./journal.service";

const journalQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  symbol: z.string().trim().min(1).optional()
});

export async function sync(req: Request, res: Response) {
  const result = await syncJournal(req.user!.id);
  res.json(result);
}

export async function list(req: Request, res: Response) {
  const filters = parseJournalFilters(req.query);
  const trades = await getJournal(req.user!.id, filters);
  res.json({ trades });
}

export async function summary(req: Request, res: Response) {
  const filters = parseJournalFilters(req.query);
  const result = await getJournalSummary(req.user!.id, filters);
  res.json(result);
}

function parseJournalFilters(query: Request["query"]) {
  const input = journalQuerySchema.parse(query);

  return {
    from: input.from ? new Date(input.from) : undefined,
    to: input.to ? new Date(input.to) : undefined,
    symbol: input.symbol
  };
}
