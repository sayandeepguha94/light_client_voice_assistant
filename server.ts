import express from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import multer from "multer";

dotenv.config();

const app = express();

// 1. GLOBAL CORS - MUST BE FIRST
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
  res.setHeader("Access-Control-Allow-Private-Network", "true");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }
  next();
});

app.use(express.json());

const PORT = 3000;

// Centralized Ecosystem Devices State
interface Device {
  id: string;
  name: string;
  room: string;
  deviceKey: string;
  entityId: string;
  category: "lighting" | "fan" | "ac" | "media";
  on: boolean;
  value?: number;
  unit?: string;
  statusText: string;
}

let devices: Device[] = [
  // living room
  { id: "living room.ambient light", name: "Ambient Light", room: "living room", deviceKey: "ambient light", entityId: "switch.living_room_4node_smart_switch_4_ambient_light", category: "lighting", on: true, statusText: "On" },
  { id: "living room.party light", name: "Party Light", room: "living room", deviceKey: "party light", entityId: "switch.living_room_4node_smart_switch_4_party_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.passage light", name: "Passage Light", room: "living room", deviceKey: "passage light", entityId: "switch.living_room_4node_smart_switch_4_passage_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.spot light", name: "Spot Light", room: "living room", deviceKey: "spot light", entityId: "switch.living_room_4node_smart_switch_4_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.fan", name: "Ceiling Fan", room: "living room", deviceKey: "fan", entityId: "fan.fan_modular_switch", category: "fan", on: true, value: 3, unit: " Speed", statusText: "Speed 3" },
  { id: "living room.ac", name: "Air Conditioner", room: "living room", deviceKey: "ac", entityId: "ebc64582fc835bb94dlmh1", category: "ac", on: false, value: 22, unit: "°C", statusText: "Off" },
  { id: "living room.tv", name: "Television", room: "living room", deviceKey: "tv", entityId: "eb96ab0b34a335a694gasf", category: "media", on: false, statusText: "Off" },

  // dine-in
  { id: "dine-in.ambient light", name: "Ambient Light", room: "dine-in", deviceKey: "ambient light", entityId: "switch.dine_in_4sw_modular_touch_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.spot light", name: "Spot Light", room: "dine-in", deviceKey: "spot light", entityId: "switch.dine_in_4sw_modular_touch_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.low spot light", name: "Low Spot Light", room: "dine-in", deviceKey: "low spot light", entityId: "switch.dine_in_4sw_modular_touch_low_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "dine-in.fan", name: "Fan Switch", room: "dine-in", deviceKey: "fan", entityId: "switch.dine_in_4sw_modular_touch_fan", category: "fan", on: false, statusText: "Off" },

  // bedroom
  { id: "bedroom.ambient light", name: "Ambient Light", room: "bedroom", deviceKey: "ambient light", entityId: "switch.bedroom_4node_smart_switch_2_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.bedside light", name: "Bedside Light", room: "bedroom", deviceKey: "bedside light", entityId: "switch.bedroom_4node_smart_switch_2_bedside_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom.fan", name: "Fan Switch", room: "bedroom", deviceKey: "fan", entityId: "switch.bedroom_4node_smart_switch_2_fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom.spot light", name: "Spot Light", room: "bedroom", deviceKey: "spot light", entityId: "switch.bedroom_4node_smart_switch_2_spot_light", category: "lighting", on: false, statusText: "Off" },

  // bedroom 2
  { id: "bedroom 2.low ambient light", name: "Low Ambient Light", room: "bedroom 2", deviceKey: "low ambient light", entityId: "switch.bedroom_2_4node_smart_switch_3_low_ambient_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.fan", name: "Fan Switch", room: "bedroom 2", deviceKey: "fan", entityId: "switch.bedroom_2_4node_smart_switch_3_fan", category: "fan", on: false, statusText: "Off" },
  { id: "bedroom 2.spot light", name: "Spot Light", room: "bedroom 2", deviceKey: "spot light", entityId: "switch.bedroom_2_4node_smart_switch_3_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "bedroom 2.high ambient light", name: "High Ambient Light", room: "bedroom 2", deviceKey: "high ambient light", entityId: "switch.bedroom_2_4node_smart_switch_3_high_ambient_light", category: "lighting", on: false, statusText: "Off" }
];

// Centralized User State
interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: "admin" | "user";
  allowed_pages?: string[];
  allowed_devices?: string[];
  mobileAccess?: boolean;
}

const users: User[] = [
  {
    id: "admin-1",
    name: "System Admin",
    username: "admin",
    password: "admin0466",
    role: "admin",
    mobileAccess: true
  }
];

const USERS_FILE = path.join(process.cwd(), "users.json");

function loadUsers() {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, "utf8");
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        // Clear array and push all to keep reference
        users.length = 0;
        users.push(...loaded);
        // Ensure admin always exists
        if (!users.find(u => u.username === "admin")) {
          users.push({ id: "admin-1", name: "System Admin", username: "admin", password: "admin0466", role: "admin", mobileAccess: true });
        }
      }
    }
  } catch (e) { console.error("Failed to load users", e); }
}

function saveUsers() {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (e) { console.error("Failed to save users", e); }
}

loadUsers();

// Centralized Shopping List State
interface ShoppingItem {
  id: string;
  text: string;
  completed: boolean;
  createdAt: number;
}

let shoppingList: ShoppingItem[] = [
  { id: "1", text: "Organic Milk (1 Gallon)", completed: false, createdAt: Date.now() - 3600000 * 5 },
  { id: "2", text: "Whole Grain Sourdough Bread", completed: true, createdAt: Date.now() - 3600000 * 4 },
  { id: "3", text: "Free Range Eggs (12 pk)", completed: false, createdAt: Date.now() - 3600000 * 3 },
  { id: "4", text: "Fresh Avocados & Bananas", completed: false, createdAt: Date.now() - 3600000 * 2 },
  { id: "5", text: "Dark Roast Coffee Beans", completed: true, createdAt: Date.now() - 3600000 * 1 },
];

const SUGGESTIONS_FILE = path.join(process.cwd(), "suggestions.json");
const INITIAL_SUGGESTIONS = [
  "potato / আলু", "tomato / টমেটো", "onion / পেঁয়াজ", "milk / দুধ", "Ginger / আদা",
  "garlic / রসুন", "Green vegies / সবুজ সবজি", "Chicken / মুরগির মাংস", "Katla Fish / কাতলা মাছ",
  "Lote fish / লোটে মাছ", "Chingri Fish / চিংড়ি মাছ", "Hilsa Fish / ইলিশ মাছ", "Masala / মশলা",
  "Egg / ডিম", "Capcicum / ক্যাপসিকাম", "Beans / বিনস", "Carrot / গাজর", "Rice / চাল",
  "Protine Atta / প্রোটিন আটা"
];

let suggestions: string[] = [...INITIAL_SUGGESTIONS];

function loadSuggestions() {
  try {
    if (fs.existsSync(SUGGESTIONS_FILE)) {
      const data = fs.readFileSync(SUGGESTIONS_FILE, "utf8");
      const loaded = JSON.parse(data);
      if (Array.isArray(loaded)) {
        suggestions.length = 0;
        suggestions.push(...loaded);
      }
    }
  } catch (e) { console.error("Failed to load suggestions", e); }
}

function saveSuggestions() {
  try {
    fs.writeFileSync(SUGGESTIONS_FILE, JSON.stringify(suggestions, null, 2), "utf8");
  } catch (e) { console.error("Failed to save suggestions", e); }
}

loadSuggestions();

// Helper to update device state
function applyBackendControl(room: string, deviceKey: string | null, action: string, value?: number) {
  const normalizedRoom = room.toLowerCase();
  const normalizedKey = deviceKey?.toLowerCase() || "";

  if (action === "room_on" || action === "room_off") {
    devices.forEach(dev => {
      if (dev.room.toLowerCase() === normalizedRoom) {
        dev.on = (action === "room_on");
        dev.statusText = dev.on ? (dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On") : "Off";
      }
    });
    return;
  }

  const dev = devices.find(d => d.room.toLowerCase() === normalizedRoom && d.deviceKey.toLowerCase() === normalizedKey);
  if (dev) {
    if (action === "turn_on") {
      dev.on = true;
      dev.statusText = dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On";
    } else if (action === "turn_off") {
      dev.on = false;
      dev.statusText = "Off";
    } else if (action === "set_fan_speed" && value !== undefined) {
      dev.on = true;
      dev.value = value;
      dev.statusText = `Speed ${value}`;
    }
  }
}


// Lazy initialization of Gemini client to prevent crash on startup if key is missing
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY environment variable is not set. Please add it in Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return aiClient;
}

// Multer setup for handling audio uploads from ESP32 clients
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB max file size
  }
});

// Cache for generated speech audio files to serve to the ESP32 (prevent memory crashes from large base64 strings)
const audioCache = new Map<string, { buffer: Buffer; mimeType: string }>();
let nextAudioId = 1;

function cacheAudioFile(buffer: Buffer, mimeType: string): string {
  const id = `voice_${Date.now()}_${nextAudioId++}`;
  audioCache.set(id, { buffer, mimeType });
  // Evict old entries if the cache grows too large
  if (audioCache.size > 100) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  return id;
}

// Helper to convert raw 16-bit Mono PCM to playable standard RIFF WAV format
function pcmToWav(pcmBuffer: Buffer, sampleRate: number = 24000): Buffer {
  const wavHeader = Buffer.alloc(44);
  const totalDataLen = pcmBuffer.length;
  const totalFileLen = totalDataLen + 36;
  
  // "RIFF" chunk descriptor
  wavHeader.write("RIFF", 0);
  wavHeader.writeUInt32LE(totalFileLen, 4);
  wavHeader.write("WAVE", 8);
  
  // "fmt " sub-chunk
  wavHeader.write("fmt ", 12);
  wavHeader.writeUInt32LE(16, 16); // Subchunk1Size
  wavHeader.writeUInt16LE(1, 20);  // AudioFormat (1 = uncompressed PCM)
  wavHeader.writeUInt16LE(1, 22);  // NumChannels (1 = Mono)
  wavHeader.writeUInt32LE(sampleRate, 24); // SampleRate
  wavHeader.writeUInt32LE(sampleRate * 2, 28); // ByteRate (SampleRate * 1 channel * 2 bytes/sample)
  wavHeader.writeUInt16LE(2, 32);  // BlockAlign
  wavHeader.writeUInt16LE(16, 34); // BitsPerSample (16-bit)
  
  // "data" sub-chunk
  wavHeader.write("data", 36);
  wavHeader.writeUInt32LE(totalDataLen, 40);
  
  return Buffer.concat([wavHeader, pcmBuffer]);
}

// Simple rule-based command parser as an ultra-reliable local fallback (no LLM / no AI processing)
function parseCommandRuleBased(text: string) {
  const normalized = text.toLowerCase();
  const commands: any[] = [];
  let response = "Fallback processed.";

  // Check if command is for shopping list
  if (normalized.includes("shopping") || normalized.includes("grocery") || normalized.includes("buy")) {
    if (normalized.includes("add") || normalized.includes("buy") || normalized.includes("put")) {
      let rawItem = normalized;
      rawItem = rawItem.replace(/^(hey jerry|jerry|please|can you)?\s*(add|put|buy)\s*/i, "");
      rawItem = rawItem.replace(/\s*(to|on)\s*(the|my)?\s*(shopping|grocery)?\s*list.*$/i, "");
      rawItem = rawItem.replace(/^(to|on)\s*(the|my)?\s*(shopping|grocery)?\s*list\s*/i, "");
      rawItem = rawItem.trim();

      if (rawItem) {
        const formattedItem = rawItem.charAt(0).toUpperCase() + rawItem.slice(1);
        const newItem: ShoppingItem = {
          id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
          text: formattedItem,
          completed: false,
          createdAt: Date.now()
        };
        shoppingList = [newItem, ...shoppingList];
        response = `Added "${newItem.text}" to your shopping list.`;
        commands.push({ type: "shopping_add", item: newItem });
        return { response, commands };
      }
    }
  }

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

// POST /api/auth/login - Authenticate user
app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid username or password" });
  }
  // Mock token for simplicity
  const token = `mock-jwt-token-${user.id}`;
  const { password: _, ...userWithoutPassword } = user;
  res.json({ token, user: userWithoutPassword });
});

// GET /api/auth/me - Get current user profile
app.get("/api/auth/me", (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  const token = authHeader.split(" ")[1];
  const userId = token.replace("mock-jwt-token-", "");
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(401).json({ error: "Invalid token" });
  }
  const { password: _, ...userWithoutPassword } = user;
  res.json(userWithoutPassword);
});

// GET /api/users - List all users (Admin only in production, here simple)
app.get("/api/users", (req, res) => {
  const publicUsers = users.map(u => {
    const { password: _, ...userWithoutPassword } = u;
    return userWithoutPassword;
  });
  res.json(publicUsers);
});

// POST /api/users - Create a new user
app.post("/api/users", (req, res) => {
  const { username, password, name, allowed_pages, allowed_devices, mobileAccess } = req.body;
  if (!username || !password) return res.status(400).json({ error: "Username and password required" });
  if (users.find(u => u.username === username.toLowerCase())) {
    return res.status(409).json({ error: "User already exists" });
  }
  const newUser: User = {
    id: `user-${Date.now()}`,
    username: username.toLowerCase(),
    password,
    name: name || username,
    role: "user",
    allowed_pages: allowed_pages || ["dashboard"],
    allowed_devices: allowed_devices || [],
    mobileAccess: !!mobileAccess
  };
  users.push(newUser);
  saveUsers();
  const { password: _, ...userWithoutPassword } = newUser;
  res.json(userWithoutPassword);
});

// DELETE /api/users/:id - Delete a user
app.delete("/api/users/:id", (req, res) => {
  const { id } = req.params;
  const index = users.findIndex(u => u.id === id);
  if (index === -1) return res.status(404).json({ error: "User not found" });
  if (users[index].username === "admin") return res.status(400).json({ error: "Cannot delete admin" });

  users.splice(index, 1);
  saveUsers();
  res.json({ success: true });
});

// GET /api/devices - Fetch current state of all devices
app.get("/api/devices", (req, res) => {
  res.json(devices);
});

// POST /api/devices/control - Update state of a single device manually
app.post("/api/devices/control", (req, res) => {
  const { room, device, action, value } = req.body;
  if (!room || !action) {
    return res.status(400).json({ error: "Missing room or action" });
  }
  applyBackendControl(room, device, action, value);
  const updatedDev = devices.find(d => d.room.toLowerCase() === room.toLowerCase() && (!device || d.deviceKey.toLowerCase() === device.toLowerCase()));
  res.json({ success: true, device: updatedDev || null });
});

// POST /api/devices/sync-all - Replace all device states with synchronized array from target
app.post("/api/devices/sync-all", (req, res) => {
  const { devices: newDevices } = req.body;
  if (Array.isArray(newDevices) && newDevices.length > 0) {
    devices = newDevices;
    return res.json({ success: true, count: devices.length });
  }
  return res.status(400).json({ error: "Invalid devices payload" });
});

// GET /api/shopping-list - Fetch current shopping list from central server
app.get("/api/shopping-list", (req, res) => {
  res.json(shoppingList);
});

// POST /api/shopping-list - Sync full shopping list state across all devices
app.post("/api/shopping-list", (req, res) => {
  const { items } = req.body;
  if (Array.isArray(items)) {
    shoppingList = items;
    return res.json({ success: true, count: shoppingList.length, items: shoppingList });
  }
  return res.status(400).json({ error: "Invalid items payload" });
});

// POST /api/shopping-list/add - Add single item to central shopping list
app.post("/api/shopping-list/add", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing item text" });
  }
  const newItem: ShoppingItem = {
    id: Date.now().toString() + Math.random().toString(36).substring(2, 5),
    text: text.trim(),
    completed: false,
    createdAt: Date.now()
  };
  shoppingList = [newItem, ...shoppingList];
  return res.json({ success: true, item: newItem, items: shoppingList });
});

// GET /api/shopping-suggestions - Fetch quick items
app.get("/api/shopping-suggestions", (req, res) => {
  res.json(suggestions);
});

// POST /api/shopping-suggestions - Add a new quick item (Admin only logic on frontend)
app.post("/api/shopping-suggestions", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") return res.status(400).json({ error: "Text required" });
  if (!suggestions.includes(text.trim())) {
    suggestions.push(text.trim());
    saveSuggestions();
  }
  res.json(suggestions);
});

// GET /termux-client.js - Dynamically compiled & pre-configured console client downloader
app.get("/termux-client.js", (req, res) => {
  const filePath = path.join(process.cwd(), "termux-client.js");
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, "utf8");
    // Dynamically calculate and inject current server base URL
    const isHttps = req.headers["x-forwarded-proto"] === "https";
    const host = `${isHttps ? "https" : "http"}://${req.headers["host"]}`;
    content = content.replace(/let SERVER_URL = '[^']*';/, `let SERVER_URL = '${host}';`);
    res.setHeader("Content-Type", "application/javascript");
    return res.send(content);
  }
  res.status(404).send("Client script not found.");
});

// API Route: Parse Commands Locally (non-AI local-only rule engine)
app.post("/api/parse-command", (req, res) => {
  const { text } = req.body;
  if (!text || typeof text !== "string") {
    return res.status(400).json({ error: "Missing text command" });
  }

  const result = parseCommandRuleBased(text);
  // Persist command results to central in-memory state
  result.commands.forEach(cmd => {
    applyBackendControl(cmd.room, cmd.device, cmd.action, cmd.value);
  });

  return res.json({
    ...result,
    source: "local-non-ai-rule-engine"
  });
});

// API Route: Parse Audio Wave/PCM uploaded from ESP32 clients (STT + Command Parser + TTS pipeline)
app.post("/api/parse-audio", upload.single("audio"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No audio file uploaded" });
    }

    console.log(`[Audio] Received file of size ${req.file.size} bytes. MIME type: ${req.file.mimetype}`);

    let transcript = "";
    const hasApiKey = !!process.env.GEMINI_API_KEY;

    if (hasApiKey) {
      try {
        const ai = getGeminiClient();
        console.log("[Audio] Transcribing audio with Gemini 3.5-flash...");
        
        // Construct inline base64 audio part
        const audioPart = {
          inlineData: {
            mimeType: req.file.mimetype || "audio/wav",
            data: req.file.buffer.toString("base64")
          }
        };

        const transcriptionResponse = await ai.models.generateContent({
          model: "gemini-3.5-flash",
          contents: [
            audioPart,
            "You are a Speech-to-Text transcription service for a local smart home assistant named Jerry. Transcribe this audio command exactly. Return only the spoken text and nothing else. No punctuation, no comments. If the audio is silent or unintelligible, respond with an empty string."
          ]
        });

        transcript = transcriptionResponse.text?.trim() || "";
        console.log(`[Audio] Transcribed text: "${transcript}"`);
      } catch (err: any) {
        console.error("[Audio] Transcribing failed, falling back to local simulation command", err.message);
        transcript = "turn on ambient light"; // Safe fallback
      }
    } else {
      console.warn("[Audio] GEMINI_API_KEY is missing. Using default simulation command...");
      transcript = "turn on ambient light";
    }

    if (!transcript) {
      return res.json({
        transcript: "",
        response: "I didn't quite catch that. Could you please try speaking again?",
        commands: [],
        audioUrl: null,
        error: hasApiKey ? undefined : "GEMINI_API_KEY is missing. Defaulted to mock command."
      });
    }

    // 2. Parse command to trigger IoT devices
    const result = parseCommandRuleBased(transcript);
    // Persist parsed commands to in-memory state
    result.commands.forEach(cmd => {
      applyBackendControl(cmd.room, cmd.device, cmd.action, cmd.value);
    });

    // 3. Generate voice response TTS (if API key is present)
    let audioUrl: string | null = null;
    let audioBase64: string | null = null;

    if (hasApiKey) {
      try {
        const ai = getGeminiClient();
        console.log(`[TTS] Generating voice for response: "${result.response}"`);
        
        const ttsResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-tts-preview",
          contents: [{ parts: [{ text: result.response }] }],
          config: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Kore" }, // Warm & responsive assistant voice
              },
            },
          },
        });

        const base64Pcm = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (base64Pcm) {
          const rawPcm = Buffer.from(base64Pcm, "base64");
          // Pack PCM into WAV
          const wavBuffer = pcmToWav(rawPcm, 24000);
          
          // Cache the wav file for subsequent binary streaming
          const cachedId = cacheAudioFile(wavBuffer, "audio/wav");
          audioUrl = `/api/audio/${cachedId}.wav`;
          audioBase64 = wavBuffer.toString("base64");
        }
      } catch (err: any) {
        console.error("[TTS] Failed to generate speech", err.message);
      }
    }

    return res.json({
      transcript,
      response: result.response,
      commands: result.commands,
      audioUrl,
      audioBase64,
      source: hasApiKey ? "gemini-ai-transcription-and-tts" : "fallback-static-mode",
      warning: hasApiKey ? undefined : "Set your GEMINI_API_KEY in the Secrets panel for fully functional Voice AI transcription!"
    });

  } catch (error: any) {
    console.error("[Audio API] Major error:", error);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// API Route: On-demand Text-To-Speech generation (JSON input)
app.post("/api/tts", async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Missing 'text' field in JSON request" });
    }

    if (!process.env.GEMINI_API_KEY) {
      return res.status(400).json({ 
        error: "GEMINI_API_KEY is not set. Go to Settings > Secrets in AI Studio to configure it." 
      });
    }

    const ai = getGeminiClient();
    console.log(`[TTS] Generating voice for on-demand text: "${text}"`);
    
    const ttsResponse = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: text }] }],
      config: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: "Kore" },
          },
        },
      },
    });

    const base64Pcm = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Pcm) {
      return res.status(500).json({ error: "Failed to generate TTS audio data" });
    }

    const rawPcm = Buffer.from(base64Pcm, "base64");
    const wavBuffer = pcmToWav(rawPcm, 24000);
    const cachedId = cacheAudioFile(wavBuffer, "audio/wav");

    return res.json({
      response: text,
      audioUrl: `/api/audio/${cachedId}.wav`,
      audioBase64: wavBuffer.toString("base64")
    });

  } catch (error: any) {
    console.error("[TTS API] Error:", error.message);
    return res.status(500).json({ error: "Internal Server Error", message: error.message });
  }
});

// API Route: Binary streaming endpoint for cached voice responses (critical for lightweight ESP32 low-RAM audio playback)
app.get("/api/audio/:id", (req, res) => {
  const rawId = req.params.id;
  // Strip file extension if any (e.g. voice_123.wav -> voice_123)
  const id = rawId.replace(/\.[^/.]+$/, "");
  
  const cached = audioCache.get(id);
  if (!cached) {
    return res.status(404).send("Audio file not found or expired.");
  }

  res.setHeader("Content-Type", cached.mimeType);
  res.setHeader("Content-Length", cached.buffer.length);
  res.setHeader("Accept-Ranges", "bytes");
  return res.end(cached.buffer);
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
