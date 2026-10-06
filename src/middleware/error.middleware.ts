import type { NextFunction, Request, Response } from "express";
import multer from "multer";
import { ZodError } from "zod";

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string
  ) {
    super(message);
  }
}

export function notFoundHandler(req: Request, res: Response) {
  return res.status(404).json({ message: `Route not found: ${req.method} ${req.path}` });
}

export function asyncHandler(
  handler: (req: Request, res: Response, next: NextFunction) => Promise<unknown>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}
export function errorHandler(error: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (isPayloadTooLargeError(error)) {
    return res.status(413).json({
      message:
        "Request body is too large. For avatar upload, use multipart/form-data with avatar as a file."
    });
  }

  if (error instanceof ZodError) {
    return res.status(400).json({
      message: error.issues[0]?.message ?? "Validation failed",
      issues: error.issues
    });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  if (error instanceof multer.MulterError) {
    const message =
      error.code === "LIMIT_FILE_SIZE"
        ? "Avatar file must be 5MB or smaller"
        : error.message || "File upload failed";

    return res.status(400).json({ message });
  }

  console.error(error);
  return res.status(500).json({ message: "Internal server error" });
}

function isPayloadTooLargeError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "type" in error &&
    (error as { type?: unknown }).type === "entity.too.large"
  );
}
