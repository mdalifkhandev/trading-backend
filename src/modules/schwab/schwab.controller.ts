import type { Request, Response } from "express";
import { z } from "zod";
import { env } from "../../config/env";
import { AppError } from "../../middleware/error.middleware";
import {
  buildSchwabAuthorizationUrl,
  getSchwabAccountDetails,
  getSchwabStatus,
  handleSchwabCallback,
  refreshSchwabTokenForUser
} from "./schwab.service";

const callbackSchema = z.object({
  code: z.string().min(1).optional(),
  state: z.string().min(1).optional(),
  error: z.string().min(1).optional(),
  error_description: z.string().min(1).optional()
});

export async function connect(req: Request, res: Response) {
  const url = buildSchwabAuthorizationUrl(req.user!.id);
  res.redirect(url);
}

export async function connectUrl(req: Request, res: Response) {
  const url = buildSchwabAuthorizationUrl(req.user!.id);
  res.json({ url });
}

export async function callback(req: Request, res: Response) {
  const input = callbackSchema.parse(req.query);
  const wantsHtml = req.accepts(["html", "json"]) === "html";

  if (input.error) {
    const message = input.error_description ?? input.error;

    if (wantsHtml) {
      return sendCallbackResult(res, {
        status: "failed",
        message
      });
    }

    throw new AppError(400, message);
  }

  if (!input.code || !input.state) {
    const message = "Schwab OAuth callback is missing the authorization code or state.";

    if (wantsHtml) {
      return sendCallbackResult(res, {
        status: "failed",
        message
      });
    }

    throw new AppError(400, message);
  }

  try {
    const result = await handleSchwabCallback({
      code: input.code,
      state: input.state
    });

    if (wantsHtml) {
      return sendCallbackResult(res, {
        status: "success",
        message: "Schwab is connected. You can return to the desktop app."
      });
    }

    res.json(result);
  } catch (error) {
    if (wantsHtml) {
      return sendCallbackResult(res, {
        status: "failed",
        message: getCallbackErrorMessage(error)
      });
    }

    throw error;
  }
}

export async function refreshToken(req: Request, res: Response) {
  const result = await refreshSchwabTokenForUser(req.user!.id);
  res.json(result);
}

export async function status(req: Request, res: Response) {
  const result = await getSchwabStatus(req.user!.id);
  res.json(result);
}

export async function account(req: Request, res: Response) {
  const result = await getSchwabAccountDetails(req.user!.id);
  res.json(result);
}

type CallbackResult = {
  status: "success" | "failed";
  message: string;
};

function sendCallbackResult(res: Response, result: CallbackResult) {
  const statusCode = result.status === "success" ? 200 : 400;
  const desktopUrl = buildDesktopCallbackUrl(result);

  return res.status(statusCode).type("html").send(renderCallbackResultPage(result, desktopUrl));
}

function buildDesktopCallbackUrl(result: CallbackResult) {
  if (!env.DESKTOP_APP_CALLBACK_URL) {
    return null;
  }

  try {
    const url = new URL(env.DESKTOP_APP_CALLBACK_URL);
    url.searchParams.set("provider", "schwab");
    url.searchParams.set("status", result.status);

    if (result.status === "failed") {
      url.searchParams.set("message", result.message);
    }

    return url.toString();
  } catch {
    return null;
  }
}

function renderCallbackResultPage(result: CallbackResult, desktopUrl: string | null) {
  const title = result.status === "success" ? "Schwab Connected" : "Schwab Connection Failed";
  const desktopRefresh = desktopUrl
    ? `<meta http-equiv="refresh" content="1;url=${escapeHtml(desktopUrl)}">`
    : "";
  const desktopLink = desktopUrl
    ? `<p class="hint">Opening the desktop app...</p><a class="button" href="${escapeHtml(desktopUrl)}">Open Desktop App</a>`
    : `<p class="hint">You can close this browser tab and return to the desktop app.</p>`;

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    ${desktopRefresh}
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        color-scheme: light dark;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }

      body {
        min-height: 100vh;
        margin: 0;
        display: grid;
        place-items: center;
        background: #f6f8fb;
        color: #172033;
      }

      main {
        width: min(92vw, 520px);
        padding: 32px;
        border: 1px solid #d8dee9;
        border-radius: 8px;
        background: #ffffff;
        box-shadow: 0 18px 50px rgba(23, 32, 51, 0.12);
      }

      .status {
        width: 44px;
        height: 44px;
        display: grid;
        place-items: center;
        border-radius: 999px;
        font-size: 26px;
        font-weight: 700;
        color: #ffffff;
        background: ${result.status === "success" ? "#11845b" : "#c93c37"};
      }

      h1 {
        margin: 20px 0 10px;
        font-size: 28px;
        line-height: 1.15;
        letter-spacing: 0;
      }

      p {
        margin: 0;
        line-height: 1.55;
      }

      .hint {
        margin-top: 18px;
        color: #596579;
      }

      .button {
        display: inline-block;
        margin-top: 20px;
        padding: 11px 16px;
        border-radius: 6px;
        background: #172033;
        color: #ffffff;
        text-decoration: none;
        font-weight: 700;
      }

      @media (prefers-color-scheme: dark) {
        body {
          background: #111827;
          color: #f8fafc;
        }

        main {
          background: #1f2937;
          border-color: #374151;
        }

        .hint {
          color: #cbd5e1;
        }

        .button {
          background: #f8fafc;
          color: #111827;
        }
      }
    </style>
  </head>
  <body>
    <main>
      <div class="status">${result.status === "success" ? "OK" : "!"}</div>
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(result.message)}</p>
      ${desktopLink}
    </main>
  </body>
</html>`;
}

function getCallbackErrorMessage(error: unknown) {
  if (error instanceof AppError) {
    return error.message;
  }

  if (error instanceof Error && error.name === "JsonWebTokenError") {
    return "Schwab OAuth state is invalid. Start the connect flow again from the desktop app.";
  }

  if (error instanceof Error && error.name === "TokenExpiredError") {
    return "Schwab OAuth state expired. Start the connect flow again from the desktop app.";
  }

  return "Schwab token exchange failed. Check the backend logs and Schwab app configuration.";
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
