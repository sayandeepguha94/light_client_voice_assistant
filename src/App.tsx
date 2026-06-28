import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Mic, MicOff, Power, RefreshCw, Volume2, VolumeX, Terminal, 
  Settings, HelpCircle, LayoutGrid, CheckCircle2, AlertCircle, 
  Lightbulb, Thermometer, Wind, Lock, Unlock, ShieldAlert, ShieldCheck, Airplay, Send, Laptop
} from "lucide-react";
import { Device, SystemLog, ConnectionConfig } from "./types";
import ConnectionSettings from "./components/ConnectionSettings";
import IntegrationGuide from "./components/IntegrationGuide";
import SystemLogComponent from "./components/SystemLog";

// Default IoT devices to start with from real configuration
const INITIAL_DEVICES: Device[] = [
  // living room
  { id: "living room.ambient light", name: "Ambient Light", room: "living room", deviceKey: "ambient light", entityId: "switch.living_room_4node_smart_switch_4_ambient_light", category: "lighting", on: true, statusText: "On" },
  { id: "living room.party light", name: "Party Light", room: "living room", deviceKey: "party light", entityId: "switch.living_room_4node_smart_switch_4_party_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.passage light", name: "Passage Light", room: "living room", deviceKey: "passage light", entityId: "switch.living_room_4node_smart_switch_4_passage_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.spot light", name: "Spot Light", room: "living room", deviceKey: "spot light", entityId: "switch.living_room_4node_smart_switch_4_spot_light", category: "lighting", on: false, statusText: "Off" },
  { id: "living room.fan", name: "Ceiling Fan", room: "living room", deviceKey: "fan", entityId: "fan.fan_modular_switch", category: "fan", on: true, value: 3, unit: " Speed", statusText: "Speed 3" },

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

export default function App() {
  // Navigation: "devices" | "voice" | "gateway" | "guide"
  const [activeTab, setActiveTab] = useState<"devices" | "voice" | "gateway" | "guide">("devices");

  // Core App States
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [config, setConfig] = useState<ConnectionConfig>({
    serverIp: "192.168.29.112",
    serverPort: "8000",
    useProxy: false,
    apiPath: "/api"
  });

  // Assistant states
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Hello! I am ready to monitor and control your local IoT ecosystem. Press Space or click the microphone to speak.");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [latency, setLatency] = useState("4.2ms");
  const [currentTime, setCurrentTime] = useState("");

  // Wake Word & Speech Flow states
  const [wakeWordEnabled, setWakeWordEnabled] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);

  // Refs to avoid stale state in async speech events
  const wakeWordEnabledRef = useRef(false);
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);
  const hasBeenWokenUpRef = useRef(false);

  // Helper: Log message to dashboard terminal console
  const addLog = (type: SystemLog["type"], message: string, details?: string) => {
    const timestamp = new Date().toLocaleTimeString();
    const newLog: SystemLog = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp,
      type,
      message,
      details
    };
    setLogs(prev => [newLog, ...prev]);
  };

  // Helper: Generate synth sounds for vocal feedback
  const playBeep = (freq: number, duration: number, type: "sine" | "triangle" | "square" = "sine") => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + duration);
    } catch (e) {
      console.warn("Audio Context beep failed:", e);
    }
  };

  // Handle Text-To-Speech (TTS)
  const speakText = (text: string) => {
    if (!speechSynthesisEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel(); // Stop active voices
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      
      // Select an elegant female/neutral voice if available
      const voices = window.speechSynthesis.getVoices();
      const premiumVoice = voices.find(v => v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Synthesis"));
      if (premiumVoice) {
        utterance.voice = premiumVoice;
      }

      utterance.onstart = () => {
        setIsSpeaking(true);
        isSpeakingRef.current = true;
        // Pause listening while speaking to prevent self-triggering
        try {
          recognitionRef.current?.stop();
        } catch (err) {
          console.warn("Failed to stop listening on speech start:", err);
        }
      };

      utterance.onend = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        // Resume background wake word listening if enabled
        if (wakeWordEnabledRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (wakeWordEnabledRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.warn("Failed to restart wake word listening after speaking end:", e);
              }
            }
          }, 300);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (wakeWordEnabledRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            if (wakeWordEnabledRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.warn("Failed to restart wake word listening after speaking error:", e);
              }
            }
          }, 300);
        }
      };
      
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.error("Speech Synthesis error:", e);
    }
  };

  // Setup Clock and Speech Recognition
  useEffect(() => {
    // Clock
    const timer = setInterval(() => {
      const d = new Date();
      setCurrentTime(d.toLocaleTimeString());
    }, 1000);

    // Dynamic Latency jitter for immersive feel
    const latencyTimer = setInterval(() => {
      const ms = (Math.random() * 3 + 2).toFixed(1);
      setLatency(`${ms}ms`);
    }, 5000);

    addLog("info", "FydeOS Voice IoT Dashboard loaded.", "Awaiting connection parameters or local microphone triggers.");

    // Check Speech Recognition capability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setListening(true);
        setTranscript("");
        // Play beep only for active triggers, not background wake loop restarts
        if (!wakeWordEnabledRef.current || hasBeenWokenUpRef.current) {
          playBeep(880, 0.12, "sine"); // high beep
        }
        addLog("info", "Microphone listening stream initialized.");
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        const cleanText = resultText.trim();
        const lowerText = cleanText.toLowerCase();

        if (wakeWordEnabledRef.current) {
          if (lowerText.includes("jerry")) {
            const jerryIndex = lowerText.indexOf("jerry");
            const commandPart = cleanText.slice(jerryIndex + 5).trim();

            if (commandPart.length > 1) {
              setTranscript(cleanText);
              addLog("voice", `Wake word + Command detected: "${cleanText}"`);
              handleProcessCommand(commandPart);
            } else {
              setTranscript("Jerry?");
              addLog("voice", `Wake word detected. Ready for your command!`);
              playBeep(660, 0.1, "sine");
              setTimeout(() => playBeep(880, 0.1, "sine"), 100);
              setAiResponse("Yes? I am listening...");
              speakText("Yes?");
              hasBeenWokenUpRef.current = true;
            }
          } else if (hasBeenWokenUpRef.current) {
            hasBeenWokenUpRef.current = false;
            setTranscript(cleanText);
            addLog("voice", `Command received after wake word: "${cleanText}"`);
            handleProcessCommand(cleanText);
          } else {
            console.log("Background chatter filtered:", cleanText);
            addLog("info", `Ambient audio filtered (no wake-word 'Jerry' detected): "${cleanText}"`);
          }
        } else {
          setTranscript(cleanText);
          addLog("voice", `Voice command detected: "${cleanText}"`);
          handleProcessCommand(cleanText);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error !== "no-speech") {
          addLog("error", `Voice recognition anomaly: ${event.error}`, "Ensure microphone access is enabled in Chrome settings.");
          playBeep(220, 0.25, "triangle"); // low error beep
        }
        setListening(false);
      };

      rec.onend = () => {
        setListening(false);
        // If wake word is enabled and we are not speaking or processing, restart background listener!
        if (wakeWordEnabledRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
          setTimeout(() => {
            if (wakeWordEnabledRef.current && !isProcessingRef.current && !isSpeakingRef.current) {
              try {
                recognitionRef.current?.start();
              } catch (e) {
                console.warn("Failed to auto-restart speech recognition:", e);
              }
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
    } else {
      addLog("warning", "Web Speech recognition not supported in this iframe/context.", "Please run the application directly in a new tab or verify Chromium version. Standard manual commands are still fully supported.");
    }

    return () => {
      clearInterval(timer);
      clearInterval(latencyTimer);
    };
  }, []);

  // Sync states to refs to avoid stale closures in voice recognition callbacks
  useEffect(() => {
    wakeWordEnabledRef.current = wakeWordEnabled;
    if (wakeWordEnabled && !listening && speechSupported) {
      try {
        window.speechSynthesis.cancel();
        recognitionRef.current?.start();
        addLog("info", "Background listening for Wake Word 'Jerry' activated.");
      } catch (err) {
        console.warn("Failed starting speech recognition for wake word:", err);
      }
    } else if (!wakeWordEnabled && listening) {
      // If disabled and we were listening in wake word mode, stop it
      try {
        recognitionRef.current?.stop();
        addLog("info", "Background listening for Wake Word deactivated.");
      } catch (err) {
        console.warn("Failed stopping speech recognition:", err);
      }
    }
  }, [wakeWordEnabled, listening, speechSupported]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
    if (!isProcessing && wakeWordEnabled && !listening && !isSpeakingRef.current && speechSupported) {
      setTimeout(() => {
        if (!isProcessingRef.current && wakeWordEnabledRef.current && !isSpeakingRef.current) {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            console.warn("Failed to resume wake word after processing:", e);
          }
        }
      }, 500);
    }
  }, [isProcessing, wakeWordEnabled, listening, speechSupported]);

  // Listen for spacebar to trigger voice commands
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        toggleListening();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [listening, speechSupported]);

  // Synchronize live states on start
  useEffect(() => {
    const startSync = setTimeout(() => {
      syncDeviceStates();
    }, 1200);
    return () => clearTimeout(startSync);
  }, []);

  const toggleListening = () => {
    if (!speechSupported) {
      addLog("warning", "Speech Recognition is offline.", "Please type your commands manually in the console below.");
      return;
    }

    if (listening) {
      recognitionRef.current?.stop();
    } else {
      try {
        window.speechSynthesis.cancel(); // Stop talking first
        // If wake word is enabled, mark as woken up so it processes this direct manual trigger as a command
        if (wakeWordEnabled) {
          hasBeenWokenUpRef.current = true;
        }
        recognitionRef.current?.start();
      } catch (err) {
        console.warn("Failed starting speech recognition:", err);
      }
    }
  };

  // core command processor
  const handleProcessCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setAiResponse("Processing command payload...");
    addLog("info", `Forwarding text query to local Jerry AI server at http://${config.serverIp}:${config.serverPort}...`, `Query: "${text}"`);

    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;
    const payload = {
      query: text,
      text: text,
      timestamp: new Date().toISOString()
    };

    try {
      let response;
      if (config.useProxy) {
        response = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            method: "POST",
            body: payload
          })
        });
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 6000); // 6 seconds for local OpenAI parser call
        response = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        throw new Error(`NLP Server responded with status ${response.status}`);
      }

      const result = await response.json();
      const responseData = config.useProxy ? result.data : result;

      if (responseData && responseData.status === "error") {
        throw new Error(responseData.message || "Unknown error from local assistant");
      }

      const spokenConfirmation = responseData.response || responseData.nc_message || responseData.message || "Command executed successfully.";
      
      setAiResponse(spokenConfirmation);
      speakText(spokenConfirmation);
      addLog("success", spokenConfirmation, `Parsed and executed on AI server (${config.serverIp})`);

      // Update local states if returned from assistant_openai
      if (responseData.commands && Array.isArray(responseData.commands) && responseData.commands.length > 0) {
        let updated = false;
        for (const cmd of responseData.commands) {
          if (cmd.action) {
            updateLocalStateOnly(cmd.room, cmd.device, cmd.action, cmd.value);
            updated = true;
          }
        }
        if (!updated) {
          // If commands were returned but empty/null, trigger a live status sync
          setTimeout(() => syncDeviceStates(), 800);
        }
      } else if (responseData.rawJerry || responseData.command) {
        const rj = responseData.rawJerry || responseData.command;
        if (rj.action) {
          updateLocalStateOnly(rj.room, rj.device, rj.action, rj.value);
        } else {
          setTimeout(() => syncDeviceStates(), 800);
        }
      } else {
        // Fallback: trigger a live status sync to match whatever the local server did
        setTimeout(() => syncDeviceStates(), 800);
      }
    } catch (err: any) {
      console.error("Error processing text command on local assistant:", err);
      const errMsg = `Failed to process command on local assistant: ${err.message}. Running rule fallback.`;
      addLog("error", errMsg);
      
      // Local rule fallback
      const lower = text.toLowerCase();
      if (lower.includes("light") && (lower.includes("off") || lower.includes("stop"))) {
        updateLocalStateOnly("living room", "ambient light", "turn_off");
        executeDeviceAction("living room", "ambient light", "turn_off");
        setAiResponse("Fallback: Turning off the living room ambient light.");
        speakText("Turning off the ambient light.");
      } else if (lower.includes("light") && (lower.includes("on") || lower.includes("start"))) {
        updateLocalStateOnly("living room", "ambient light", "turn_on");
        executeDeviceAction("living room", "ambient light", "turn_on");
        setAiResponse("Fallback: Turning on the living room ambient light.");
        speakText("Turning on the ambient light.");
      } else {
        setAiResponse("I encountered an issue communicating with the AI server. You can toggle any device manually above!");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper to update React device state without dispatching HTTP requests (to avoid circular triggers)
  const updateLocalStateOnly = (room: string, deviceKey: string | null, action: string, value?: number) => {
    if (action === "room_on" || action === "room_off") {
      const targetState = action === "room_on";
      setDevices(prevDevices => {
        return prevDevices.map(dev => {
          if (dev.room.toLowerCase() === room.toLowerCase()) {
            return { ...dev, on: targetState, statusText: targetState ? "On" : "Off" };
          }
          return dev;
        });
      });
      addLog("success", `Updated all devices in ${room} locally to [${action}]`);
    } else if (deviceKey) {
      const targetId = `${room.toLowerCase()}.${deviceKey.toLowerCase()}`;
      setDevices(prevDevices => {
        return prevDevices.map(dev => {
          if (dev.id.toLowerCase() === targetId) {
            const updated = { ...dev };
            if (action === "turn_on" || action === "turn_off") {
              updated.on = action === "turn_on";
              updated.statusText = action === "turn_on" ? "On" : "Off";
            } else if (action === "set_fan_speed" && value !== undefined) {
              updated.value = value;
              updated.on = true;
              updated.statusText = `Speed ${value}`;
            }
            return updated;
          }
          return dev;
        });
      });
      addLog("success", `Updated device state locally: ${room} ${deviceKey} to [${action}]`);
    }
  };

  // Execute actual state updates on local devices and forward target API calls to 192.168.29.112
  const executeDeviceAction = async (room: string, deviceKey: string | null, action: string, value?: number) => {
    // Perform the local React UI updates first
    updateLocalStateOnly(room, deviceKey, action, value);

    // Forward the command to local IoT assistant at 192.168.29.112
    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;
    const payload = {
      deviceId: deviceKey ? `${room}.${deviceKey}` : null,
      room,
      device: deviceKey,
      action,
      value,
      timestamp: new Date().toISOString()
    };

    try {
      addLog("info", `Forwarding command to local Jerry assistant: http://${config.serverIp}:${config.serverPort}...`, JSON.stringify(payload));
      
      let dispatchResponse;
      if (config.useProxy) {
        dispatchResponse = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            method: "POST",
            body: payload
          })
        });
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        dispatchResponse = await fetch(targetUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(timeoutId);
      }

      if (dispatchResponse.ok) {
        const responseData = await dispatchResponse.json();
        addLog("success", `Dispatched packet safely to local network assistant at ${config.serverIp}!`, responseData.message || "Done");
      } else {
        throw new Error(`Device responded with error status ${dispatchResponse.status}`);
      }
    } catch (dispatchError: any) {
      console.warn("Direct LAN dispatch failed:", dispatchError);
      addLog(
        "warning",
        `LAN Server ${config.serverIp} unreachable`,
        `Dashboard successfully simulated state change locally, but the remote server at http://${config.serverIp}:${config.serverPort} is currently offline.\nReason: ${dispatchError.message || "Timeout"}.\n\nTips:\n1. Open our "Setup Guide" tab to download a simple Python IoT Bridge Script to run on your local server.\n2. Ensure your FydeOS browser permissions permit mixed-content LAN queries.`
      );
    }
  };

  const syncDeviceStates = async () => {
    setIsSyncing(true);
    addLog("info", `Syncing live device statuses from local Jerry assistant at http://${config.serverIp}:${config.serverPort}...`);
    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;

    try {
      let response;
      if (config.useProxy) {
        response = await fetch("/api/proxy", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url: targetUrl,
            method: "GET"
          })
        });
      } else {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 2000);
        response = await fetch(targetUrl, {
          method: "GET",
          signal: controller.signal,
          mode: "cors"
        });
        clearTimeout(timeoutId);
      }

      if (response.ok) {
        const result = await response.json();
        const responseData = config.useProxy ? result.data : result;

        if (responseData && responseData.states) {
          const remoteStates = responseData.states;
          let updatedCount = 0;

          setDevices(prevDevices => {
            return prevDevices.map(dev => {
              const roomName = dev.room.toLowerCase();
              const deviceKey = dev.deviceKey?.toLowerCase();

              if (deviceKey && remoteStates[roomName] && remoteStates[roomName][deviceKey] !== undefined) {
                const rawState = remoteStates[roomName][deviceKey];
                if (rawState !== null) {
                  const updated = { ...dev };
                  const stateStr = String(rawState).toLowerCase();

                  if (stateStr === "on" || stateStr === "true") {
                    updated.on = true;
                    updated.statusText = dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On";
                  } else if (stateStr === "off" || stateStr === "false") {
                    updated.on = false;
                    updated.statusText = "Off";
                  } else {
                    // E.g. Speed 3, active state attributes, etc.
                    updated.statusText = String(rawState);
                    if (!isNaN(Number(rawState))) {
                      const speedNum = Number(rawState);
                      updated.value = speedNum;
                      updated.on = speedNum > 0;
                    }
                  }
                  updatedCount++;
                  return updated;
                }
              }
              return dev;
            });
          });

          addLog("success", "Synchronization Completed", `Fetched status successfully! Synchronized ${updatedCount} device states from local Home Assistant connection.`);
        } else {
          throw new Error("Local assistant responded successfully but did not return 'states' key.");
        }
      } else {
        throw new Error(`Device responded with error status ${response.status}`);
      }
    } catch (syncError: any) {
      console.warn("Status synchronization failed:", syncError);
      addLog(
        "warning",
        "Failed to pull live states",
        `Could not pull live states from local network assistant at http://${config.serverIp}:${config.serverPort}.\nError details: ${syncError.message || "Timeout"}.\n\nEnsure your local python assistant is running with status endpoint support.`
      );
    } finally {
      setIsSyncing(false);
    }
  };

  const handleManualSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    const cmdText = manualInput;
    setManualInput("");
    handleProcessCommand(cmdText);
  };

  // Helper to choose device icons
  const getDeviceIcon = (dev: Device) => {
    const activeColor = "text-cyan-400";
    const inactiveColor = "text-slate-500";
    
    switch (dev.category) {
      case "lighting":
        return <Lightbulb className={`w-5 h-5 ${dev.on ? activeColor : inactiveColor}`} />;
      case "fan":
        return <Wind className={`w-5 h-5 ${dev.on ? "text-teal-400 animate-[spin_4s_linear_infinite]" : inactiveColor}`} />;
      default:
        return <Airplay className={`w-5 h-5 ${dev.on ? activeColor : inactiveColor}`} />;
    }
  };

  return (
    <div id="app-container" className="min-h-screen bg-[#05060a] text-slate-200 font-sans p-4 md:p-6 flex flex-col justify-between overflow-x-hidden">
      
      {/* Header Panel */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#11131f]/60 backdrop-blur-md border border-white/10 p-4 rounded-2xl shadow-[0_0_20px_rgba(0,0,0,0.5)] mb-6 gap-4 w-full max-w-7xl mx-auto">
        <div className="flex items-center gap-4">
          <div className={`w-3 h-3 rounded-full transition-all duration-500 ${listening ? "bg-purple-500 shadow-[0_0_12px_#a855f7]" : "bg-cyan-400 shadow-[0_0_10px_#22d3ee]"}`}></div>
          <div>
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-cyan-400 flex items-center gap-2">
              FydeOS Voice IoT Hub
              <span className="text-[9px] font-mono font-normal tracking-normal text-slate-400 lowercase px-2 py-0.5 rounded-full bg-white/5">
                v1.2.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">CROSTINI_LINUX_CONTAINER // SECURE_BRIDGE</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-4 md:gap-8 text-left w-full md:w-auto">
          <div className="border-l border-white/10 pl-4 md:pl-6">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Target IoT IP</p>
            <p className="text-xs md:text-sm font-mono text-cyan-200 flex items-center gap-1.5">
              <span>{config.serverIp}</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
            </p>
          </div>
          <div className="border-l border-white/10 pl-4 md:pl-6">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">Local Ping</p>
            <p className="text-xs md:text-sm font-mono text-cyan-200">{latency}</p>
          </div>
          <div className="border-l border-white/10 pl-4 md:pl-6 flex items-center justify-center">
            <p className="text-sm md:text-lg font-light font-mono text-slate-300">
              {currentTime || "12:00:00"}
            </p>
          </div>
        </div>
      </header>

      {/* Navigation Tab Bar */}
      <nav className="w-full max-w-7xl mx-auto mb-6 px-1">
        <div className="flex flex-wrap bg-[#11131f]/70 backdrop-blur-md border border-white/10 p-1 rounded-xl w-full md:w-max gap-1">
          <button
            onClick={() => setActiveTab("devices")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "devices"
                ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.12)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            Ecosystem Devices
          </button>
          <button
            onClick={() => setActiveTab("voice")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "voice"
                ? "bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.12)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Mic className="w-4 h-4" />
            Voice Control Console
          </button>
          <button
            onClick={() => setActiveTab("gateway")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "gateway"
                ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <Settings className="w-4 h-4" />
            Gateway Configuration
          </button>
          <button
            onClick={() => setActiveTab("guide")}
            className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
              activeTab === "guide"
                ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_15px_rgba(16,185,129,0.12)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
          >
            <HelpCircle className="w-4 h-4" />
            Setup Guide & Scripts
          </button>
        </div>
      </nav>

      {/* Primary Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto mb-6 px-1">
        
        {activeTab === "devices" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Rooms and Devices Grid Layout */}
            <div className="lg:col-span-8 bg-[#11131f]/30 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
              <div>
                <div className="flex flex-wrap gap-3 justify-between items-center mb-6 pb-3 border-b border-white/5">
                  <h2 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-cyan-400" />
                    Physical Devices Layout
                  </h2>
                  <div className="flex items-center gap-2.5">
                    <button
                      onClick={syncDeviceStates}
                      disabled={isSyncing}
                      className={`flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] rounded-lg uppercase tracking-wider text-cyan-400 font-bold border border-cyan-500/20 transition-all cursor-pointer ${
                        isSyncing ? "animate-pulse opacity-50" : ""
                      }`}
                      title="Sync current state with local assistant (calls HA get_state)"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
                      <span>{isSyncing ? "Syncing..." : "Sync Live Status"}</span>
                    </button>
                    <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2.5 py-1.5 rounded-full font-bold">
                      {devices.filter(d => d.on).length} / {devices.length} ACTIVE
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {(Object.entries(
                    devices.reduce((acc, dev) => {
                      if (!acc[dev.room]) acc[dev.room] = [];
                      acc[dev.room].push(dev);
                      return acc;
                    }, {} as Record<string, Device[]>)
                  ) as Array<[string, Device[]]>).map(([roomName, roomDevs]) => (
                    <div key={roomName} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col gap-3">
                      <div className="flex justify-between items-center pb-2 border-b border-white/5">
                        <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-400 font-mono">
                          {roomName}
                        </h3>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => executeDeviceAction(roomName, null, "room_on")}
                            className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title={`Turn on all in ${roomName}`}
                          >
                            All On
                          </button>
                          <button
                            onClick={() => executeDeviceAction(roomName, null, "room_off")}
                            className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded transition-colors cursor-pointer"
                            title={`Turn off all in ${roomName}`}
                          >
                            All Off
                          </button>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {roomDevs.map(dev => (
                          <div 
                            key={dev.id} 
                            className="p-3 bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 rounded-xl flex flex-col gap-2 transition-all duration-300"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getDeviceIcon(dev)}
                                <div>
                                  <p className="text-xs font-semibold text-white leading-tight">{dev.name}</p>
                                  <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">{dev.statusText}</p>
                                </div>
                              </div>

                              <button
                                onClick={() => executeDeviceAction(dev.room, dev.deviceKey, dev.on ? "turn_off" : "turn_on")}
                                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                  dev.on 
                                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/35 shadow-[0_0_10px_rgba(34,211,238,0.15)]" 
                                    : "bg-slate-800/40 text-slate-400 border-white/5 hover:bg-slate-800"
                                }`}
                                title={`Turn ${dev.on ? "Off" : "On"}`}
                              >
                                <Power className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {dev.on && dev.category === "fan" && dev.value !== undefined && (
                              <div className="flex items-center gap-2.5 pt-1">
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  value={dev.value}
                                  onChange={(e) => executeDeviceAction(dev.room, dev.deviceKey, "set_fan_speed", parseInt(e.target.value, 10))}
                                  className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                />
                                <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-400/5 px-1.5 py-0.5 rounded">
                                  Speed {dev.value}
                                </span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  FydeOS Subsystem Connection:
                </span>
                <span className="text-emerald-400 font-semibold font-mono">STABLE</span>
              </div>
            </div>

            {/* Diagnostics Stats and Signal Panel */}
            <div className="lg:col-span-4 flex flex-col gap-6">
              
              {/* Signal strength indicators */}
              <div className="bg-[#11131f]/40 border border-white/5 rounded-2xl p-5">
                <div className="flex justify-between items-center mb-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Subsystem Signal Level</p>
                  <span className="text-[10px] font-mono text-cyan-400">92% Signal</span>
                </div>
                <div className="flex items-end gap-1.5 h-16">
                  <div className="flex-1 bg-cyan-400/40 h-[60%] rounded-sm"></div>
                  <div className="flex-1 bg-cyan-400/40 h-[85%] rounded-sm"></div>
                  <div className="flex-1 bg-cyan-400 h-[100%] rounded-sm shadow-[0_0_15px_rgba(34,211,238,0.5)]"></div>
                  <div className="flex-1 bg-cyan-400/40 h-[70%] rounded-sm"></div>
                  <div className="flex-1 bg-cyan-400/40 h-[40%] rounded-sm"></div>
                </div>
              </div>

              {/* Subsystem State Card */}
              <div className="bg-[#11131f]/40 border border-white/5 p-5 rounded-2xl flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4 pb-2 border-b border-white/5 flex items-center gap-2">
                    <Airplay className="w-4 h-4 text-purple-400" />
                    State Diagnostics
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed mb-4">
                    The devices on this page represent physical smart switch nodes configured in your rooms. These updates are synchronized locally to your home hub via:
                  </p>
                  
                  <div className="space-y-2.5 font-mono text-xs">
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-slate-500">Local Ping:</span>
                      <span className="text-cyan-300 font-bold">{latency}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-slate-500">Controller host:</span>
                      <span className="text-slate-300">{config.serverIp}</span>
                    </div>
                    <div className="flex justify-between p-2 bg-white/5 rounded-lg border border-white/5">
                      <span className="text-slate-500">Port target:</span>
                      <span className="text-slate-300">{config.serverPort}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5">
                  <button
                    onClick={() => setDevices(INITIAL_DEVICES)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-lg uppercase tracking-wider transition-colors text-slate-300 font-semibold cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Reset Demo Devices</span>
                  </button>
                </div>
              </div>

            </div>

          </div>
        )}

        {activeTab === "voice" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Speech Assistant Orb and Actions Panel */}
            <div className="lg:col-span-7 flex flex-col justify-between relative bg-[#11131f]/20 border border-white/5 rounded-2xl p-6 overflow-hidden min-h-[480px]">
              
              {/* Immersive Tech Aura Glows */}
              <div className="absolute w-72 h-72 bg-purple-500/5 blur-[80px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute w-48 h-48 bg-cyan-500/5 blur-[60px] rounded-full top-1/3 left-2/3 -translate-x-1/2 -translate-y-1/2"></div>

              <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                  Voice Control Console
                </h3>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setWakeWordEnabled(!wakeWordEnabled)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] rounded-md uppercase tracking-wider transition-colors font-semibold cursor-pointer border ${
                      wakeWordEnabled 
                        ? "bg-purple-500/20 border-purple-500/40 text-purple-300 hover:bg-purple-500/30 shadow-[0_0_10px_rgba(168,85,247,0.15)]" 
                        : "bg-slate-800 hover:bg-slate-700 text-slate-300 border-transparent"
                    }`}
                    title={wakeWordEnabled ? "Disable continuous background listening for wake word 'Jerry'" : "Enable continuous background listening for wake word 'Jerry'"}
                  >
                    <RefreshCw className={`w-3 h-3 ${wakeWordEnabled ? "text-purple-400 animate-spin" : "text-slate-500"}`} />
                    <span>{wakeWordEnabled ? "Wake Word Active" : "Wake Word Off"}</span>
                  </button>

                  <button 
                    onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[9px] rounded-md uppercase tracking-wider transition-colors text-slate-300 font-semibold cursor-pointer"
                    title={speechSynthesisEnabled ? "Mute voice assistant speech synthesis" : "Unmute voice assistant speech synthesis"}
                  >
                    {speechSynthesisEnabled ? <Volume2 className="w-3 h-3 text-cyan-400" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
                    <span>{speechSynthesisEnabled ? "TTS On" : "TTS Muted"}</span>
                  </button>
                </div>
              </div>

              <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm mx-auto my-6">
                
                {/* Floating Speech Orb */}
                <button
                  onClick={toggleListening}
                  className={`w-40 h-40 rounded-full border border-white/10 flex items-center justify-center p-4 transition-all duration-500 cursor-pointer ${
                    listening 
                      ? "shadow-[0_0_30px_rgba(168,85,247,0.35)] border-purple-500/50 scale-105 bg-purple-500/5" 
                      : "hover:border-cyan-400/40 hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] active:scale-95"
                  }`}
                  title="Click to speak smart command"
                >
                  <div className={`w-full h-full rounded-full border flex items-center justify-center transition-all duration-500 ${
                    listening 
                      ? "border-purple-400/50 bg-purple-500/10 shadow-[inset_0_0_30px_rgba(168,85,247,0.25)]" 
                      : "border-cyan-400/30 bg-[#11131f]/40 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                  }`}>
                    {listening ? (
                      <div className="flex items-center gap-1.5 h-10">
                        <div className="w-1 h-5 bg-purple-400 rounded-full animate-pulse"></div>
                        <div className="w-1 h-8 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-12 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7] animate-pulse"></div>
                        <div className="w-1 h-7 bg-purple-400 rounded-full animate-bounce"></div>
                        <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse"></div>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <Mic className="w-7 h-7 text-cyan-400 animate-pulse mb-1" />
                        <span className="text-[9px] font-mono tracking-widest text-slate-500 font-bold uppercase">READY</span>
                      </div>
                    )}
                  </div>
                </button>

                <div className="mt-5 space-y-3 w-full">
                  <p className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors ${listening ? "text-purple-400" : "text-cyan-400"}`}>
                    {listening 
                      ? (wakeWordEnabled && !hasBeenWokenUpRef.current 
                          ? "Background Listening (Say 'Jerry')" 
                          : "Listening for command...") 
                      : (wakeWordEnabled 
                          ? "Wake Word Mode Active" 
                          : "Press Space or click orb to talk")}
                  </p>
                  
                  {transcript && (
                    <div className="flex justify-center">
                      <p className="text-xs text-slate-300 font-medium bg-white/5 border border-white/5 rounded-lg py-1.5 px-3 max-w-xs break-words font-mono">
                        "{transcript}"
                      </p>
                    </div>
                  )}

                  <div className="text-slate-400 text-xs text-center border-t border-white/5 pt-3">
                    <p className="text-slate-400 font-semibold text-[10px] mb-1 uppercase tracking-widest font-mono text-purple-400">Jerry Assistant response</p>
                    <p className="text-slate-200 text-xs leading-relaxed max-w-xs mx-auto">
                      {aiResponse}
                    </p>
                  </div>
                </div>
              </div>

              {/* Integrated Command Input Bar */}
              <div className="relative z-10 border-t border-white/5 pt-4">
                <form onSubmit={handleManualSubmit} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type smart command (e.g. 'Turn on living room ambient light' or 'set dine-in fan speed to 4')..."
                    className="flex-1 bg-transparent border-none text-slate-200 placeholder-slate-500 text-xs focus:outline-none"
                  />
                  <button
                    type="submit"
                    className="p-1.5 text-cyan-400 hover:text-cyan-300 hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                    title="Send command"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>

            </div>

            {/* Right Part: Console System Event Logs */}
            <div className="lg:col-span-5 flex flex-col min-h-[480px]">
              <SystemLogComponent logs={logs} onClear={() => setLogs([])} />
            </div>

          </div>
        )}

        {activeTab === "gateway" && (
          <div className="max-w-4xl mx-auto space-y-6">
            <ConnectionSettings config={config} onChange={setConfig} onLog={addLog} />
            
            <div className="bg-[#11131f]/40 border border-white/5 p-5 rounded-2xl">
              <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-3 pb-2 border-b border-white/5 flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Connection Guidelines
              </h3>
              <ul className="text-xs text-slate-400 space-y-2.5 list-disc pl-4 leading-relaxed">
                <li>Make sure the Python IoT bridge is actively running on your local machine at <code className="text-cyan-400 bg-white/5 px-1 py-0.5 rounded">192.168.29.112:8000</code>.</li>
                <li>If you are accessing this browser UI via our cloud preview, choose the <strong>Proxied Server Connection</strong> to bypass LAN routing restrictions.</li>
                <li>Make sure your browser allows mixed-content if running in <strong>Direct LAN Mode</strong>. You can do this by setting Chrome Flags appropriately as shown in the Guide tab.</li>
              </ul>
            </div>
          </div>
        )}

        {activeTab === "guide" && (
          <div className="max-w-5xl mx-auto">
            <IntegrationGuide />
          </div>
        )}
      </main>

    </div>
  );
}
