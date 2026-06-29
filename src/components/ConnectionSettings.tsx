import { useState } from "react";
import { ConnectionConfig } from "../types";
import { Link2, Link2Off, RefreshCw, Radio, CheckCircle, AlertTriangle } from "lucide-react";

interface ConnectionSettingsProps {
  config: ConnectionConfig;
  onChange: (config: ConnectionConfig) => void;
  onLog: (type: "info" | "success" | "warning" | "error", msg: string, details?: string) => void;
}

export default function ConnectionSettings({ config, onChange, onLog }: ConnectionSettingsProps) {
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error"; message: string }>({
    status: "idle",
    message: "",
  });

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult({ status: "idle", message: "" });
    onLog("info", "Starting connectivity test to local IoT server...", `Target: http://${config.serverIp}:${config.serverPort}${config.apiPath}`);

    const targetUrl = `http://${config.serverIp}:${config.serverPort}${config.apiPath}`;

    try {
      if (config.useProxy) {
        // Test via server-side proxy
        const res = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            method: "POST",
            body: { test: true },
          }),
        });

        const result = await res.json();
        if (res.ok) {
          setTestResult({
            status: "success",
            message: `Connection successful via local node proxy! Server responded: ${JSON.stringify(result.data || "OK")}`,
          });
          onLog("success", "Connection verified successfully via server proxy.", JSON.stringify(result.data));
        } else {
          throw new Error(result.message || "Proxy connection failed");
        }
      } else {
        // Direct browser-side fetch
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3500);

        const res = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ test: true }),
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(timeoutId);

        const text = await res.text();
        setTestResult({
          status: "success",
          message: `Direct browser connection successful! Status: ${res.status} ${res.statusText}`,
        });
        onLog("success", "Direct browser connection verified successfully.", text);
      }
    } catch (err: any) {
      console.warn("Connection test failed:", err);
      let errorMsg = err.message || "Failed to reach server.";
      if (err.name === "AbortError") {
        errorMsg = "Connection timed out. Target IP might be offline or unreachable.";
      }

      setTestResult({
        status: "error",
        message: `${errorMsg} (Verify local IP, check mixed-content browser restrictions, or switch to Proxy Mode)`,
      });

      onLog(
        "warning",
        "Local IoT server unreachable.",
        `Error: ${errorMsg}. If running in our cloud preview, direct network calls to a private home IP (192.168.29.112) will fail because private networks aren't routable from the public cloud. Try proxying or running this dashboard locally inside your local Linux environment!`
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="bg-[#111216] border border-[#1e222b] rounded-2xl p-5 text-gray-300 shadow-xl space-y-5">
      <div className="flex items-center justify-between border-b border-[#1e222b] pb-3">
        <div className="flex items-center space-x-2">
          <Radio className="w-5 h-5 text-indigo-400 animate-pulse" />
          <h3 className="text-sm font-semibold text-white">IoT Gateway Configuration</h3>
        </div>
        <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-full font-mono font-bold tracking-wider">
          {config.useProxy ? "PROXY ACTIVE" : "DIRECT LAN MODE"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Server Local IP</label>
          <input
            type="text"
            value={config.serverIp}
            onChange={(e) => onChange({ ...config, serverIp: e.target.value })}
            className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="192.168.29.112"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Gateway Port</label>
          <input
            type="text"
            value={config.serverPort}
            onChange={(e) => onChange({ ...config, serverPort: e.target.value })}
            className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="8000"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">API Target Path</label>
          <input
            type="text"
            value={config.apiPath}
            onChange={(e) => onChange({ ...config, apiPath: e.target.value })}
            className="w-full bg-[#161a22] border border-[#242c3d] rounded-lg px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-indigo-500 transition-colors"
            placeholder="/api"
          />
        </div>
      </div>

      {/* Mode Switches */}
      <div className="bg-[#161a22] border border-[#242c3d]/40 rounded-xl p-4 space-y-3">
        <span className="text-[11px] uppercase tracking-wider text-gray-400 font-mono">Request Routing Strategy</span>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {/* Direct Mode Button */}
          <button
            onClick={() => onChange({ ...config, useProxy: false })}
            className={`flex items-start text-left p-3 rounded-lg border transition-all ${
              !config.useProxy
                ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-300"
                : "bg-[#0b0c10] border-[#1e222b] hover:bg-[#1a1f29] text-gray-400"
            }`}
          >
            <div className="mt-0.5 mr-2">
              <Link2 className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Direct Browser Connection</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                Dispatches REST calls straight from Chrome to LAN. Fast, but modern browsers require mixed-content bypass flags over HTTPS.
              </p>
            </div>
          </button>

          {/* Proxy Mode Button */}
          <button
            onClick={() => onChange({ ...config, useProxy: true })}
            className={`flex items-start text-left p-3 rounded-lg border transition-all ${
              config.useProxy
                ? "bg-indigo-500/10 border-indigo-500/35 text-indigo-300"
                : "bg-[#0b0c10] border-[#1e222b] hover:bg-[#1a1f29] text-gray-400"
            }`}
          >
            <div className="mt-0.5 mr-2">
              <Link2Off className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-white">Proxied Server Connection</p>
              <p className="text-[10px] text-gray-400 mt-0.5 leading-tight">
                Funnels calls through our Node.js `/api/proxy`. Bypasses browser blocks entirely. Essential when running this app locally in a Linux environment!
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Connection Tester Controls & Display */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-3">
        <button
          onClick={handleTestConnection}
          disabled={testing}
          className="bg-indigo-500 hover:bg-indigo-600 disabled:bg-indigo-500/40 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-colors flex items-center justify-center space-x-2 shadow-lg shadow-indigo-500/10 active:scale-95"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${testing ? "animate-spin" : ""}`} />
          <span>{testing ? "Testing Ping..." : "Test Connection"}</span>
        </button>

        {testResult.status !== "idle" && (
          <div
            className={`flex-1 flex items-start space-x-2 text-xs p-2.5 rounded-lg border ${
              testResult.status === "success"
                ? "bg-emerald-500/5 border-emerald-500/20 text-emerald-300"
                : "bg-rose-500/5 border-rose-500/20 text-rose-300"
            }`}
          >
            {testResult.status === "success" ? (
              <CheckCircle className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-400 mt-0.5 flex-shrink-0" />
            )}
            <span className="leading-tight text-[11px] font-sans">{testResult.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
