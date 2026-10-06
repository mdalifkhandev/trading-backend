export const openApiDocument = {
  openapi: "3.0.3",
  info: {
    title: "Trading Control Limit API",
    version: "1.0.0",
    description:
      "Backend API for user authentication, Schwab OAuth, real trade syncing, daily trade limits, and lockout status."
  },
  servers: [
    {
      url: "http://localhost:5050",
      description: "Local development server"
    }
  ],
  tags: [
    { name: "Health" },
    { name: "Auth" },
    { name: "Broker Connections" },
    { name: "Schwab" },
    { name: "Trade Limit" },
    { name: "Trades" },
    { name: "Journal" },
    { name: "Lockout" }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT"
      }
    },
    schemas: {
      ErrorResponse: {
        type: "object",
        properties: {
          message: { type: "string", example: "Validation failed" }
        }
      },
      User: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm123user" },
          name: { type: "string", example: "Demo Trader" },
          email: { type: "string", example: "demo@example.com" },
          avatar: {
            type: "string",
            nullable: true,
            example: "https://example.com/avatar.png"
          },
          subscription: {
            type: "string",
            enum: ["starter", "starter pro", "enterprise"],
            example: "starter"
          },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      AuthResponse: {
        type: "object",
        properties: {
          user: { $ref: "#/components/schemas/User" },
          token: { type: "string", example: "jwt.token.value" }
        }
      },
      BrokerConnection: {
        type: "object",
        properties: {
          id: { type: "string", example: "thinkorswim" },
          broker: { type: "string", example: "SCHWAB" },
          displayName: { type: "string", example: "Thinkorswim" },
          subtitle: { type: "string", example: "Equities & Options" },
          logoKey: { type: "string", example: "thinkorswim" },
          status: {
            type: "string",
            enum: ["connected", "not_connected", "coming_soon"],
            example: "connected"
          },
          statusLabel: { type: "string", example: "CONNECTED" },
          actionLabel: {
            type: "string",
            enum: ["MANAGE", "CONNECT", "COMING SOON"],
            example: "MANAGE"
          },
          isEnabled: { type: "boolean", example: true },
          connectUrl: {
            type: "string",
            nullable: true,
            example: "/schwab/connect-url"
          },
          manageUrl: {
            type: "string",
            nullable: true,
            example: "/schwab/account"
          }
        }
      },
      BrokerConnectionAction: {
        type: "object",
        properties: {
          id: { type: "string", example: "thinkorswim" },
          broker: { type: "string", example: "SCHWAB" },
          displayName: { type: "string", example: "Thinkorswim" },
          action: {
            type: "string",
            enum: ["redirect", "manage", "unavailable"],
            example: "redirect"
          },
          url: {
            type: "string",
            nullable: true,
            example: "https://api.schwabapi.com/v1/oauth/authorize?response_type=code&client_id=..."
          },
          message: { type: "string", example: "Redirect the user to Schwab OAuth" }
        }
      },
      TradeLimit: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm123limit" },
          userId: { type: "string", example: "cm123user" },
          dailyLimit: { type: "integer", example: 2 },
          lockoutHours: { type: "integer", enum: [4, 8, 12, 24], example: 4 },
          isEnabled: { type: "boolean", example: true },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      TradeLimitResponse: {
        type: "object",
        properties: {
          tradeLimit: { allOf: [{ $ref: "#/components/schemas/TradeLimit" }], nullable: true },
          remainingTrades: {
            type: "integer",
            minimum: 0,
            nullable: true,
            example: 1,
            description:
              "Remaining counted trades for today. Null when no trade limit has been saved."
          }
        }
      },
      TradeLog: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm123trade" },
          userId: { type: "string", example: "cm123user" },
          broker: { type: "string", example: "SCHWAB" },
          orderId: { type: "string", example: "123456789" },
          symbol: { type: "string", example: "AAPL" },
          side: { type: "string", enum: ["BUY", "SELL", "UNKNOWN"], example: "BUY" },
          quantity: { type: "number", example: 1 },
          status: { type: "string", example: "FILLED" },
          executedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" }
        }
      },
      TradeJournal: {
        type: "object",
        properties: {
          id: { type: "string", example: "cm123journal" },
          userId: { type: "string", example: "cm123user" },
          broker: { type: "string", example: "SCHWAB" },
          orderId: { type: "string", example: "123456789" },
          symbol: { type: "string", example: "AAPL" },
          side: { type: "string", enum: ["BUY", "SELL", "UNKNOWN"], example: "SELL" },
          quantity: { type: "number", example: 1 },
          entryPrice: { type: "number", nullable: true, example: 100 },
          exitPrice: { type: "number", nullable: true, example: 110 },
          pnl: { type: "number", nullable: true, example: 10 },
          status: { type: "string", example: "FILLED" },
          executedAt: { type: "string", format: "date-time" },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" }
        }
      },
      JournalSummary: {
        type: "object",
        properties: {
          totalTrades: { type: "integer", example: 3 },
          closedTrades: { type: "integer", example: 2 },
          wins: { type: "integer", example: 1 },
          losses: { type: "integer", example: 1 },
          totalPnl: { type: "number", example: 25 },
          winRate: { type: "number", example: 50 }
        }
      },
      LockoutStatusUnlocked: {
        type: "object",
        properties: {
          locked: { type: "boolean", example: false }
        }
      },
      LockoutStatusLocked: {
        type: "object",
        properties: {
          locked: { type: "boolean", example: true },
          lockedUntil: { type: "string", format: "date-time" },
          reason: { type: "string", example: "Daily trade limit reached" },
          appsToBlock: {
            type: "array",
            items: { type: "string" },
            example: ["thinkorswim.exe", "TradingView.exe", "Binance.exe"]
          }
        }
      }
    }
  },
  paths: {
    "/health": {
      get: {
        tags: ["Health"],
        summary: "Health check",
        responses: {
          "200": {
            description: "Server is healthy",
            content: {
              "application/json": {
                example: { ok: true }
              }
            }
          }
        }
      }
    },
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["name", "email", "password"],
                properties: {
                  name: { type: "string", example: "Demo Trader" },
                  email: { type: "string", format: "email", example: "demo@example.com" },
                  password: { type: "string", minLength: 8, example: "password123" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "User registered",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } }
          },
          "400": { description: "Validation error" },
          "409": { description: "Email already registered" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login user",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["email", "password"],
                properties: {
                  email: { type: "string", format: "email", example: "demo@example.com" },
                  password: { type: "string", example: "password123" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Login successful",
            content: { "application/json": { schema: { $ref: "#/components/schemas/AuthResponse" } } }
          },
          "401": { description: "Invalid email or password" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Current user",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } }
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" }
        }
      },
      patch: {
        tags: ["Auth"],
        summary: "Update current authenticated user's profile",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  name: { type: "string", example: "Demo Trader" },
                  email: { type: "string", format: "email", example: "demo@example.com" }
                }
              }
            },
            "multipart/form-data": {
              schema: {
                type: "object",
                minProperties: 1,
                properties: {
                  name: { type: "string", example: "Demo Trader" },
                  email: { type: "string", format: "email", example: "demo@example.com" },
                  avatar: {
                    type: "string",
                    format: "binary",
                    description: "Avatar image file. Accepted types: JPEG, PNG, WebP, GIF. Max size: 5MB."
                  }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Profile updated",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: { user: { $ref: "#/components/schemas/User" } }
                }
              }
            }
          },
          "400": { description: "Validation error" },
          "401": { description: "Missing or invalid JWT" },
          "409": { description: "Email already registered" }
        }
      }
    },
    "/auth/change-password": {
      patch: {
        tags: ["Auth"],
        summary: "Change current authenticated user's password",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["newPassword", "confirmPassword"],
                properties: {
                  newPassword: { type: "string", minLength: 8, example: "newpassword123" },
                  confirmPassword: { type: "string", minLength: 8, example: "newpassword123" }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Password changed",
            content: {
              "application/json": {
                example: { message: "Password changed successfully" }
              }
            }
          },
          "400": { description: "Validation error or passwords do not match" },
          "401": { description: "Missing or invalid JWT" }
        }
      }
    },
    "/broker-connections": {
      get: {
        tags: ["Broker Connections"],
        summary: "List broker connection cards for the current user",
        description:
          "Returns UI-ready broker cards with status, action label, and connect/manage URLs. Thinkorswim uses the existing Schwab OAuth connection.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Broker connection cards",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    brokers: {
                      type: "array",
                      items: { $ref: "#/components/schemas/BrokerConnection" }
                    },
                    connectedCount: { type: "integer", example: 1 },
                    updatedAt: {
                      type: "string",
                      format: "date-time",
                      nullable: true
                    }
                  }
                },
                example: {
                  brokers: [
                    {
                      id: "thinkorswim",
                      broker: "SCHWAB",
                      displayName: "Thinkorswim",
                      subtitle: "Equities & Options",
                      logoKey: "thinkorswim",
                      status: "connected",
                      statusLabel: "CONNECTED",
                      actionLabel: "MANAGE",
                      isEnabled: true,
                      connectUrl: null,
                      manageUrl: "/schwab/account"
                    },
                    {
                      id: "tradovate",
                      broker: "TRADOVATE",
                      displayName: "Tradovate",
                      subtitle: "Futures Execution",
                      logoKey: "tradovate",
                      status: "not_connected",
                      statusLabel: "NOT CONNECTED",
                      actionLabel: "CONNECT",
                      isEnabled: true,
                      connectUrl: "/broker-connections/tradovate/connect",
                      manageUrl: null
                    }
                  ],
                  connectedCount: 1,
                  updatedAt: "2026-07-03T10:30:00.000Z"
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" }
        }
      }
    },
    "/broker-connections/{brokerId}/connect": {
      get: {
        tags: ["Broker Connections"],
        summary: "Resolve the connect action for a broker card",
        description:
          "Frontend can call this for any broker card. Schwab/Thinkorswim returns a redirect URL or manage action. Brokers without integrations return an unavailable action.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "brokerId",
            in: "path",
            required: true,
            schema: {
              type: "string",
              example: "thinkorswim"
            },
            description:
              "Broker card id or alias. Examples: thinkorswim, schwab, tradovate, tastytrade, ibkr."
          }
        ],
        responses: {
          "200": {
            description: "Broker connect action",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/BrokerConnectionAction" },
                examples: {
                  schwabRedirect: {
                    summary: "Schwab needs OAuth redirect",
                    value: {
                      id: "thinkorswim",
                      broker: "SCHWAB",
                      displayName: "Thinkorswim",
                      action: "redirect",
                      url: "https://api.schwabapi.com/v1/oauth/authorize?response_type=code&client_id=...",
                      message: "Redirect the user to Schwab OAuth"
                    }
                  },
                  schwabManage: {
                    summary: "Schwab already connected",
                    value: {
                      id: "thinkorswim",
                      broker: "SCHWAB",
                      displayName: "Thinkorswim",
                      action: "manage",
                      url: "/schwab/account",
                      message: "Schwab is already connected"
                    }
                  },
                  unavailable: {
                    summary: "Broker integration not built yet",
                    value: {
                      id: "tradovate",
                      broker: "TRADOVATE",
                      displayName: "Tradovate",
                      action: "unavailable",
                      url: null,
                      message: "Tradovate connection is not available yet"
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" },
          "404": { description: "Broker connection not found" },
          "500": { description: "Provider environment variables are not configured" }
        }
      }
    },
    "/broker-connections/events": {
      get: {
        tags: ["Broker Connections"],
        summary: "Subscribe to broker connection updates",
        description:
          "Server-Sent Events stream for real-time broker card updates. Flutter can pass Authorization: Bearer <token>, or use ?token=<jwt> if the SSE client cannot send headers.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "token",
            in: "query",
            required: false,
            schema: { type: "string" },
            description: "Optional JWT fallback for SSE clients that cannot send Authorization headers."
          }
        ],
        responses: {
          "200": {
            description: "SSE stream. Emits broker_connections_updated events.",
            content: {
              "text/event-stream": {
                example:
                  "event: broker_connections_updated\ndata: {\"type\":\"broker_connections_updated\",\"brokers\":{\"brokers\":[{\"id\":\"thinkorswim\",\"status\":\"connected\",\"actionLabel\":\"MANAGE\"}],\"connectedCount\":1,\"updatedAt\":\"2026-07-03T10:30:00.000Z\"}}\n\n"
              }
            }
          },
          "401": { description: "Missing or invalid JWT" }
        }
      }
    },
    "/schwab/connect": {
      get: {
        tags: ["Schwab"],
        summary: "Redirect authenticated user to Schwab OAuth",
        security: [{ bearerAuth: [] }],
        responses: {
          "302": { description: "Redirect to Schwab authorization page" },
          "401": { description: "Missing or invalid JWT" },
          "500": { description: "Schwab OAuth environment variables are not configured" }
        }
      }
    },
    "/schwab/connect-url": {
      get: {
        tags: ["Schwab"],
        summary: "Return Schwab OAuth URL for frontend or desktop clients",
        description:
          "Use this from a frontend or desktop app because browser redirects cannot attach the Authorization header required by /schwab/connect. Desktop apps should open the returned URL in the system browser, then listen to /broker-connections/events or poll /schwab/status.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Schwab authorization URL",
            content: {
              "application/json": {
                example: {
                  url: "https://api.schwabapi.com/v1/oauth/authorize?response_type=code&client_id=..."
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" },
          "500": { description: "Schwab OAuth environment variables are not configured" }
        }
      }
    },
    "/schwab/callback": {
      get: {
        tags: ["Schwab"],
        summary: "Schwab OAuth callback",
        description:
          "Schwab redirects here after authorization. The backend exchanges the code, stores the token, emits a broker connection update, and renders a success/failure page for browser requests.",
        parameters: [
          {
            name: "code",
            in: "query",
            required: true,
            schema: { type: "string" }
          },
          {
            name: "state",
            in: "query",
            required: true,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Schwab token stored",
            content: { "application/json": { example: { connected: true } } }
          },
          "400": { description: "Invalid callback query" },
          "500": { description: "Schwab token exchange failed or env is missing" }
        }
      }
    },
    "/schwab/refresh-token": {
      post: {
        tags: ["Schwab"],
        summary: "Refresh Schwab OAuth token",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Token refreshed",
            content: { "application/json": { example: { refreshed: true } } }
          },
          "404": { description: "Schwab account is not connected" }
        }
      }
    },
    "/schwab/status": {
      get: {
        tags: ["Schwab"],
        summary: "Get Schwab connection status",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Schwab connection status",
            content: {
              "application/json": {
                example: {
                  connected: true,
                  expiresAt: "2026-06-27T14:00:00.000Z",
                  updatedAt: "2026-06-27T13:30:00.000Z"
                }
              }
            }
          }
        }
      }
    },
    "/schwab/account": {
      get: {
        tags: ["Schwab"],
        summary: "Get Schwab account details",
        description:
          "Requires a connected Schwab account. Returns a cleaned account summary with masked account number, account type, positions count, and common balance fields.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Schwab account details",
            content: {
              "application/json": {
                example: {
                  broker: "SCHWAB",
                  accounts: [
                    {
                      accountNumberLast4: "1234",
                      type: "MARGIN",
                      isDayTrader: false,
                      positionsCount: 3,
                      balances: {
                        cashBalance: 1000.5,
                        buyingPower: 2500,
                        liquidationValue: 12000.75,
                        availableFunds: 2400,
                        maintenanceRequirement: 500
                      }
                    }
                  ]
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" },
          "404": { description: "Schwab account is not connected" },
          "502": { description: "Schwab account details request failed" }
        }
      }
    },
    "/trade-limit": {
      post: {
        tags: ["Trade Limit"],
        summary: "Create or update trade limit",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["dailyLimit", "lockoutHours"],
                properties: {
                  dailyLimit: { type: "integer", minimum: 1, example: 2 },
                  lockoutHours: { type: "integer", enum: [4, 8, 12, 24], example: 4 },
                  isEnabled: { type: "boolean", example: true }
                }
              }
            }
          }
        },
        responses: {
          "200": {
            description: "Trade limit saved",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TradeLimitResponse" }
              }
            }
          },
          "400": { description: "Validation error" }
        }
      },
      get: {
        tags: ["Trade Limit"],
        summary: "Get current user's trade limit",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Trade limit, or null if not set",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/TradeLimitResponse" }
              }
            }
          }
        }
      }
    },
    "/trades/sync": {
      post: {
        tags: ["Trades"],
        summary: "Sync today's real Schwab trades and check lockout",
        description:
          "Requires a connected Schwab account. Fetches today's Schwab orders, saves filled/executed/completed orders, avoids duplicates, and checks whether the trade limit has been reached.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Sync completed",
            content: {
              "application/json": {
                example: {
                  synced: true,
                  fetchedCount: 3,
                  insertedCount: 1,
                  lockoutStatus: {
                    locked: true,
                    lockedUntil: "2026-06-27T18:00:00.000Z",
                    reason: "Daily trade limit reached",
                    appsToBlock: ["thinkorswim.exe", "TradingView.exe", "Binance.exe"]
                  }
                }
              }
            }
          },
          "404": { description: "Schwab account is not connected" }
        }
      }
    },
    "/trades/today": {
      get: {
        tags: ["Trades"],
        summary: "Get today's saved trade logs",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Today's trades",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    trades: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TradeLog" }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    "/journal/sync": {
      post: {
        tags: ["Journal"],
        summary: "Sync Schwab trades into the trade journal",
        description:
          "Fetches today's filled Schwab orders, stores new orders, updates changed orders, and recalculates journal P&L.",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Journal sync completed",
            content: {
              "application/json": {
                example: {
                  synced: true,
                  fetchedCount: 3,
                  createdCount: 1,
                  updatedCount: 2
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" },
          "404": { description: "Schwab account is not connected" }
        }
      }
    },
    "/journal": {
      get: {
        tags: ["Journal"],
        summary: "Get saved trade journal rows",
        description:
          "Frontend should use this endpoint to render the trade journal table. Optional filters support ISO datetime from/to and symbol.",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "from",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" },
            example: "2026-09-06T00:00:00.000Z"
          },
          {
            name: "to",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" },
            example: "2026-09-06T23:59:59.999Z"
          },
          {
            name: "symbol",
            in: "query",
            required: false,
            schema: { type: "string" },
            example: "AAPL"
          }
        ],
        responses: {
          "200": {
            description: "Trade journal rows",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    trades: {
                      type: "array",
                      items: { $ref: "#/components/schemas/TradeJournal" }
                    }
                  }
                }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" }
        }
      }
    },
    "/journal/summary": {
      get: {
        tags: ["Journal"],
        summary: "Get trade journal P&L summary",
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: "from",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" }
          },
          {
            name: "to",
            in: "query",
            required: false,
            schema: { type: "string", format: "date-time" }
          },
          {
            name: "symbol",
            in: "query",
            required: false,
            schema: { type: "string" }
          }
        ],
        responses: {
          "200": {
            description: "Journal summary",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/JournalSummary" }
              }
            }
          },
          "401": { description: "Missing or invalid JWT" }
        }
      }
    },
    "/lockout/status": {
      get: {
        tags: ["Lockout"],
        summary: "Get current lockout status",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Lockout status",
            content: {
              "application/json": {
                schema: {
                  oneOf: [
                    { $ref: "#/components/schemas/LockoutStatusUnlocked" },
                    { $ref: "#/components/schemas/LockoutStatusLocked" }
                  ]
                }
              }
            }
          }
        }
      }
    },
    "/lockout/manual": {
      post: {
        tags: ["Lockout"],
        summary: "Create a manual lockout for testing/admin use",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["lockoutHours"],
                properties: {
                  lockoutHours: { type: "integer", enum: [4, 8, 12, 24], example: 4 },
                  reason: { type: "string", example: "Manual lockout" }
                }
              }
            }
          }
        },
        responses: {
          "201": {
            description: "Manual lockout created",
            content: {
              "application/json": {
                schema: { $ref: "#/components/schemas/LockoutStatusLocked" }
              }
            }
          }
        }
      }
    },
    "/lockout/unlock": {
      post: {
        tags: ["Lockout"],
        summary: "Unlock current user for testing/admin use",
        security: [{ bearerAuth: [] }],
        responses: {
          "200": {
            description: "Unlocked",
            content: { "application/json": { example: { unlocked: true } } }
          },
          "404": { description: "No active lockout found" }
        }
      }
    }
  }
} as const;
