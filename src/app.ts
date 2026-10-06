import cors from "cors";
import express from "express";
import helmet from "helmet";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env";
import { openApiDocument } from "./config/openapi";
import { errorHandler, notFoundHandler } from "./middleware/error.middleware";
import authRoutes from "./modules/auth/auth.routes";
import brokerConnectionsRoutes from "./modules/brokerConnections/brokerConnections.routes";
import journalRoutes from "./modules/journal/journal.routes";
import lockoutRoutes from "./modules/lockout/lockout.routes";
import schwabRoutes from "./modules/schwab/schwab.routes";
import settingsRoutes from "./modules/settings/settings.routes";
import subscriptionRoutes from "./modules/subscription/subscription.routes";
import tradeLimitRoutes from "./modules/tradeLimit/tradeLimit.routes";
import tradesRoutes from "./modules/trades/trades.routes";

export const app = express();

const allowedOrigins = new Set([
  env.FRONTEND_URL,
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002"
]);

app.set("trust proxy", 1);
app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error("Not allowed by CORS"));
    },
    credentials: true
  })
);
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/docs.json", (_req, res) => {
  res.json(openApiDocument);
});

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDocument));

app.get("/schwab-test", (_req, res) => {
  res.redirect("/schwab-test.html");
});

app.use("/auth", authRoutes);
app.use("/broker-connections", brokerConnectionsRoutes);
app.use("/schwab", schwabRoutes);
app.use("/trade-limit", tradeLimitRoutes);
app.use("/trades", tradesRoutes);
app.use("/journal", journalRoutes);
app.use("/lockout", lockoutRoutes);
app.use("/settings", settingsRoutes);
app.use("/subscription", subscriptionRoutes);

app.use(notFoundHandler);
app.use(errorHandler);
