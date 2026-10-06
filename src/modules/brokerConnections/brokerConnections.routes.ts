import { Router } from "express";
import { requireAuth } from "../../middleware/auth.middleware";
import { asyncHandler } from "../../middleware/error.middleware";
import {
  brokerConnectionEvents,
  connectBrokerConnection,
  listBrokerConnections
} from "./brokerConnections.controller";

const router = Router();

router.get("/", requireAuth, asyncHandler(listBrokerConnections));
router.get("/events", asyncHandler(brokerConnectionEvents));
router.get("/:brokerId/connect", requireAuth, asyncHandler(connectBrokerConnection));

export default router;
