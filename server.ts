import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = 3000;

// Simple rule-based command parser as an ultra-reliable local fallback (no LLM / no AI processing)
function parseCommandRuleBased(text: string) {
  const normalized = text.toLowerCase();
  const commands: any[] = [];
  let response = "Fallback processed.";

  // Rooms
  const rooms = ["living room", "dine-in", "bedroom", "bedroom 2"];
  let matchedRoom = "";
  for (const r of rooms) {
    if (normalized.includes(r)) {
      matchedRoom = r;
      break;
    }
  }

  // If no specific room is matched, default to "living room" if we find matching devices, or try to infer.
  if (!matchedRoom) {
    if (normalized.includes("party") || normalized.includes("passage")) {
      matchedRoom = "living room";
    } else if (normalized.includes("dine") || normalized.includes("low spot")) {
      matchedRoom = "dine-in";
    } else if (normalized.includes("bedside")) {
      matchedRoom = "bedroom";
    } else if (normalized.includes("low ambient") || normalized.includes("high ambient")) {
      matchedRoom = "bedroom 2";
    } else {
      matchedRoom = "living room"; // default
    }
  }

  // Action
  let action = "turn_on";
  if (normalized.includes("off") || normalized.includes("stop") || normalized.includes("disable") || normalized.includes("shut")) {
    action = "turn_off";
  }

  // Check if it is a full room operation
  if (normalized.includes("room on") || (normalized.includes("all") && (normalized.includes("on") || normalized.includes("start")))) {
    action = "room_on";
    commands.push({ room: matchedRoom, device: null, action: "room_on" });
    response = `Turning on all devices in the ${matchedRoom}.`;
    return { response, commands };
  } else if (normalized.includes("room off") || (normalized.includes("all") && (normalized.includes("off") || normalized.includes("stop")))) {
    action = "room_off";
    commands.push({ room: matchedRoom, device: null, action: "room_off" });
    response = `Turning off all devices in the ${matchedRoom}.`;
    return { response, commands };
  }

  // Check fan speed
  if (normalized.includes("fan") && (normalized.includes("speed") || normalized.includes("set") || normalized.includes("level") || normalized.includes("to"))) {
    const numMatch = normalized.match(/(\d+)/);
    if (numMatch) {
      const speed = parseInt(numMatch[1], 10);
      commands.push({ room: matchedRoom, device: "fan", action: "set_fan_speed", value: speed });
      response = `Setting the ${matchedRoom} fan speed to ${speed}.`;
      return { response, commands };
    }
  }

  // Detect specific device
  let matchedDevice = "ambient light"; // default fallback
  if (normalized.includes("party")) {
    matchedDevice = "party light";
  } else if (normalized.includes("passage")) {
    matchedDevice = "passage light";
  } else if (normalized.includes("spot")) {
    if (matchedRoom === "dine-in" && normalized.includes("low")) {
      matchedDevice = "low spot light";
    } else {
      matchedDevice = "spot light";
    }
  } else if (normalized.includes("bedside")) {
    matchedDevice = "bedside light";
  } else if (normalized.includes("fan")) {
    matchedDevice = "fan";
  } else if (normalized.includes("low ambient")) {
    matchedDevice = "low ambient light";
  } else if (normalized.includes("high ambient")) {
    matchedDevice = "high ambient light";
  } else if (normalized.includes("ambient")) {
    matchedDevice = "ambient light";
  }

  commands.push({
    room: matchedRoom,
    device: matchedDevice,
    action: action,
  });

  response = `${action === "turn_on" ? "Turning on" : "Turning off"} the ${matchedDevice} in the ${matchedRoom}.`;
  return { response, commands };
}

// API Route: Parse Commands Locally (non-AI local-only rule engine)
app.post("/api/parse-command", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text command" });
  }

  const result = parseCommandRuleBased(text);
  return res.json({
    ...result,
    source: "local-non-ai-rule-engine"
  });
});

// API Route: Local HTTP Proxy
// This allows the browser to bypass CORS and HTTPS mixed content blockers when running the dashboard locally in a Linux environment.
// The browser hits /api/proxy with the target url and payload, and this node server issues the fetch locally.
app.post("/api/proxy", async (req, res) => {
  const { url, method, headers, body } = req.body;
  if (!url) {
    return res.status(400).json({ error: "Missing proxy URL" });
  }

  try {
    console.log(`[Proxy] Forwarding request to: ${url} (Method: ${method || "GET"})`);
    const response = await fetch(url, {
      method: method || "GET",
      headers: headers || { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });

    const isJson = response.headers.get("content-type")?.includes("application/json");
    const data = isJson ? await response.json() : await response.text();

    return res.status(response.status).json({
      status: response.status,
      statusText: response.statusText,
      data,
    });
  } catch (error: any) {
    console.error(`[Proxy] Error forwarding request to ${url}:`, error.message);
    return res.status(502).json({
      error: "Bad Gateway",
      message: `Failed to connect to local IP server: ${error.message}`,
      suggestion: "If you are running in the cloud, this server cannot access private IPs like 192.168.29.112. Run this dashboard locally in your local Linux container, or use our bridge guide!",
    });
  }
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
