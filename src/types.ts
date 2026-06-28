export interface Device {
  id: string; // room + "." + deviceKey
  name: string; // Human readable name
  room: string; // "living room", "dine-in", "bedroom", "bedroom 2"
  deviceKey: string; // "party light", "ambient light", etc.
  entityId: string; // "switch.living_room_..."
  category: "lighting" | "fan";
  on: boolean;
  value?: number; // speed/level
  unit?: string;
  statusText: string;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  type: "info" | "success" | "warning" | "error" | "voice";
  message: string;
  details?: string;
}

export interface ConnectionConfig {
  serverIp: string;
  serverPort: string;
  useProxy: boolean;
  apiPath: string;
}

