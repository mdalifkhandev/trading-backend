import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { prisma } from "../lib/prisma";

type JwtPayload = {
  userId: string;
  sessionId: string;
};

export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const header = req.header("authorization");
    const token = header?.startsWith("Bearer ") ? header.slice(7) : undefined;

    if (!token) {
      return res.status(401).json({ message: "Missing authorization token" });
    }

    const payload = jwt.verify(token, env.JWT_SECRET) as JwtPayload;
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: { id: true, email: true, name: true }
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid authorization token" });
    }

    if (payload.sessionId) {
      const session = await prisma.deviceSession.findUnique({
        where: { id: payload.sessionId }
      });
      
      if (!session || !session.isActive) {
        return res.status(401).json({ message: "Session expired or logged out" });
      }

      (req as any).sessionId = session.id;
    }

    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ message: "Invalid authorization token" });
  }
}
