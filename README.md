# Trading Control Limit Backend

Node.js, Express, TypeScript, Prisma, and PostgreSQL backend for proving a trade-limit and lockout workflow with Charles Schwab / Thinkorswim OAuth.

The backend does not close desktop apps. It only returns lockout status. A future desktop app can call `GET /lockout/status` and close or block local applications.

## API Documentation

After starting the server, open Swagger UI:

```text
http://localhost:5050/docs
```

OpenAPI JSON for Postman import:

```text
http://localhost:5050/docs.json
```

In Postman, choose **Import**, paste the `/docs.json` URL, and Postman will create a collection from the API schema.

## Schwab Browser Test Page

After starting the server, open:

```text
http://localhost:5050/schwab-test
```

Use this page to register or login, check the saved JWT, fetch Schwab connection status, start the Schwab OAuth redirect, and sync real Schwab trades after OAuth is complete.

For Schwab OAuth testing, the `SCHWAB_REDIRECT_URI` value in `.env` must exactly match the callback URL registered in your Schwab Developer Portal app.

Open the test page from the same host as your redirect URI. For example, if `SCHWAB_REDIRECT_URI` uses a Cloudflare tunnel domain, open `/schwab-test` on that same tunnel domain instead of `localhost`.

For a desktop app, keep the Schwab callback pointed at this backend:

```text
https://your-backend-tunnel.example.com/schwab/callback
```

The desktop app should call `GET /schwab/connect-url` with the user's JWT, open the returned Schwab URL in the system browser, then either listen to `GET /broker-connections/events?token=JWT` or poll `GET /schwab/status`. When the callback succeeds, the backend stores the Schwab token and emits a broker connection update.

If your desktop app registers a custom protocol, set `DESKTOP_APP_CALLBACK_URL` so the callback result page can open the app after Schwab finishes:

```env
DESKTOP_APP_CALLBACK_URL=trading-control://schwab/callback
```

## Setup

```bash
npm install
cp .env.example .env
npx prisma migrate dev
npm run dev
```


## Environment

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/trading_control
JWT_SECRET=replace-me
PORT=5050
FRONTEND_URL=http://localhost:3000

SCHWAB_CLIENT_ID=
SCHWAB_CLIENT_SECRET=
SCHWAB_REDIRECT_URI=http://localhost:5050/schwab/callback
DESKTOP_APP_CALLBACK_URL=
SCHWAB_AUTH_URL=
SCHWAB_TOKEN_URL=
SCHWAB_API_BASE_URL=
SCHWAB_ORDERS_URL=
```

`SCHWAB_ORDERS_URL` is optional. If it is empty, the app builds the orders URL from `SCHWAB_API_BASE_URL`.

## Auth

### Register

`POST /auth/register`

```json
{
  "name": "Demo Trader",
  "email": "demo@example.com",
  "password": "password123"
}
```

### Login

`POST /auth/login`

```json
{
  "email": "demo@example.com",
  "password": "password123"
}
```

Use the returned token on protected routes:

```text
Authorization: Bearer YOUR_JWT
```

### Me

`GET /auth/me`

## Schwab OAuth

### Connect

`GET /schwab/connect`

Redirects the authenticated user to the configured Schwab OAuth authorization URL.

### Connect URL

`GET /schwab/connect-url`

Returns the Schwab OAuth authorization URL as JSON. This is used by the browser test page because normal browser redirects cannot attach the JWT `Authorization` header.

### Callback

`GET /schwab/callback?code=AUTH_CODE&state=STATE`

Schwab redirects here. The backend exchanges the authorization code for tokens and stores them in the database.

### Refresh Token

`POST /schwab/refresh-token`

### Status

`GET /schwab/status`

### Account Details

`GET /schwab/account`

Fetches the connected Schwab account summary using the stored Schwab OAuth token. The response includes masked account number, account type, day-trader flag when available, positions count, and common balance fields.

## Trade Limit

### Create Or Update

`POST /trade-limit`

```json
{
  "dailyLimit": 2,
  "lockoutHours": 4,
  "isEnabled": true
}
```

`dailyLimit` must be greater than `0`. `lockoutHours` must be `4`, `8`, `12`, or `24`.

Response includes `remainingTrades`, calculated as today's remaining filled/executed/completed trades before the daily limit is reached.

```json
{
  "tradeLimit": {
    "id": "cm123limit",
    "userId": "cm123user",
    "dailyLimit": 2,
    "lockoutHours": 4,
    "isEnabled": true,
    "createdAt": "2026-07-06T00:00:00.000Z",
    "updatedAt": "2026-07-06T00:00:00.000Z"
  },
  "remainingTrades": 1
}
```

### Read

`GET /trade-limit`

Returns the saved trade limit plus `remainingTrades`. If no limit has been saved, both values are `null`.

## Trades

### Sync Trades

`POST /trades/sync`

Fetches today's real Schwab orders using the authenticated user's stored Schwab OAuth token. The backend keeps only filled, executed, or completed orders, saves them to `TradeLog`, and then checks whether the daily trade limit has been reached.

### Today's Trades

`GET /trades/today`

## Lockout

### Status

`GET /lockout/status`

Locked response:

```json
{
  "locked": true,
  "lockedUntil": "2026-06-27T12:00:00.000Z",
  "reason": "Daily trade limit reached",
  "appsToBlock": [
    "thinkorswim.exe",
    "TradingView.exe",
    "Binance.exe"
  ]
}
```

Unlocked response:

```json
{
  "locked": false
}
```

### Manual Lockout

`POST /lockout/manual`

```json
{
  "lockoutHours": 4,
  "reason": "Manual lockout"
}
```

### Unlock

`POST /lockout/unlock`

## Demo Flow

1. Register with `POST /auth/register`.
2. Copy the returned JWT.
3. Set a limit with `POST /trade-limit`.
4. Connect Schwab with `GET /schwab/connect` and complete OAuth.
5. Call `POST /trades/sync` after real Schwab orders have filled today.
6. Call `GET /lockout/status`.

If today's filled Schwab trade count is greater than or equal to the daily limit, the backend creates a lockout.
