import { useState } from "react";
import { Terminal, Copy, Check, Info, Shield, Network, Cpu } from "lucide-react";

export default function IntegrationGuide() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const codeBlocks = {
    localServer: `# Step 1: Install Node.js in FydeOS Linux (Crostini)
sudo apt update
sudo apt install -y nodejs npm

# Step 2: Clone or download this project, then enter the folder
# (If you exported the ZIP or connected via git)
cd ~/fydeos-voice-iot-hub

# Step 3: Install all dependencies
npm install

# Step 4: Boot the dashboard server (no internet / no external AI keys needed)
npm run dev`,
    pythonBridge: `import os
import json
import time
from http.server import SimpleHTTPRequestHandler, HTTPServer
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
)

PORT = 8000

class JerryBridgeHandler(SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        # Handle CORS preflight requests from FydeOS container
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
        
        print("\n[Jerry Hub] Received status polling request.")
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
        
        print("\n[Jerry Hub] Received request from Web Voice Hub Dashboard:")
        
        # Scenario A: Natural Language Query / Spoken Voice Command
        query_text = payload.get("query") or payload.get("text")
        if query_text:
            print(f" -> Passing Spoken/Voice query to Assistant: \"{query_text}\"")
            time_init = time.time()
            try:
                # Call execute function, storing return value to pass to frontend
                assistant_response = assistant_openai.execute(query_text)
                print(f" -> Assistant Response: \"{assistant_response}\"")
                
                elapsed = time.time() - time_init
                print(f" -> Execution Success ({elapsed:.3f}s)")
                
                # Return the processed assistant text back to the dashboard frontend
                response_data = {
                    "status": "success",
                    "response": assistant_response,
                    "nc_message": assistant_response,
                    "source": "local-openai-assistant"
                }
            except Exception as e:
                print(f" -> Execution Error: {e}")
                response_data = {
                    "status": "error",
                    "message": f"Local assistant execution failed: {str(e)}"
                }
            self.wfile.write(json.dumps(response_data).encode('utf-8'))
            return

        # Scenario B: Manual Dashboard Button Control (Toggles, Sliders)
        device_id = payload.get("deviceId")
        action = payload.get("action")
        value = payload.get("value")

        # Extract room and device from device_id "room.deviceKey"
        room = None
        device = None
        if device_id and "." in device_id:
            room, device = device_id.split(".", 1)
        elif payload.get("room"):
            room = payload.get("room")
            device = payload.get("device")

        result_msg = "No action executed"
        time_init = time.time()
        
        try:
            if action == "turn_on" and room and device:
                result_msg = turn_on(room, device)
                print(f" -> Executed turn_on({room}, {device}): {result_msg}")
            elif action == "turn_off" and room and device:
                result_msg = turn_off(room, device)
                print(f" -> Executed turn_off({room}, {device}): {result_msg}")
            elif action == "room_on" and room:
                result_msg = room_on(room)
                print(f" -> Executed room_on({room}): {result_msg}")
            elif action == "room_off" and room:
                result_msg = room_off(room)
                print(f" -> Executed room_off({room}): {result_msg}")
            elif action == "set_fan_speed" and room and device:
                result_msg = set_fan_speed(room, device, value)
                print(f" -> Executed set_fan_speed({room}, {device}, {value}): {result_msg}")
            
            elapsed = time.time() - time_init
            print(f"[Jerry Hub] Manual Action success: {result_msg} ({elapsed:.3f}s)")
            
            response_data = {
                "status": "success",
                "message": result_msg,
                "elapsed": f"{elapsed:.3f} seconds"
            }
        except Exception as e:
            print(f"[Jerry Hub] Execution error: {e}")
            response_data = {
                "status": "error",
                "message": str(e)
            }
            
        self.wfile.write(json.dumps(response_data).encode('utf-8'))

if __name__ == "__main__":
    print(f"Jerry Voice IoT Bridge Server active on port {PORT}...")
    print("Directly connected to FydeOS Web Voice Hub!")
    server = HTTPServer(("0.0.0.0", PORT), JerryBridgeHandler)
    server.serve_forever()`,
    chromeFlags: `chrome://flags/#allow-insecure-localhost`
  };

  return (
    <div className="bg-[#111216] border border-[#1e222b] rounded-2xl p-6 text-gray-300 shadow-xl h-full overflow-y-auto space-y-6 scrollbar-thin">
      <div className="flex items-center space-x-3 pb-4 border-b border-[#1e222b]">
        <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
          <Cpu className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-xl font-semibold text-white tracking-tight">FydeOS & Linux Integration Guide</h2>
          <p className="text-xs text-gray-400">Architectural instructions to bridge local devices and cloud intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[#161a22] border border-[#242c3d]/40 rounded-xl p-4 flex items-start space-x-3">
          <Network className="w-5 h-5 text-indigo-400 mt-1 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium text-white">How Network Bridging Works</h4>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              FydeOS's Linux environment (Crostini) operates inside a secure container. It automatically forwards network ports over 1024 to the host.
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
            Running the server directly inside your FydeOS Linux subsystem launches the app on <code className="text-indigo-400 font-mono">http://localhost:3000</code>.
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
      </div>

      <div className="bg-[#1e1b18] border border-amber-500/10 rounded-xl p-4 flex items-start space-x-3">
        <Info className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
        <div className="space-y-1">
          <h5 className="text-xs font-semibold text-amber-400">FydeOS Linux Audio sharing</h5>
          <p className="text-[11px] text-gray-400 leading-relaxed font-sans">
            Ensure you enable <strong>"Microphone access"</strong> in your FydeOS settings under the <strong>Linux development environment</strong> configuration, otherwise the voice assistant will not receive audio streams inside the Crostini terminal context!
          </p>
        </div>
      </div>
    </div>
  );
}
