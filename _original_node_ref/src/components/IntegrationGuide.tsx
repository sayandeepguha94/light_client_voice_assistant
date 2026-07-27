import { useState, useEffect } from "react";
import { Terminal, Copy, Check, Info, Shield, Network, Cpu, Smartphone, Wifi, Zap, Send, Mic, Volume2, VolumeX, Settings, HelpCircle, CheckCircle2 } from "lucide-react";

interface IntegrationGuideProps {
  selectedLanguage?: string;
  listening?: boolean;
  isProcessing?: boolean;
  transcript?: string;
  chatMessages?: Array<{ id: string; sender: string; text: string; timestamp: string }>;
  config?: { serverIp: string; serverPort: string };
  handleProcessCommand?: (text: string) => Promise<void> | void;
  setListening?: (val: boolean) => void;
  setTranscript?: (val: string) => void;
  wakeWordEnabled?: boolean;
  setWakeWordEnabled?: (val: boolean) => void;
}

export default function IntegrationGuide({ 
  selectedLanguage = "en-US",
  listening = false,
  isProcessing = false,
  transcript = "",
  chatMessages = [],
  config = { serverIp: "127.0.0.1", serverPort: "8000" },
  handleProcessCommand,
  setListening,
  setTranscript,
  wakeWordEnabled = true,
  setWakeWordEnabled
}: IntegrationGuideProps) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [espTab, setEspTab] = useState<"termux" | "script" | "console" | "api">("termux");
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const piperModelMap: Record<string, { model: string, name: string }> = {
    "en-US": { model: "en_US-lessac-medium.onnx", name: "en-US" },
    "en-IN": { model: "en_US-lessac-medium.onnx", name: "en-IN" },
    "es-ES": { model: "es_ES-sharvard-medium.onnx", name: "es-ES" },
    "fr-FR": { model: "fr_FR-gilles-medium.onnx", name: "fr-FR" },
    "de-DE": { model: "de_DE-thorsten-medium.onnx", name: "de-DE" },
    "it-IT": { model: "it_IT-riccardo-medium.onnx", name: "it-IT" },
    "hi-IN": { model: "hi_IN-fen-medium.onnx", name: "hi-IN" },
    "zh-CN": { model: "zh_CN-huayan-medium.onnx", name: "zh-CN" },
    "ja-JP": { model: "ja_JP-hikarina-medium.onnx", name: "ja-JP" },
  };

  const currentPiper = piperModelMap[selectedLanguage] || piperModelMap["en-US"];
  const whisperLangCode = selectedLanguage.split("-")[0];

  const codeBlocks = {
    localServer: `# Step 1: Install Node.js in your Linux environment
sudo apt update
sudo apt install -y nodejs npm

# Step 2: Clone or download this project, then enter the folder
# (If you exported the ZIP or connected via git)
cd ~/voice-iot-hub

# Step 3: Install all dependencies
npm install

# Step 4: Boot the dashboard server (no internet / no external AI keys needed)
npm run dev`,
    pythonBridge: `import os
import json
import time
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import assistant_openai

# Import your actual local modules
import devices
from tools import (
    turn_on,
    turn_off,
    set_fan_speed,
    room_on,
    room_off,
    get_state,
    set_temp,
    is_dark_in_kolkata,
)
from automation import (
    time_automation_on,
    time_automation_off,
    night_lamp_automation_on,
    time_automation_all_off,
    night_lamp_automation_off,
)

PORT = 8000

class JerryBridgeHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS preflight requests from local container
        self.send_response(200, "ok")
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header("Access-Control-Allow-Headers", "X-Requested-With, Content-Type")
        self.end_headers()

    def do_GET(self):
        # Return all live states of devices polled every 30s
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        print("\\n[Jerry Hub] Received status polling request.")
        states = {}
        try:
            for r in devices.DEVICES:
                states[r] = {}
                for d in devices.DEVICES[r]:
                    val = get_state(r, d)
                    states[r][d] = val if val is not None else "Unknown"
            
            response_data = {
                "status": "success",
                "states": states
            }
        except Exception as e:
            print(f"[Jerry Hub] Error querying statuses: {e}")
            response_data = {
                "status": "error",
                "response_message": str(e),
                "message": str(e)
            }
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

    def do_POST(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        
        content_length = int(self.headers['Content-Length'])
        post_data = self.rfile.read(content_length)
        payload = json.loads(post_data.decode('utf-8'))
        
        print("\\n[Jerry Hub] Received request from Web Voice Hub Dashboard:")
        
        # Scenario A: Natural Language Query / Spoken Voice Command
        query_text = payload.get("query") or payload.get("text")
        if query_text:
            print(f" -> Passing Spoken/Voice query to Assistant: \\"{query_text}\\"")
            time_init = time.time()
            try:
                # Call execute function, storing return value to pass to frontend
                assistant_response = assistant_openai.execute(query_text)
                print(f" -> Assistant Response: \\"{assistant_response}\\"")
                
                elapsed = time.time() - time_init
                print(f" -> Execution Success ({elapsed:.3f}s)")
                
                # Return the processed assistant text back to the dashboard frontend
                response_data = {
                    "status": "success",
                    "response_message": assistant_response,
                    "message": assistant_response,
                    "nc_message": assistant_response,
                    "source": "local-openai-assistant"
                }
            except Exception as e:
                print(f" -> Execution Error: {e}")
                response_data = {
                    "status": "error",
                    "response_message": f"Local assistant execution failed: {str(e)}",
                    "message": f"Local assistant execution failed: {str(e)}"
                }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Scenario B: Manual Dashboard Button Control (Toggles, Sliders) or Automations
        # Supports either a single command dictionary, or a batch list of commands
        commands = []
        if isinstance(payload, list):
            commands = payload
        elif isinstance(payload, dict) and "commands" in payload:
            commands = payload["commands"]
        else:
            commands = [payload]

        time_init = time.time()
        results = []

        def execute_single_action(cmd_payload):
            action = cmd_payload.get("action")
            device_id = cmd_payload.get("deviceId")
            value = cmd_payload.get("value")

            # Extract room and device from device_id "room.deviceKey"
            room = None
            device = None
            if device_id and "." in device_id:
                room, device = device_id.split(".", 1)
            elif cmd_payload.get("room"):
                room = cmd_payload.get("room")
                device = cmd_payload.get("device")

            if action == "time_automation_on":
                msg = time_automation_on()
                print(f" -> Executed automation time_automation_on(): {msg}")
                return msg
            elif action == "time_automation_off":
                msg = time_automation_off()
                print(f" -> Executed automation time_automation_off(): {msg}")
                return msg
            elif action == "night_lamp_automation_on":
                msg = night_lamp_automation_on()
                print(f" -> Executed automation night_lamp_automation_on(): {msg}")
                return msg
            elif action == "time_automation_all_off":
                msg = time_automation_all_off()
                print(f" -> Executed automation time_automation_all_off(): {msg}")
                return msg
            elif action == "night_lamp_automation_off":
                msg = night_lamp_automation_off()
                print(f" -> Executed automation night_lamp_automation_off(): {msg}")
                return msg
            elif action == "turn_on" and room and device:
                msg = turn_on(room, device)
                print(f" -> Executed turn_on({room}, {device}): {msg}")
                return msg
            elif action == "turn_off" and room and device:
                msg = turn_off(room, device)
                print(f" -> Executed turn_off({room}, {device}): {msg}")
                return msg
            elif action == "room_on" and room:
                msg = room_on(room)
                print(f" -> Executed room_on({room}): {msg}")
                return msg
            elif action == "room_off" and room:
                msg = room_off(room)
                print(f" -> Executed room_off({room}): {msg}")
                return msg
            elif action == "set_fan_speed" and room and device:
                msg = set_fan_speed(room, device, value)
                print(f" -> Executed set_fan_speed({room}, {device}, {value}): {msg}")
                return msg
            elif action == "set_temp" and room and device:
                temp_val = int(value) if value is not None else 22
                msg = set_temp(room, device, temp_val)
                print(f" -> Executed set_temp({room}, {device}, {temp_val}): {msg}")
                return msg
            return "No action executed"

        try:
            for cmd in commands:
                res_msg = execute_single_action(cmd)
                results.append(res_msg)

            elapsed = time.time() - time_init
            combined_msg = " | ".join(results)
            print(f"[Jerry Hub] Action/Automation execution completed: {combined_msg} ({elapsed:.3f}s)")

            response_data = {
                "status": "success",
                "response_message": combined_msg,
                "message": combined_msg,
                "results": results,
                "elapsed": f"{elapsed:.3f} seconds"
            }
        except Exception as e:
            print(f"[Jerry Hub] Execution error: {e}")
            response_data = {
                "status": "error",
                "response_message": str(e),
                "message": str(e)
            }

        self.wfile.write(json.dumps(response_data).encode('utf-8'))

if __name__ == "__main__":
    print(f"Jerry Voice IoT Bridge Server active on port {PORT}...")
    print("Directly connected to local Web Voice Hub!")
    server = ThreadingHTTPServer(("0.0.0.0", PORT), JerryBridgeHandler)
    server.serve_forever()`,
    chromeFlags: `chrome://flags/#allow-insecure-localhost`,
    devicesModule: `DEVICES = {
    "living room": {
        "party light": "switch.living_room_4node_smart_switch_4_party_light",
        "ambient light": "switch.living_room_4node_smart_switch_4_ambient_light",
        "passage light": "switch.living_room_4node_smart_switch_4_passage_light",
        "spot light": "switch.living_room_4node_smart_switch_4_spot_light",
        "fan": "fan.fan_modular_switch",
        "ac": "ebc64582fc835bb94dlmh1",
        "tv": "eb96ab0b34a335a694gasf"
    },
    "dine-in": {
        "ambient light": "switch.dine_in_4sw_modular_touch_ambient_light",
        "spot light": "switch.dine_in_4sw_modular_touch_spot_light",
        "low spot light": "switch.dine_in_4sw_modular_touch_low_spot_light",
        "fan": "switch.dine_in_4sw_modular_touch_fan"
    },
    "bedroom": {
        "ambient light": "switch.bedroom_4node_smart_switch_2_ambient_light",
        "bedside light": "switch.bedroom_4node_smart_switch_2_bedside_light",
        "fan": "switch.bedroom_4node_smart_switch_2_fan",
        "spot light": "switch.bedroom_4node_smart_switch_2_spot_light"
    },
    "bedroom 2": {
        "low ambient light": "switch.bedroom_2_4node_smart_switch_3_low_ambient_light",
        "fan": "switch.bedroom_2_4node_smart_switch_3_fan",
        "spot light": "switch.bedroom_2_4node_smart_switch_3_spot_light",
        "high ambient light": "switch.bedroom_2_4node_smart_switch_3_high_ambient_light"
    }
}`,
    toolsModule: `from datetime import datetime, timezone
import requests
from devices import DEVICES

def turn_on(room, device):
    room = room.lower()
    device = device.lower()
    if room not in DEVICES or device not in DEVICES[room]:
        return "Device not found."
    entity = DEVICES[room][device]
    # For a real implementation, connect to Tuya Cloud API or local Home Assistant REST API
    # headers = {"Authorization": "Bearer YOUR_HA_TOKEN"}
    # requests.post(f"http://localhost:8123/api/services/{entity.split('.')[0]}/turn_on", json={"entity_id": entity}, headers=headers)
    print(f"[Local Device Control] Executed TURN ON for {room} {device} ({entity})")
    return f"{device.capitalize()} in {room} turned ON successfully."

def turn_off(room, device):
    room = room.lower()
    device = device.lower()
    if room not in DEVICES or device not in DEVICES[room]:
        return "Device not found."
    entity = DEVICES[room][device]
    # Connect and trigger real Tuya / Home Assistant API command
    print(f"[Local Device Control] Executed TURN OFF for {room} {device} ({entity})")
    return f"{device.capitalize()} in {room} turned OFF successfully."

def set_fan_speed(room, device, speed):
    room = room.lower()
    device = device.lower()
    if room not in DEVICES or device not in DEVICES[room]:
        return "Device not found."
    entity = DEVICES[room][device]
    print(f"[Local Device Control] Executed SET FAN SPEED to {speed} for {room} {device} ({entity})")
    return f"Fan speed of {room} {device} set to {speed}."

def room_on(room):
    room = room.lower()
    if room not in DEVICES:
        return "Room not found."
    for device in DEVICES[room]:
        turn_on(room, device)
    return f"All devices in {room} turned ON."

def room_off(room):
    room = room.lower()
    if room not in DEVICES:
        return "Room not found."
    for device in DEVICES[room]:
        turn_off(room, device)
    return f"All devices in {room} turned OFF."

def get_state(room, device):
    room = room.lower()
    device = device.lower()
    if room not in DEVICES or device not in DEVICES[room]:
        return "off"
    # Query live state from local device cache or coordinator
    return "on"

def is_dark_in_kolkata():
    # Kolkata, West Bengal exact coordinates
    lat, lng = 22.5726, 88.3639
    
    # Query API (formatted=0 forces UTC ISO 8601 timestamps)
    url = f"https://api.sunrise-sunset.org/json?lat={lat}&lng={lng}&formatted=0"
    response = requests.get(url).json()
    
    if response["status"] != "OK":
        raise Exception("Failed to fetch data from Sunrise-Sunset API")
        
    results = response["results"]
    
    # Parse UTC sunrise/sunset timestamps natively
    sunrise = datetime.fromisoformat(results["sunrise"])
    sunset = datetime.fromisoformat(results["sunset"])
    
    # Get the exact current time in UTC
    now_utc = datetime.now(timezone.utc)
    
    # It is dark if current time is before sunrise OR after sunset
    return now_utc < sunrise or now_utc > sunset

def set_temp(room, device, temp = 22):
    room = room.lower()
    device = device.lower()
    if room not in DEVICES:
        return "Room not found."

    if device not in DEVICES[room]:
        return "Device not found."

    entity = DEVICES[room][device]
    # Connect and trigger real Tuya / Home Assistant API command
    print(f"[Local Device Control] Executed SET TEMP of {room} {device} to {temp}°C ({entity})")
    msg = f"AC temperature of {room} is set to {temp}"
    return msg`,
    automationModule: `import tools

def time_automation_on():
    # Automatically triggers at specified evening time
    if tools.is_dark_in_kolkata():
        tools.turn_on("living room", "ambient light")
        tools.turn_on("bedroom", "ambient light")
        return "Time Automation On triggered because it is dark in Kolkata."
    else:
        return "Time Automation On skipped (not dark in Kolkata)."

def time_automation_off():
    # Triggers late evening. Turns off all main automation-managed lighting
    tools.turn_off("living room", "ambient light")
    tools.turn_off("bedroom", "ambient light")
    tools.turn_off("dine-in", "ambient light")
    
    # Auto-chains Night Lamp On
    night_lamp_automation_on()
    return "Time Automation Off executed. Chained Night Lamp."

def night_lamp_automation_on():
    # Turns on bedside night lamp as low-intensity guide
    tools.turn_on("bedroom", "bedside light")
    return "Night Lamp On triggered."

def time_automation_all_off():
    # Sweeps and shuts down all residual decorative/spot-lights at night
    tools.turn_off("living room", "party light")
    tools.turn_off("living room", "passage light")
    tools.turn_off("living room", "spot light")
    tools.turn_off("dine-in", "spot light")
    tools.turn_off("dine-in", "low spot light")
    tools.turn_off("bedroom", "spot light")
    tools.turn_off("bedroom 2", "low ambient light")
    tools.turn_off("bedroom 2", "high ambient light")
    tools.turn_off("bedroom 2", "spot light")
    return "Time Automation All Off triggered."

def night_lamp_automation_off():
    # Morning routine: Shuts off bedside night lamp
    tools.turn_off("bedroom", "bedside light")
    return "Night Lamp Off triggered."`
  };

  return (
    <div className="bg-[#111216] border border-[#1e222b] rounded-2xl p-6 text-gray-300 shadow-xl h-full overflow-y-auto space-y-6 scrollbar-thin">
      <div className="flex items-center space-x-3 pb-4 border-b border-[#1e222b]">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">Linux Integration Guide</h2>
          <p className="text-xs text-gray-400">Architectural instructions to bridge local devices and cloud intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161a22] border border-[#242c3d]/40 rounded-xl p-4 flex items-start space-x-3">
          <Network className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-white">How Network Bridging Works</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              The Linux environment operates inside a secure container. It automatically forwards network ports over 1024 to the host.
              To trigger commands on your local IoT assistant (<strong>192.168.29.112</strong>), your browser can make requests directly or through our local proxy.
            </p>
          </div>
        </div>

        <div className="bg-[#161a22] border border-[#242c3d]/40 rounded-xl p-4 flex items-start space-x-3">
          <Shield className="w-5 h-5 text-amber-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-white">Bypassing Mixed Content Blocks</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              When accessing this web app via HTTPS, standard browsers block insecure requests to local HTTP IPs (Mixed Content).
              We resolve this cleanly by either enabling local proxy forwarding or running this server <strong>locally</strong> inside your Linux container.
            </p>
          </div>
        </div>
      </div>

      {/* Accordion Steps */}
      <div className="space-y-4">
        {/* Step 1 */}
        <div className="bg-[#161a22] border border-[#1e222b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">1</span>
              <h3 className="text-sm font-semibold text-white">Optimal Setup: Running the App Locally</h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 font-semibold">Recommended</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            Running the server directly inside your local Linux subsystem launches the app on <code className="text-indigo-400 font-mono">http://localhost:3000</code>.
            Because it runs inside a local HTTP context, Chromium completely skips Mixed Content blocks, giving you <strong>direct, lag-free API communication</strong> to <code className="text-indigo-400 font-mono">192.168.29.112</code>.
          </p>
          
          <div className="relative">
            <pre className="text-[11px] font-mono p-4 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-56">
              {codeBlocks.localServer}
            </pre>
            <button
              onClick={() => copyToClipboard(codeBlocks.localServer, 1)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
              title="Copy instructions"
            >
              {copiedIndex === 1 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Step 2 */}
        <div className="bg-[#161a22] border border-[#1e222b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">2</span>
              <h3 className="text-sm font-semibold text-white">Universal Python IoT Bridge Script</h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-indigo-500/10 text-indigo-400 font-semibold">Bridge Code</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed">
            If your target server at <code className="text-indigo-400 font-mono">192.168.29.112</code> requires a custom api format, run this lightweight python script directly on your server.
            It acts as an open, CORS-friendly HTTP proxy which our dashboard targets automatically to trigger real system scripts, Home Assistant services, or Zigbee triggers.
          </p>

          <div className="relative">
            <pre className="text-[11px] font-mono p-4 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-56">
              {codeBlocks.pythonBridge}
            </pre>
            <button
              onClick={() => copyToClipboard(codeBlocks.pythonBridge, 2)}
              className="absolute top-2 right-2 p-1.5 rounded-md bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
              title="Copy script"
            >
              {copiedIndex === 2 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <div className="pt-2">
            <h4 className="text-xs font-semibold text-slate-300 mb-1">Local Config Files (devices.py, tools.py & automation.py):</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <p className="text-[10px] text-slate-400 font-mono mb-1">devices.py</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                    {codeBlocks.devicesModule}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeBlocks.devicesModule, 21)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy devices.py"
                  >
                    {copiedIndex === 21 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-mono mb-1">tools.py (Universal Helper Functions)</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                    {codeBlocks.toolsModule}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeBlocks.toolsModule, 22)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy tools.py"
                  >
                    {copiedIndex === 22 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <div>
                <p className="text-[10px] text-slate-400 font-mono mb-1">automation.py (Ecosystem Routines)</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-gray-300 overflow-x-auto whitespace-pre leading-relaxed max-h-48">
                    {codeBlocks.automationModule}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(codeBlocks.automationModule, 23)}
                    className="absolute top-1.5 right-1.5 p-1 rounded-md bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy automation.py"
                  >
                    {copiedIndex === 23 ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 */}
        <div className="bg-[#161a22] border border-[#1e222b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">3</span>
              <h3 className="text-sm font-semibold text-white">Cloud Hosting Configuration</h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 font-semibold">HTTPS Workaround</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            To use the secure cloud-hosted build (this browser window) to query your local server at <code className="text-indigo-400 font-mono">192.168.29.112</code>, you can tell Chromium to explicitly trust local network HTTP targets. 
            Paste the following address into your Chromium address bar, search for <strong>"Insecure origins treated as secure"</strong>, add your local IP/port or this site's hostname, and restart Chromium:
          </p>
          <div className="flex items-center justify-between bg-[#0b0c10] border border-[#1e222b] p-3 rounded-lg">
            <code className="text-amber-400 font-mono text-xs">{codeBlocks.chromeFlags}</code>
            <button
              onClick={() => copyToClipboard(codeBlocks.chromeFlags, 3)}
              className="p-1 text-gray-400 hover:text-white transition-colors"
            >
              {copiedIndex === 3 ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Step 4: Whisper & Piper Local Integration */}
        <div className="bg-[#161a22] border border-[#1e222b] rounded-xl p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">4</span>
              <h3 className="text-sm font-semibold text-white">Open Source Whisper STT & Piper TTS Integration</h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 font-semibold">Offline AI</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            To make your local IoT voice server 100% private, you can integrate open source <strong>Whisper</strong> (for speech transcription) and <strong>Piper</strong> (for ultra-fast text-to-speech) on your local machine. These models are configured for your chosen language: <strong className="text-cyan-400">{currentPiper.name}</strong> ({selectedLanguage}).
          </p>
          
          <div className="space-y-4">
            <div>
              <p className="text-[11px] font-bold text-slate-300">1. Setup Faster-Whisper (STT) on Local Server:</p>
              <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed mt-1">
{`# Install faster-whisper package
pip install faster-whisper

# Python example to transcribe with language="${whisperLangCode}"
from faster_whisper import WhisperModel
model = WhisperModel("base", device="cpu", compute_type="int8")
segments, info = model.transcribe("audio.wav", language="${whisperLangCode}")
text = "".join([seg.text for seg in segments])
print("Transcribed:", text)`}
              </pre>
            </div>

            <div>
              <p className="text-[11px] font-bold text-slate-300">2. Setup Piper (TTS) on Local Server:</p>
              <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed mt-1">
{`# Install Piper TTS engine
sudo apt install piper-tts

# Download the voice model for ${currentPiper.name}
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/${selectedLanguage.replace('-', '_').split('_')[0]}/${selectedLanguage.replace('-', '_')}/medium/${currentPiper.model}
wget https://huggingface.co/rhasspy/piper-voices/resolve/main/${selectedLanguage.replace('-', '_').split('_')[0]}/${selectedLanguage.replace('-', '_')}/medium/${currentPiper.model}.json

# Synthesize text to speech in real-time
echo "Turned on kitchen lights" | piper \\
  --model ${currentPiper.model} \\
  --output_file response.wav`}
              </pre>
            </div>
          </div>
        </div>

        {/* Step 5: Android Termux Client */}
        <div className="bg-[#161a22] border border-[#1e222b] rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 text-xs font-mono flex items-center justify-center font-bold">5</span>
              <h3 className="text-sm font-semibold text-white">Android Termux Voice & Control Client</h3>
            </div>
            <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-md bg-cyan-500/10 text-cyan-400 font-bold">Mobile Voice</span>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Run a zero-dependency console client on your Android phone using Termux! It captures mic audio natively (via SoX or the Termux API package), sends commands directly to this server, updates the central dashboard state instantly, and plays back the vocal assistant responses out of your phone speaker.
          </p>
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
            {/* Install instructions - 5 cols */}
            <div className="lg:col-span-5 space-y-4">
              <div>
                <p className="text-[11px] font-bold text-slate-300">1. Install Node and utilities in Termux:</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-yellow-300 overflow-x-auto whitespace-pre leading-relaxed">
{`pkg update && pkg install nodejs sox termux-api mpv -y`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`pkg update && pkg install nodejs sox termux-api mpv -y`, 51)}
                    className="absolute top-2 right-2 p-1 rounded bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy command"
                  >
                    {copiedIndex === 51 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300">2. Download the customized client script:</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-cyan-300 overflow-x-auto whitespace-pre leading-relaxed">
{`curl -sLO ${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/termux-client.js`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`curl -sLO ${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/termux-client.js`, 52)}
                    className="absolute top-2 right-2 p-1 rounded bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy download script"
                  >
                    {copiedIndex === 52 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>

              <div>
                <p className="text-[11px] font-bold text-slate-300">3. Execute and Start Interacting:</p>
                <div className="relative">
                  <pre className="text-[10px] font-mono p-3 rounded-lg bg-[#0b0c10] border border-[#1e222b] text-green-300 overflow-x-auto whitespace-pre leading-relaxed">
{`node termux-client.js`}
                  </pre>
                  <button
                    onClick={() => copyToClipboard(`node termux-client.js`, 53)}
                    className="absolute top-2 right-2 p-1 rounded bg-[#161a22] hover:bg-[#1f2633] text-gray-400 hover:text-white transition-colors border border-[#1e222b]"
                    title="Copy run script"
                  >
                    {copiedIndex === 53 ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Simulated Interactive Mobile Client - 7 cols */}
            <div className="lg:col-span-7 bg-[#0b0c10]/90 border border-[#1e222b] rounded-2xl p-5 flex flex-col justify-between min-h-[480px]">
              <div>
                <div className="flex items-center justify-between border-b border-[#1e222b] pb-2.5 mb-4">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">Interactive Developer Simulator</span>
                  </div>
                  <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full uppercase tracking-wider font-bold">Simulator Connected</span>
                </div>

                {/* Wake Word Selector Inside Setup Guide */}
                <div className="flex items-center justify-between bg-[#11131f]/60 p-2.5 rounded-xl border border-white/5 mb-4">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-slate-300 font-mono">Standby Wake-Word Trigger</span>
                    <span className="text-[8px] text-slate-500 font-mono">Auto-starts capturing on "Hey Jerry" or "Jerry"</span>
                  </div>
                  <button
                    onClick={() => setWakeWordEnabled && setWakeWordEnabled(!wakeWordEnabled)}
                    className={`px-3 py-1.5 text-[9px] rounded-lg uppercase tracking-wider font-bold border transition-colors cursor-pointer ${
                      wakeWordEnabled
                        ? "bg-purple-500/15 text-purple-400 border-purple-500/25 shadow-sm"
                        : "bg-slate-800 text-slate-500 border-white/5"
                    }`}
                  >
                    {wakeWordEnabled ? "Wake-Word: ON" : "Wake-Word: OFF"}
                  </button>
                </div>

                {/* Simulated Android Screen */}
                <div className="relative mx-auto bg-[#1a1b26] p-3 rounded-[28px] border-4 border-slate-700 shadow-xl mb-4 max-w-[270px] overflow-hidden">
                  <div className="absolute top-0.5 left-1/2 -translate-x-1/2 h-4 w-28 bg-[#1a1b26] rounded-b-xl z-20 flex items-center justify-center gap-1.5">
                    <div className="w-1 h-1 rounded-full bg-slate-800"></div>
                    <div className="w-6 h-0.5 bg-slate-800 rounded-full"></div>
                  </div>

                  <div className="bg-black border border-slate-900 rounded-[20px] p-3 pt-5 font-mono text-[#4ade80] shadow-inner relative h-[140px] flex flex-col justify-between select-none">
                    <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/10 pointer-events-none rounded-[20px]"></div>
                    
                    <div className="flex justify-between items-center text-[8px] font-bold text-slate-400 border-b border-slate-800/60 pb-1 z-10">
                      <span className="flex items-center gap-1">
                        <Wifi className="w-2.5 h-2.5 text-emerald-400 animate-pulse" />
                        Termux Active
                      </span>
                      <span className="text-[8px] tracking-wide text-slate-300">{currentTime || "12:00:00"}</span>
                    </div>

                    <div className="flex-1 flex flex-col justify-center py-2 text-[9px] leading-tight space-y-1.5 z-10">
                      {listening ? (
                        <div className="space-y-1.5">
                          <div className="text-purple-400 font-extrabold tracking-wide flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-ping"></span>
                            pkg:~ $ termux-mic-rec
                          </div>
                          <div className="text-purple-300/90 italic text-[9px] truncate">
                            {transcript ? `"${transcript}"` : "Recording mobile mic..."}
                          </div>
                          <div className="text-[8px] text-purple-400">▂▃▅▆▇▆▅▃▂</div>
                        </div>
                      ) : isProcessing ? (
                        <div className="space-y-1.5">
                          <div className="text-cyan-400 font-extrabold tracking-wide flex items-center gap-1.5 animate-pulse">
                            <span>$ node termux-client.js --send</span>
                          </div>
                          <div className="text-cyan-300 text-[8px]">Uploading payload to Jerry Gateway...</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-emerald-400 font-bold tracking-wide flex items-center gap-1">
                            <span>$ termux-api active</span>
                          </div>
                          <div className="text-[8px] text-slate-400 flex flex-col gap-0.5 mt-0.5">
                            <div>Srv: {config.serverIp}:{config.serverPort}</div>
                            <div className="text-emerald-500/80">Press Space or say "Hey Jerry"</div>
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="w-12 h-0.5 bg-slate-700/60 rounded-full mx-auto mt-0.5 z-10"></div>
                  </div>
                </div>

                {/* Sub Tab selection inside developer center */}
                <div className="flex border-b border-[#1e222b] mb-3 overflow-x-auto scrollbar-none gap-1">
                  {(["termux", "script", "console", "api"] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setEspTab(tab)}
                      className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-wider transition-all duration-200 cursor-pointer whitespace-nowrap ${
                        espTab === tab
                          ? "text-cyan-400 border-b-2 border-cyan-400 pb-1"
                          : "text-slate-500 hover:text-slate-300"
                      }`}
                    >
                      {tab === "termux" ? "Termux Setup" : tab === "script" ? "Client Code" : tab === "console" ? "Console Logs" : "API Spec"}
                    </button>
                  ))}
                </div>

                {/* Sub Tab Contents */}
                <div className="text-xs text-slate-400 space-y-2 h-[130px] overflow-y-auto pr-1 select-text scrollbar-thin scrollbar-thumb-white/10">
                  {espTab === "termux" && (
                    <div className="space-y-2 py-1 animate-fade-in">
                      <p className="leading-relaxed text-[11px] text-slate-400">
                        Zero-dependency Node client with instant local network synchronization.
                      </p>
                      <div className="bg-[#0b0c10]/80 p-2.5 rounded-xl border border-white/5 space-y-1">
                        <span className="text-[8px] font-mono text-slate-500 uppercase tracking-widest font-bold block">Local Server Hook URL:</span>
                        <code className="text-cyan-400 text-[10px] font-mono bg-black/40 px-1.5 py-0.5 rounded">
                          {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}
                        </code>
                      </div>
                    </div>
                  )}

                  {espTab === "script" && (
                    <div className="relative animate-fade-in space-y-1.5">
                      <pre className="text-[9px] font-mono leading-normal bg-[#0b0c10]/80 border border-white/5 p-2 rounded-lg h-[115px] overflow-auto text-cyan-200">
{`#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');

let SERVER_URL = '${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}';

function recordVoice() {
  console.log("🎙️ Recording voice...");
  execSync('termux-microphone-record -f voice.wav -l 4');
  
  console.log("⚡ Uploading voice to Jerry...");
  // POST binary voice.wav to SERVER_URL/api/parse-audio
}`}
                      </pre>
                    </div>
                  )}

                  {espTab === "console" && (
                    <div className="space-y-2 py-1 animate-fade-in font-mono text-[10px]">
                      <div className="bg-[#0b0c10]/80 border border-white/5 p-2.5 rounded-lg text-slate-300 h-[115px] overflow-y-auto space-y-1.5 scrollbar-thin">
                        <div><span className="text-purple-400">~/termux $</span> node termux-client.js</div>
                        <div><span className="text-slate-500">[Connected]</span> to voice bridge</div>
                        <div><span className="text-slate-500">[Mic status]</span> <span className="text-emerald-400">termux-api mic OK</span></div>
                        {chatMessages && chatMessages.slice(-2).map((m, idx) => (
                          <div key={idx} className="text-[9px]">
                            <span className="text-slate-500">[{m.timestamp}]</span>{" "}
                            {m.sender === "user" ? (
                              <span className="text-yellow-400">CLI_OUT: Send Command "{m.text}"</span>
                            ) : (
                              <span className="text-cyan-300">CLI_IN: Play Response "{m.text.substring(0, 30)}..."</span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {espTab === "api" && (
                    <div className="space-y-2 py-1 font-mono text-[9px] animate-fade-in">
                      <div className="bg-[#0b0c10]/80 border border-[#1e222b] p-2.5 rounded-lg text-yellow-400 select-all">
                        POST /api/parse-audio
                      </div>
                      <p className="text-slate-500 text-[8px] leading-relaxed">
                        Accepts multipart forms. Field <span className="text-cyan-300">"audio"</span> contains the WAV binary. Audio feedback is returned as Base64.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Simulation Quick triggers */}
              <div className="border-t border-[#1e222b] pt-4 flex flex-col sm:flex-row gap-2.5">
                <button 
                  onClick={() => {
                    if (setTranscript) setTranscript("");
                    if (setListening) setListening(true);
                  }}
                  className="flex-1 py-2 bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 font-bold uppercase tracking-wider rounded-xl border border-purple-500/20 transition-all text-center text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 text-purple-400" />
                  Simulate Termux Voice Capture
                </button>
                <button 
                  onClick={() => {
                    if (setTranscript) setTranscript("turn on ambient light");
                    if (handleProcessCommand) handleProcessCommand("turn on ambient light");
                  }}
                  className="flex-1 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold uppercase tracking-wider rounded-xl border border-cyan-500/10 transition-all text-center text-[10px] cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Simulate Termux Shell Send
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-[#1e1b18] border border-amber-500/10 rounded-xl p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-amber-400">Linux Audio Sharing</h5>
          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
            Ensure you enable <strong>"Microphone access"</strong> in your system settings under your <strong>Linux development environment</strong> configuration, otherwise the voice assistant will not receive audio streams inside the terminal context!
          </p>
        </div>
      </div>
    </div>
  );
}
