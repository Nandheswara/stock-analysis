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

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error: any) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Error executing tool: ${error.message}`
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

      tunnelProcess?.stdout?.on("data", (data: Buffer) => {
        const output = data.toString();
        const match = output.match(/https:\/\/[a-z0-9]+\.lhr\.life/);
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

      tunnelProcess?.on("exit", (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`Tunnel exited with code ${code}`));
        }
        tunnelProcess = null;
        tunnelUrl = null;
      });
    });

    tunnelUrl = await urlPromise;
    res.json({ success: true, url: tunnelUrl });

  } catch (error: any) {
    if (tunnelProcess) {
      tunnelProcess.kill();
      tunnelProcess = null;
    }
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/tunnel/stop", (req, res) => {
  if (!isLocalRequest(req)) {
    res.status(403).send("Forbidden: Only local requests allowed");
    return;
  }

  if (tunnelProcess) {
    tunnelProcess.kill();
    tunnelProcess = null;
    tunnelUrl = null;
    res.json({ success: true });
  } else {
    res.json({ success: true, message: "Tunnel was not running" });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Multi-user MCP Server running on port ${PORT}`);
});
