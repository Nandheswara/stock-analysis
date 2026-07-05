import express from "express";
import cors from "cors";
import admin from "firebase-admin";
import dotenv from "dotenv";
import { spawn, ChildProcess } from "child_process";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema
} from "@modelcontextprotocol/sdk/types.js";

dotenv.config();

// 1. Initialize Firebase Admin
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
const databaseURL = process.env.FIREBASE_DATABASE_URL || "https://stock-analysis-51b9a-default-rtdb.firebaseio.com";

if (projectId && clientEmail && privateKey) {
  console.log(`Initializing Firebase Admin for project: ${projectId}`);
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    databaseURL
  });
} else {
  console.log(`Initializing Firebase using project ID: ${projectId || "unknown"}`);
  admin.initializeApp({
    projectId: projectId || undefined,
    databaseURL
  });
}

const db = admin.database();

// Helper to get finance database reference path for a specific user ID
const getFinanceRefForUser = (userId: string, subPath = "") => {
  return db.ref(`users/${userId}/finance${subPath ? "/" + subPath : ""}`);
};

// Helper to get stocks database reference path for a specific user ID
const getStocksRefForUser = (userId: string, subPath = "") => {
  return db.ref(`users/${userId}/stocks${subPath ? "/" + subPath : ""}`);
};


// Session storage mapping sessionId -> { transport, uid }
interface SessionInfo {
  transport: SSEServerTransport;
  uid: string;
}
const sessions = new Map<string, SessionInfo>();

// 2. Initialize MCP Server
function createMcpServer() {
  const server = new Server(
    {
      name: "equity-labs-finance",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {}
      }
    }
  );

// Register Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get_finance_summary",
        description: "Retrieve complete financial data (income, expenses, categories, banks, credit cards, loans) for a specific month.",
        inputSchema: {
          type: "object",
          properties: {
            month: {
              type: "string",
              description: "The month in YYYY-MM format (e.g., 2026-06)."
            }
          },
          required: ["month"]
        }
      },
      {
        name: "list_categories",
        description: "List all investment categories and their structures.",
        inputSchema: {
          type: "object",
          properties: {}
        }
      },
      {
        name: "add_stock_analysis",
        description: "Add a stock with its fundamental analysis metrics (such as quick ratio, debt/equity, ROE, PE) to the user's stock analysis table.",
        inputSchema: {
          type: "object",
          properties: {
            name: {
              type: "string",
              description: "The name of the company (e.g., Tata Consultancy Services)."
            },
            symbol: {
              type: "string",
              description: "The unique slug identifier/URL symbol for the stock on Groww (e.g., tata-consultancy-services-ltd). If not provided, it will be generated from the name."
            },
            stock_symbol: {
              type: "string",
              description: "The NSE/BSE ticker symbol (e.g., TCS)."
            },
            is_manual_entry: {
              type: "boolean",
              description: "Whether the stock was added manually. Defaults to true."
            },
            current_price: {
              type: "string",
              description: "Current stock price."
            },
            market_cap: {
              type: "string",
              description: "Market Capitalization."
            },
            sector: {
              type: "string",
              description: "Sector of the company."
            },
            industry: {
              type: "string",
              description: "Industry of the company."
            },
            liquidity: {
              type: "string",
              description: "Liquidity status (e.g., Good, Poor)."
            },
            quick_ratio: {
              type: "string",
              description: "Quick ratio."
            },
            debt_to_equity: {
              type: "string",
              description: "Debt to Equity ratio."
            },
            roe: {
              type: "string",
              description: "Return on Equity (%)."
            },
            roa: {
              type: "string",
              description: "Return on Assets (%)."
            },
            ebitda_current: {
              type: "string",
              description: "EBITDA for the current/latest financial year."
            },
            ebitda_previous: {
              type: "string",
              description: "EBITDA for the previous financial year."
            },
            dividend_yield: {
              type: "string",
              description: "Dividend Yield (%)."
            },
            pe_ratio: {
              type: "string",
              description: "Stock P/E ratio."
            },
            forward_pe: {
              type: "string",
              description: "Forward P/E ratio."
            },
            industry_pe: {
              type: "string",
              description: "Industry P/E ratio."
            },
            price_to_book: {
              type: "string",
              description: "Price to Book (P/B) ratio."
            },
            price_to_sales: {
              type: "string",
              description: "Price to Sales (P/S) ratio."
            },
            ps_trend: {
              type: "string",
              description: "P/S Trend description."
            },
            beta: {
              type: "string",
              description: "Beta value."
            },
            promoter_holdings: {
              type: "string",
              description: "Promoter Holdings (%)."
            }
          },
          required: ["name"]
        }
      },
      {
        name: "delete_stock_analysis",
        description: "Delete a stock from the fundamental analysis table by its symbol, stock_symbol, or stock_id.",
        inputSchema: {
          type: "object",
          properties: {
            symbol: {
              type: "string",
              description: "The Groww slug identifier/symbol of the stock to delete (e.g., tata-consultancy-services-ltd)."
            },
            stock_symbol: {
              type: "string",
              description: "The NSE/BSE ticker symbol of the stock to delete (e.g., TCS)."
            },
            stock_id: {
              type: "string",
              description: "The unique database ID of the stock to delete."
            }
          }
        }
      }
    ]
  };
});

// Helper to find the active UID for a given tool/resource request
const getUidFromSessionId = (sessionId?: string): string => {
  if (!sessionId) {
    throw new Error("No session ID specified for this request.");
  }
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error("Invalid or expired session.");
  }
  return session.uid;
};

// Handle Tool Calls
server.setRequestHandler(CallToolRequestSchema, async (request, extra) => {
  // Extract sessionId from extra info context if available
  const sessionId = extra?.sessionId as string | undefined;
  const uid = getUidFromSessionId(sessionId);
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "get_finance_summary": {
        const month = args?.month as string;
        if (!month) throw new Error("Month is required");

        const [categoriesSnap, banksSnap, cardsSnap, loansSnap, expensesSnap, incomeSnap, taxSnap, epfoSnap] = await Promise.all([
          getFinanceRefForUser(uid, "categories").get(),
          getFinanceRefForUser(uid, "banks").get(),
          getFinanceRefForUser(uid, "creditCards").get(),
          getFinanceRefForUser(uid, "loans").get(),
          getFinanceRefForUser(uid, "expenses").get(),
          getFinanceRefForUser(uid, `income/${month}`).get(),
          getFinanceRefForUser(uid, `taxes/${month}`).get(),
          getFinanceRefForUser(uid, `epfo/${month}`).get()
        ]);

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                month,
                income: incomeSnap.val(),
                tax: taxSnap.val(),
                epfo: epfoSnap.val(),
                banks: banksSnap.val(),
                creditCards: cardsSnap.val(),
                loans: loansSnap.val(),
                expenses: expensesSnap.val(),
                categories: categoriesSnap.val()
              }, null, 2)
            }
          ]
        };
      }

      case "list_categories": {
        const snap = await getFinanceRefForUser(uid, "categories").get();
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(snap.val() || {}, null, 2)
            }
          ]
        };
      }

      case "add_stock_analysis": {
        const name = args?.name as string;
        let symbol = args?.symbol as string;
        if (!name) throw new Error("name is required");
        if (!symbol) {
          symbol = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '').replace(/^-+/, '');
        }

        // Fetch existing stocks to check for potential duplicate/match for upsert
        const snap = await getStocksRefForUser(uid).get();
        const stocks = snap.val() || {};
        let existingStockId: string | null = null;
        let existingStock: any = null;

        for (const key of Object.keys(stocks)) {
          const s = stocks[key];
          if (s.symbol === symbol || (args?.stock_symbol && s.stock_symbol === args.stock_symbol)) {
            existingStockId = key;
            existingStock = s;
            break;
          }
        }

        const stockId = existingStockId || `stock_${Date.now()}`;
        
        const getVal = (argVal: any, existingVal: any, defaultVal = 'Enter Data') => {
          if (argVal !== undefined) return String(argVal);
          if (existingVal !== undefined) return String(existingVal);
          return defaultVal;
        };

        const stockData = {
          symbol: symbol,
          name: args?.name || (existingStock ? existingStock.name : name),
          stock_symbol: args?.stock_symbol !== undefined ? String(args.stock_symbol) : (existingStock ? (existingStock.stock_symbol || "") : ""),
          is_manual_entry: args?.is_manual_entry !== undefined ? !!args.is_manual_entry : (existingStock ? !!existingStock.is_manual_entry : true),
          data_available: true,
          current_price: getVal(args?.current_price, existingStock?.current_price),
          market_cap: getVal(args?.market_cap, existingStock?.market_cap),
          sector: getVal(args?.sector, existingStock?.sector),
          industry: getVal(args?.industry, existingStock?.industry),
          liquidity: getVal(args?.liquidity, existingStock?.liquidity),
          quick_ratio: getVal(args?.quick_ratio, existingStock?.quick_ratio),
          debt_to_equity: getVal(args?.debt_to_equity, existingStock?.debt_to_equity),
          roe: getVal(args?.roe, existingStock?.roe),
          roa: getVal(args?.roa, existingStock?.roa),
          ebitda_current: getVal(args?.ebitda_current, existingStock?.ebitda_current),
          ebitda_previous: getVal(args?.ebitda_previous, existingStock?.ebitda_previous),
          dividend_yield: getVal(args?.dividend_yield, existingStock?.dividend_yield),
          pe_ratio: getVal(args?.pe_ratio, existingStock?.pe_ratio),
          forward_pe: getVal(args?.forward_pe, existingStock?.forward_pe),
          industry_pe: getVal(args?.industry_pe, existingStock?.industry_pe),
          price_to_book: getVal(args?.price_to_book, existingStock?.price_to_book),
          price_to_sales: getVal(args?.price_to_sales, existingStock?.price_to_sales),
          ps_trend: getVal(args?.ps_trend, existingStock?.ps_trend),
          beta: getVal(args?.beta, existingStock?.beta),
          promoter_holdings: getVal(args?.promoter_holdings, existingStock?.promoter_holdings),
          createdAt: existingStock ? (existingStock.createdAt || new Date().toISOString()) : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          userId: uid,
          stock_id: stockId
        };

        await getStocksRefForUser(uid, stockId).set(stockData);

        const isUpdate = !!existingStockId;

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Successfully ${isUpdate ? 'updated' : 'added'} stock ${name} (${symbol}) in fundamental analysis.`,
                stockId,
                stockData
              }, null, 2)
            }
          ]
        };
      }

      case "delete_stock_analysis": {
        const symbol = args?.symbol as string;
        const stockSymbol = args?.stock_symbol as string;
        const stockIdArg = args?.stock_id as string;

        if (!symbol && !stockSymbol && !stockIdArg) {
          throw new Error("At least one of symbol, stock_symbol, or stock_id must be provided.");
        }

        const snap = await getStocksRefForUser(uid).get();
        const stocks = snap.val() || {};
        let targetStockId: string | null = null;
        let targetName = "";

        if (stockIdArg && stocks[stockIdArg]) {
          targetStockId = stockIdArg;
          targetName = stocks[stockIdArg].name;
        } else {
          const matchSymbol = symbol ? symbol.toLowerCase().trim() : "";
          const matchStockSymbol = stockSymbol ? stockSymbol.toLowerCase().trim() : "";

          for (const key of Object.keys(stocks)) {
            const s = stocks[key];
            const sSymbol = s.symbol ? String(s.symbol).toLowerCase().trim() : "";
            const sStockSymbol = s.stock_symbol ? String(s.stock_symbol).toLowerCase().trim() : "";
            const sName = s.name ? String(s.name).toLowerCase().trim() : "";

            // Check if any provided search criteria matches symbol, stock_symbol, or name
            const matchesSymbol = matchSymbol && (sSymbol === matchSymbol || sStockSymbol === matchSymbol || sName === matchSymbol);
            const matchesStockSymbol = matchStockSymbol && (sSymbol === matchStockSymbol || sStockSymbol === matchStockSymbol || sName === matchStockSymbol);

            if (matchesSymbol || matchesStockSymbol) {
              targetStockId = key;
              targetName = s.name;
              break;
            }
          }
        }

        if (!targetStockId) {
          const available = Object.keys(stocks).map(k => {
            const s = stocks[k];
            return `${s.name || 'Unnamed'} (symbol: ${s.symbol || 'none'}, ticker: ${s.stock_symbol || 'none'}, id: ${k})`;
          }).join(", ");
          throw new Error(`Stock not found with the specified identifier(s). Search term(s): symbol='${symbol || ""}', stock_symbol='${stockSymbol || ""}'. Available stocks in list: [${available || 'none'}]`);
        }

        await getStocksRefForUser(uid, targetStockId).remove();

        return {
          content: [
            {
              type: "text",
              text: JSON.stringify({
                success: true,
                message: `Successfully deleted stock ${targetName} (ID: ${targetStockId}) from fundamental analysis.`
              }, null, 2)
            }
          ]
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    console.error(`Error executing tool ${name}:`, error);
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error.message}`
        }
      ]
    };
  }
});

// Register Resources
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: "finance://categories",
        name: "Investment Categories",
        description: "All registered investment categories."
      }
    ]
  };
});

server.setRequestHandler(ReadResourceRequestSchema, async (request, extra) => {
  const { uri } = request.params;
  const sessionId = extra?.sessionId as string | undefined;
  const uid = getUidFromSessionId(sessionId);

  if (uri === "finance://categories") {
    const snap = await getFinanceRefForUser(uid, "categories").get();
    return {
      contents: [
        {
          uri,
          mimeType: "application/json",
          text: JSON.stringify(snap.val() || {})
        }
      ]
    };
  }
  throw new Error(`Resource not found: ${uri}`);
});

  return server;
}

// 3. Express App Setup
const app = express();
app.use(cors());

// Token extraction helper
const extractToken = (req: express.Request): string | null => {
  if (req.headers.authorization?.startsWith("Bearer ")) {
    return req.headers.authorization.substring(7);
  }
  if (typeof req.query.token === "string" && req.query.token) {
    return req.query.token;
  }
  return null;
};

app.get("/sse", async (req, res) => {
  const token = extractToken(req);
  if (!token) {
    res.status(401).send("Unauthorized: Missing Firebase ID Token");
    return;
  }

  try {
    // Verify Firebase ID Token to fetch user's unique identity
    const decodedToken = await admin.auth().verifyIdToken(token);
    const uid = decodedToken.uid;
    console.log(`Successfully authenticated user UID: ${uid} for SSE`);

    const transport = new SSEServerTransport("/messages", res);
    const sessionId = transport.sessionId;
    sessions.set(sessionId, { transport, uid });

    transport.onclose = () => {
      console.log(`SSE connection closed: session ${sessionId} for user ${uid}`);
      sessions.delete(sessionId);
    };

    // Override the server's call handlers to pass sessionId as extra info context
    const server = createMcpServer();
    console.log(`Debug: New server instance created. Existing transport: ${!!(server as any).transport}`);
    await server.connect(transport);
    
    // Inject sessionId into context
    const originalRequestHandler = transport.onmessage;
    if (originalRequestHandler) {
      transport.onmessage = (message) => {
        originalRequestHandler(message, { sessionId } as any);
      };
    }

  } catch (error: any) {
    console.error("Token verification failed:", error.message);
    res.status(401).send(`Unauthorized: Invalid token: ${error.message}`);
  }
});

app.post("/messages", express.json(), async (req, res) => {
  const sessionId = req.query.sessionId as string;
  const session = sessions.get(sessionId);

  if (!session) {
    res.status(404).send(`Session ${sessionId} not found or expired`);
    return;
  }

  await session.transport.handlePostMessage(req, res, req.body);
});

let tunnelProcess: ChildProcess | null = null;
let tunnelUrl: string | null = null;

// Helper to check if request is from localhost
const isLocalRequest = (req: express.Request): boolean => {
  const ip = req.ip || req.socket.remoteAddress;
  return ip === "127.0.0.1" || ip === "::1" || ip === "::ffff:127.0.0.1";
};

app.get("/api/tunnel/status", (req, res) => {
  if (!isLocalRequest(req)) {
    res.status(403).send("Forbidden: Only local requests allowed");
    return;
  }
  res.json({
    running: !!tunnelProcess,
    url: tunnelUrl
  });
});

app.post("/api/tunnel/start", async (req, res) => {
  if (!isLocalRequest(req)) {
    res.status(403).send("Forbidden: Only local requests allowed");
    return;
  }

  if (tunnelProcess) {
    res.json({ success: true, url: tunnelUrl });
    return;
  }

  try {
    // Spawn ssh tunnel to localhost.run
    tunnelProcess = spawn("ssh", ["-o", "StrictHostKeyChecking=no", "-R", "80:127.0.0.1:3000", "nokey@localhost.run"]);
    
    // Read stdout to find the tunnel URL
    const urlPromise = new Promise<string>((resolve, reject) => {
      let resolved = false;
      
      const timeout = setTimeout(() => {
        if (!resolved) {
          reject(new Error("Timeout waiting for tunnel URL"));
        }
      }, 10000);

      let accumulatedOutput = "";
      tunnelProcess?.stdout?.on("data", (data: Buffer) => {
        accumulatedOutput += data.toString();
        const match = accumulatedOutput.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
        if (match) {
          resolved = true;
          clearTimeout(timeout);
          resolve(match[0]);
        }
      });

      tunnelProcess?.on("error", (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(err);
        }
      });

      tunnelProcess?.on("exit", (code, signal) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          if (signal === "SIGKILL" || signal === "SIGTERM") {
            reject(new Error("Tunnel stopped by user"));
          } else {
            reject(new Error(`Tunnel exited with code ${code}`));
          }
        }
        tunnelProcess = null;
        tunnelUrl = null;
      });
    });

    tunnelUrl = await urlPromise;
    res.json({ success: true, url: tunnelUrl });

  } catch (error: any) {
    if (tunnelProcess) {
      try {
        tunnelProcess.kill("SIGKILL");
      } catch (e) {
        // ignore
      }
      tunnelProcess = null;
    }
    if (error.message === "Tunnel stopped by user") {
      res.json({ success: false, message: "Tunnel start aborted by user" });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post("/api/tunnel/stop", (req, res) => {
  if (!isLocalRequest(req)) {
    res.status(403).send("Forbidden: Only local requests allowed");
    return;
  }

  if (tunnelProcess) {
    try {
      tunnelProcess.kill("SIGKILL");
    } catch (e) {
      console.error("Error killing tunnel process:", e);
    }
    tunnelProcess = null;
  }

  // Fallback cleanup to ensure no orphaned ssh instances survive
  try {
    spawn("pkill", ["-f", "localhost.run"]);
  } catch (e) {
    console.error("Error running pkill cleanup:", e);
  }

  tunnelUrl = null;
  res.json({ success: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multi-user MCP Server running on port ${PORT}`);
});
