import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import { list, summary, sync } from "./journal.controller";

const router = Router();

router.post("/sync", requireAuth, asyncHandler(sync));
router.get("/", requireAuth, asyncHandler(list));
router.get("/summary", requireAuth, asyncHandler(summary));

export default router;
