import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(1, "JWT_SECRET is required"),
  PORT: z.coerce.number().default(5050),
  FRONTEND_URL: z.string().default("http://localhost:3000"),
  SCHWAB_CLIENT_ID: z.string().default(""),
  SCHWAB_CLIENT_SECRET: z.string().default(""),
  SCHWAB_REDIRECT_URI: z.string().default("http://localhost:5050/schwab/callback"),
  DESKTOP_APP_CALLBACK_URL: z.string().default(""),
  SCHWAB_AUTH_URL: z.string().default(""),
  SCHWAB_TOKEN_URL: z.string().default(""),
  SCHWAB_API_BASE_URL: z.string().default(""),
  SCHWAB_ORDERS_URL: z.string().default(""),
  CLOUDINARY_CLOUD_NAME: z.string().default(""),
  CLOUDINARY_API_KEY: z.string().default(""),
  CLOUDINARY_API_SECRET: z.string().default("")
});

export const env = envSchema.parse(process.env);
