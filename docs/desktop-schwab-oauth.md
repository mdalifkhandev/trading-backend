# Desktop App Schwab OAuth Integration

This document explains how the desktop frontend should connect a user to Schwab through this backend.

## Important URLs

Backend tunnel base URL:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com
```

Schwab OAuth callback URL:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/callback
```

This callback URL must be registered exactly in the Schwab Developer Portal.

## Environment

The backend `.env` should include:

```env
PORT=5050
FRONTEND_URL=http://localhost:3000

SCHWAB_REDIRECT_URI=https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/callback
DESKTOP_APP_CALLBACK_URL=

SCHWAB_AUTH_URL=https://api.schwabapi.com/v1/oauth/authorize
SCHWAB_TOKEN_URL=https://api.schwabapi.com/v1/oauth/token
SCHWAB_API_BASE_URL=https://api.schwabapi.com/trader/v1
SCHWAB_ORDERS_URL=https://api.schwabapi.com/trader/v1/orders
```

Keep `DESKTOP_APP_CALLBACK_URL` empty unless the desktop app has registered a custom deep link protocol.

Example future value:

```env
DESKTOP_APP_CALLBACK_URL=trading-control://schwab/callback
```

## OAuth Flow

The desktop app should not send the user directly to `/schwab/connect`, because a browser redirect cannot attach the JWT authorization header.

Use `/schwab/connect-url` instead.

1. User logs in to the desktop app.
2. Desktop app stores the backend JWT from `/auth/login`.
3. User clicks "Connect Schwab".
4. Desktop app calls `GET /schwab/connect-url` with `Authorization: Bearer JWT`.
5. Backend returns the Schwab authorization URL.
6. Desktop app opens that URL in the system browser.
7. User logs in and approves on Schwab.
8. Schwab redirects to `/schwab/callback`.
9. Backend exchanges the Schwab code and stores the Schwab tokens.
10. Backend shows a browser success/failure page.
11. Desktop app detects connection success by SSE or polling.
12. Desktop app syncs trades.

## Auth

Login endpoint:

```http
POST /auth/login
Content-Type: application/json
```

Request:

```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:

```json
{
  "user": {
    "id": "user-id",
    "email": "user@example.com",
    "name": "Demo Trader"
  },
  "token": "jwt-token"
}
```

Store `token` securely in the desktop app. Send it on protected API calls:

```http
Authorization: Bearer jwt-token
```

## Start Schwab Connect

Endpoint:

```http
GET /schwab/connect-url
Authorization: Bearer jwt-token
```

Example full URL:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/connect-url
```

Response:

```json
{
  "url": "https://api.schwabapi.com/v1/oauth/authorize?response_type=code&client_id=..."
}
```

The desktop app should open `url` in the user's default browser.

TypeScript example:

```ts
const apiBaseUrl = "https://empirical-shorter-chronicles-lodging.trycloudflare.com";

async function connectSchwab(jwtToken: string) {
  const response = await fetch(`${apiBaseUrl}/schwab/connect-url`, {
    headers: {
      Authorization: `Bearer ${jwtToken}`
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to create Schwab OAuth URL: ${response.status}`);
  }

  const data = await response.json();

  // Electron example:
  // await shell.openExternal(data.url);

  // Generic browser fallback:
  window.open(data.url, "_blank");
}
```

## Callback Result

After Schwab login, the browser redirects to:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/callback
```

The backend shows one of these browser pages:

```text
Schwab Connected
```

or:

```text
Schwab Connection Failed
```

The success page means the Schwab tokens were stored in the backend database.

The failure page means the token exchange or OAuth state validation failed. Start the connect flow again from the desktop app.

## Detect Success In Desktop

Recommended approach: use Server-Sent Events.

Endpoint:

```http
GET /broker-connections/events?token=jwt-token
```

Example full URL:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/broker-connections/events?token=jwt-token
```

The backend emits:

```text
event: broker_connections_updated
data: {"type":"broker_connections_updated","brokers":{...}}
```

When the Schwab/Thinkorswim broker status becomes `connected`, update the desktop UI.

Browser/Electron renderer example:

```ts
function listenForBrokerConnection(jwtToken: string) {
  const apiBaseUrl = "https://empirical-shorter-chronicles-lodging.trycloudflare.com";
  const events = new EventSource(
    `${apiBaseUrl}/broker-connections/events?token=${encodeURIComponent(jwtToken)}`
  );

  events.addEventListener("broker_connections_updated", (event) => {
    const payload = JSON.parse(event.data);
    const schwab = payload.brokers.brokers.find(
      (broker: { id: string; status: string }) => broker.id === "thinkorswim"
    );

    if (schwab?.status === "connected") {
      events.close();
      // Update UI and start trade sync.
    }
  });

  events.onerror = () => {
    // Optional: fall back to polling /schwab/status.
  };

  return events;
}
```

## Polling Fallback

If SSE is not available in the desktop framework, poll this endpoint after opening Schwab:

```http
GET /schwab/status
Authorization: Bearer jwt-token
```

Response when connected:

```json
{
  "connected": true,
  "expiresAt": "2026-07-18T12:00:00.000Z",
  "updatedAt": "2026-07-18T11:30:00.000Z"
}
```

Polling example:

```ts
async function waitForSchwabConnection(jwtToken: string) {
  const apiBaseUrl = "https://empirical-shorter-chronicles-lodging.trycloudflare.com";
  const deadline = Date.now() + 5 * 60 * 1000;

  while (Date.now() < deadline) {
    const response = await fetch(`${apiBaseUrl}/schwab/status`, {
      headers: {
        Authorization: `Bearer ${jwtToken}`
      }
    });

    if (response.ok) {
      const status = await response.json();

      if (status.connected) {
        return status;
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error("Timed out waiting for Schwab connection");
}
```

## Sync Trades

After Schwab is connected, call:

```http
POST /trades/sync
Authorization: Bearer jwt-token
Content-Type: application/json
```

Example full URL:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/trades/sync
```

Response:

```json
{
  "synced": true,
  "fetchedCount": 3,
  "insertedCount": 1,
  "lockoutStatus": {
    "locked": false
  }
}
```

## Read Today's Trades

Endpoint:

```http
GET /trades/today
Authorization: Bearer jwt-token
```

Response:

```json
{
  "trades": []
}
```

## Recommended Desktop UX

Before connect:

```text
Not connected
```

When user clicks connect:

```text
Opening Schwab in your browser...
```

While waiting:

```text
Waiting for Schwab authorization...
```

On success:

```text
Schwab connected
Syncing trades...
```

On failure or timeout:

```text
Schwab connection was not completed. Try again.
```

## Common Problems

Callback mismatch:

The `SCHWAB_REDIRECT_URI` in `.env` must exactly match the callback URL in Schwab Developer Portal.

Correct:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/callback
```

Wrong examples:

```text
http://localhost:5050/schwab/callback
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab/callback/
https://empirical-shorter-chronicles-lodging.trycloudflare.com
```

Missing JWT:

`/schwab/connect-url`, `/schwab/status`, and `/trades/sync` require:

```http
Authorization: Bearer jwt-token
```

Expired OAuth state:

The Schwab OAuth state expires after 10 minutes. If the user waits too long on the Schwab page, start the connect flow again.

Tunnel not pointing to backend:

The Cloudflare tunnel must forward to:

```text
http://localhost:5050
```

Backend not restarted:

After changing `.env`, restart:

```bash
npm run dev
```

## Manual Test Page

For backend testing, open:

```text
https://empirical-shorter-chronicles-lodging.trycloudflare.com/schwab-test
```

Use it to login, connect Schwab, check status, sync trades, and read today's saved trades.
