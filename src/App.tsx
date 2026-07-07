import { useState, useEffect, useRef, FormEvent } from "react";
import { 
  Mic, MicOff, Power, RefreshCw, Volume2, VolumeX, Terminal, 
  Settings, HelpCircle, LayoutGrid, CheckCircle2, AlertCircle, 
  Lightbulb, Thermometer, Wind, Lock, Unlock, ShieldAlert, ShieldCheck, Airplay, Send, Laptop,
  ChevronDown, ChevronUp, Zap, Clock
} from "lucide-react";
import { Device, SystemLog, ConnectionConfig, ChatMessage } from "./types";
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

// Dynamically creates a 2-second silent WAV file in-memory.
// Browsers have an optimization/loop bug with ultra-short (0-byte/header-only) audio files
// which causes them to spin-loop at 100% CPU. A 2-second silent audio file solves this completely.
const createSilentWavUrl = (durationSeconds = 2, sampleRate = 8000): string => {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const numSamples = sampleRate * durationSeconds;
  const dataSize = numSamples * blockAlign;
  const chunkSize = 36 + dataSize;

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF identifier "RIFF"
  view.setUint32(0, 0x52494646, false);
  // File size minus 8
  view.setUint32(4, chunkSize, true);
  // WAVE identifier
  view.setUint32(8, 0x57415645, false);

  // format chunk identifier "fmt "
  view.setUint32(12, 0x666d7420, false);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk identifier "data"
  view.setUint32(36, 0x64617461, false);
  view.setUint32(40, dataSize, true);

  // Silence is represented by zeros in 16-bit PCM
  for (let i = 0; i < numSamples; i++) {
    view.setInt16(44 + i * 2, 0, true);
  }

  const blob = new Blob([buffer], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

export default function App() {
  // Check if accessed by localhost
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // Navigation: "devices" | "schedules" | "chat" | "configurations"
  const [activeTab, setActiveTab] = useState<"devices" | "schedules" | "chat" | "configurations">("devices");
  const [activeConfigSubTab, setActiveConfigSubTab] = useState<"gateway" | "console" | "guide">("gateway");

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
  const [aiResponse, setAiResponse] = useState("Hello! I am ready to monitor and control your local IoT ecosystem. Tap Space or click the microphone to speak.");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [latency, setLatency] = useState("4.2ms");
  const [currentTime, setCurrentTime] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");

  // Automation Panel States
  const [automationMode, setAutomationMode] = useState<"all-off" | "all-on" | "custom">("custom");
  const [isDarkInKolkata, setIsDarkInKolkata] = useState<boolean>(true);
  const [sunsetInfo, setSunsetInfo] = useState<{
    sunrise: string;
    sunset: string;
    lastChecked: string;
    isAutoSynced: boolean;
    error: string | null;
  } | null>(null);
  const [isLoadingSunset, setIsLoadingSunset] = useState<boolean>(false);

  const [automations, setAutomations] = useState<Record<string, { id: string; name: string; time: string; enabled: boolean; lastRun?: string }>>({
    time_automation_on: { id: "time_automation_on", name: "Time Automation On", time: "18:00", enabled: true },
    time_automation_off: { id: "time_automation_off", name: "Time Automation Off", time: "22:30", enabled: true },
    time_automation_all_off: { id: "time_automation_all_off", name: "Time Automation All Off", time: "23:00", enabled: true },
    night_lamp_automation_off: { id: "night_lamp_automation_off", name: "Night Lamp Automation Off", time: "06:00", enabled: true },
  });

  const devicesRef = useRef(devices);
  useEffect(() => {
    devicesRef.current = devices;
  }, [devices]);

  const runAutomation = (id: string, isScheduled: boolean = false) => {
    addLog("success", `Automation Run Initialized: ${id}`, isScheduled ? "Triggered by schedule" : "Triggered manually");
    
    // Track execution
    setAutomations(prev => ({
      ...prev,
      [id]: { ...prev[id], lastRun: new Date().toLocaleTimeString() }
    }));

    if (id === "time_automation_on") {
      if (!isDarkInKolkata) {
        addLog("warning", "Time Automation On Aborted", "Kolkata Sunset Detector reports it is not dark yet.");
        return;
      }
      
      // Turn on "time lights" (Ambient Light, Low Ambient Light, High Ambient Light)
      const targetKeys = ["ambient light", "low ambient light", "high ambient light"];
      let count = 0;
      devicesRef.current.forEach(dev => {
        if (dev.deviceKey && targetKeys.includes(dev.deviceKey.toLowerCase())) {
          if (!dev.on) {
            executeDeviceAction(dev.room, dev.deviceKey, "turn_on");
            count++;
          }
        }
      });
      addLog("success", "Time Automation On Executed", `Turned on ${count} ambient/time lights because it is dark in Kolkata.`);
    }

    if (id === "time_automation_off") {
      // Turn off devices in DEVICES except fan and ac.
      // DEVICES has: "ambient light", "low ambient light", "high ambient light", "bedside light"
      let count = 0;
      devicesRef.current.forEach(dev => {
        const r = dev.room.toLowerCase();
        const k = dev.deviceKey?.toLowerCase();
        if (k && k !== "fan" && k !== "ac") {
          // Is it an automation-managed device?
          const isAutomationDev = 
            (r === "living room" && k === "ambient light") ||
            (r === "dine-in" && k === "ambient light") ||
            (r === "bedroom" && (k === "ambient light" || k === "bedside light")) ||
            (r === "bedroom 2" && (k === "low ambient light" || k === "high ambient light"));
            
          if (isAutomationDev && dev.on) {
            executeDeviceAction(dev.room, dev.deviceKey, "turn_off");
            count++;
          }
        }
      });
      addLog("success", "Time Automation Off Executed", `Turned off ${count} automation lights (excluding fan/ac).`);

      // Requirement 5: "when time_automation_off will get triggered, then night_lamp_automation_on will get triggered."
      addLog("info", "Chained Action: Triggering Night Lamp Automation On...");
      setTimeout(() => {
        runAutomation("night_lamp_automation_on");
      }, 800);
    }

    if (id === "time_automation_all_off") {
      // Turn off devices in missing_devices except fan and ac.
      // missing_devices has: spot light, low spot light, tv, party light, passage light.
      let count = 0;
      devicesRef.current.forEach(dev => {
        const r = dev.room.toLowerCase();
        const k = dev.deviceKey?.toLowerCase();
        if (k && k !== "fan" && k !== "ac") {
          // If it is NOT in the automation-managed devices set, it is in missing_devices!
          const isAutomationDev = 
            (r === "living room" && k === "ambient light") ||
            (r === "dine-in" && k === "ambient light") ||
            (r === "bedroom" && (k === "ambient light" || k === "bedside light")) ||
            (r === "bedroom 2" && (k === "low ambient light" || k === "high ambient light"));
            
          if (!isAutomationDev && dev.on) {
            executeDeviceAction(dev.room, dev.deviceKey, "turn_off");
            count++;
          }
        }
      });
      addLog("success", "Time Automation All Off Executed", `Turned off ${count} other/missing devices (excluding fan/ac).`);
    }

    if (id === "night_lamp_automation_on") {
      // Turn on bedside light in bedroom
      const dev = devicesRef.current.find(d => d.room.toLowerCase() === "bedroom" && d.deviceKey?.toLowerCase() === "bedside light");
      if (dev) {
        if (!dev.on) {
          executeDeviceAction(dev.room, dev.deviceKey, "turn_on");
          addLog("success", "Night Lamp Automation On Executed", "Turned on bedroom bedside light.");
        } else {
          addLog("info", "Night Lamp Automation On", "Bedside light is already on.");
        }
      } else {
        addLog("warning", "Night Lamp Automation On Failed", "No bedside light found in bedroom.");
      }
    }

    if (id === "night_lamp_automation_off") {
      // Turn off bedside light in bedroom
      const dev = devicesRef.current.find(d => d.room.toLowerCase() === "bedroom" && d.deviceKey?.toLowerCase() === "bedside light");
      if (dev) {
        if (dev.on) {
          executeDeviceAction(dev.room, dev.deviceKey, "turn_off");
          addLog("success", "Night Lamp Automation Off Executed", "Turned off bedroom bedside light.");
        } else {
          addLog("info", "Night Lamp Automation Off", "Bedside light is already off.");
        }
      } else {
        addLog("warning", "Night Lamp Automation Off Failed", "No bedside light found in bedroom.");
      }
    }
  };

  // Background Automation Scheduler Timer
  useEffect(() => {
    let lastCheckedMinute = "";
    
    const checkSchedule = () => {
      // If master mode is "all-off", none of the schedules can run
      if (automationMode === "all-off") return;

      const now = new Date();
      const currentHHMM = now.toTimeString().substring(0, 5); // "HH:MM"
      
      // Prevent running multiple times in the same minute
      if (currentHHMM === lastCheckedMinute) return;

      Object.keys(automations).forEach((id) => {
        const auto = automations[id];
        // Schedule is active if: master mode is "all-on" OR (master mode is "custom" and individual schedule is enabled)
        const isScheduleActive = automationMode === "all-on" || (automationMode === "custom" && auto.enabled);
        
        if (isScheduleActive && auto.time === currentHHMM) {
          lastCheckedMinute = currentHHMM;
          runAutomation(id, true);
        }
      });
    };

    const interval = setInterval(checkSchedule, 1000);
    return () => clearInterval(interval);
  }, [automations, automationMode, isDarkInKolkata]);

  // Chat History & Expandable Rooms States
  const [expandedRooms, setExpandedRooms] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: "initial",
      sender: "assistant",
      text: "Hello! I am ready to monitor and control your local IoT ecosystem. Tap Space or click the microphone to speak.",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const toggleRoom = (roomName: string) => {
    setExpandedRooms(prev => {
      const isCurrentlyExpanded = !!prev[roomName];
      return {
        ...prev,
        [roomName]: !isCurrentlyExpanded
      };
    });
  };

  // Speech Flow states
  const [isSpeaking, setIsSpeaking] = useState(false);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);
  const listeningTimeoutRef = useRef<any>(null);

  // Refs to avoid stale state in async speech events
  const isProcessingRef = useRef(false);
  const isSpeakingRef = useRef(false);

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

  // Real-time API Integration for Kolkata Sunset Sensor
  const fetchKolkataDarkStatus = async () => {
    setIsLoadingSunset(true);
    try {
      // Exact coordinates of Kolkata (lat 22.5726, lng 88.3639)
      const response = await fetch("https://api.sunrise-sunset.org/json?lat=22.5726&lng=88.3639&formatted=0");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      if (data.status === "OK") {
        const results = data.results;
        const sunrise = new Date(results.sunrise);
        const sunset = new Date(results.sunset);
        const nowUtc = new Date();
        
        // It is dark if current time is before sunrise OR after sunset
        const isDark = nowUtc < sunrise || nowUtc > sunset;
        setIsDarkInKolkata(isDark);
        setSunsetInfo({
          sunrise: sunrise.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          sunset: sunset.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          lastChecked: new Date().toLocaleTimeString(),
          isAutoSynced: true,
          error: null
        });
        addLog("info", "Kolkata Sunset sensor synced with API.", `Coords: 22.5726°N, 88.3639°E. Dark: ${isDark ? "YES" : "NO"}`);
      } else {
        throw new Error("API response status not OK");
      }
    } catch (err: any) {
      console.error("Sunset API Error:", err);
      setSunsetInfo(prev => ({
        sunrise: prev?.sunrise || "--:--",
        sunset: prev?.sunset || "--:--",
        lastChecked: new Date().toLocaleTimeString(),
        isAutoSynced: false,
        error: "API connection offline"
      }));
      addLog("error", "Kolkata Sunset API Sync Failed", err.message || "Failed to reach sunrise-sunset.org");
    } finally {
      setIsLoadingSunset(false);
    }
  };

  useEffect(() => {
    fetchKolkataDarkStatus();
    // Auto re-sync sunset data every 10 minutes to stay accurate
    const syncInterval = setInterval(fetchKolkataDarkStatus, 10 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // Helper: Generate synth sounds for vocal feedback
  const playBeep = (freq: number, duration: number, type: "sine" | "triangle" | "square" = "sine", volume: number = 0.08) => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = type;
      oscillator.frequency.value = freq;
      
      gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
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
      utterance.lang = selectedLanguage;
      
      // Select an elegant female/neutral voice in the chosen language if available
      const voices = window.speechSynthesis.getVoices();
      const langPrefix = selectedLanguage.split('-')[0];
      const premiumVoice = voices.find(v => v.lang.startsWith(langPrefix) && (v.name.includes("Google") || v.name.includes("Natural") || v.name.includes("Synthesis")))
        || voices.find(v => v.lang.startsWith(langPrefix));
        
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
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
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

    addLog("info", "Voice IoT Dashboard loaded.", "Awaiting connection parameters or local microphone triggers.");

    // Check Speech Recognition capability
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = selectedLanguage;

      rec.onstart = () => {
        setListening(true);
        setTranscript("");
        playBeep(880, 0.25, "sine", 0.9); // extra loud high beep for blue -> purple transition
        addLog("info", "Microphone listening stream initialized.");

        // Automatically stop listening after 6 seconds
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
        }
        listeningTimeoutRef.current = setTimeout(() => {
          addLog("info", "Auto-stopped listening after 6 seconds limit reached.");
          try {
            recognitionRef.current?.stop();
          } catch (err) {
            console.warn("Failed to stop listening after 6 seconds:", err);
          }
        }, 6000);
      };

      rec.onresult = (event: any) => {
        const resultText = event.results[0][0].transcript;
        const cleanText = resultText.trim();
        setTranscript(cleanText);
        addLog("voice", `Voice command detected: "${cleanText}"`);
        handleProcessCommand(cleanText);
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error !== "no-speech") {
          addLog("error", `Voice recognition anomaly: ${event.error}`, "Ensure microphone access is enabled in Chrome settings.");
          playBeep(220, 0.25, "triangle"); // low error beep
        }
        setListening(false);
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
          listeningTimeoutRef.current = null;
        }
      };

      rec.onend = () => {
        setListening(false);
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
          listeningTimeoutRef.current = null;
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

  // Sync selected language with Speech Recognition
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = selectedLanguage;
      addLog("info", `Speech recognition language updated to: ${selectedLanguage}`);
    }
  }, [selectedLanguage]);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  // Listen for spacebar to trigger voice commands
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
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

  // Auto-scroll chat history to bottom
  useEffect(() => {
    if (activeTab === "chat") {
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    }
  }, [chatMessages, activeTab]);

  const toggleListening = () => {
    if (!speechSupported) {
      addLog("warning", "Speech Recognition is offline.", "Please type your commands manually in the console below.");
      return;
    }

    if (listening) {
      try {
        recognitionRef.current?.stop();
        setListening(false);
      } catch (err) {
        console.warn("Error stopping speech recognition:", err);
      }
    } else {
      try {
        window.speechSynthesis.cancel(); // Stop talking first
        recognitionRef.current?.start();
        setListening(true); // Immediate visual feedback for touchscreens
      } catch (err) {
        console.warn("Failed starting speech recognition:", err);
        setListening(false);
      }
    }
  };

  // Keep a mutable ref of the latest toggleListening function to avoid stale closure issues in background listeners
  const toggleListeningRef = useRef(toggleListening);
  useEffect(() => {
    toggleListeningRef.current = toggleListening;
  }, [toggleListening]);

  // Activate Media Session & Bluetooth Controls safely (preventing memory leaks, multiple instances or system lag)
  useEffect(() => {
    addLog("info", "Background media controller activation triggered.");
    console.log("Activating media session...");

    let lastToggleTime = 0;

    // Create silent audio of 2 seconds so the browser does not spin-loop a 0-second file at 100% CPU
    const silentAudioUrl = createSilentWavUrl(2, 8000);
    const audio = new Audio();
    audio.src = silentAudioUrl;
    audio.loop = true;

    const startAudio = () => {
      audio.play()
        .then(() => {
          console.log("Silent background audio play successful.");
        })
        .catch((err) => {
          console.warn("Autoplay blocked. Click anywhere on the page to activate.", err);
        });
    };

    // Attempt autoplay
    startAudio();

    // Interaction triggers to bypass browser autoplay policy
    const handleFirstInteraction = () => {
      startAudio();
      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
    };
    window.addEventListener("click", handleFirstInteraction);
    window.addEventListener("keydown", handleFirstInteraction);

    // Listen for media session actions
    if ("mediaSession" in navigator) {
      const actions = [
        "play",
        "pause",
        "previoustrack",
        "nexttrack",
        "stop",
        "seekbackward",
        "seekforward"
      ] as const;

      actions.forEach(action => {
        try {
          navigator.mediaSession.setActionHandler(action, () => {
            console.log("Bluetooth button pressed:", action);
            addLog("info", `Bluetooth controller action detected: ${action.toUpperCase()}`);
            
            // Map main play/pause Bluetooth events to toggle the voice command listener
            if (action === "play" || action === "pause") {
              const now = Date.now();
              if (now - lastToggleTime > 800) {
                lastToggleTime = now;
                addLog("voice", `Toggling Voice Assistant from Bluetooth ${action} action.`);
                toggleListeningRef.current();
              } else {
                console.log(`Ignored rapid duplicate Bluetooth release event: ${action}`);
              }
            }
          });
        } catch (e) {
          console.warn("Action not supported:", action);
        }
      });
    }

    // Fallback for devices that send keycodes (filtered to avoid logging/lagging while typing in inputs)
    const handleDevicesKeyDown = (e: KeyboardEvent) => {
      if (
        document.activeElement?.tagName === "INPUT" || 
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.hasAttribute("contenteditable")
      ) {
        return;
      }
      
      console.log("Key pressed:", e.code);
      addLog("info", `Hardware controller key detected: ${e.code}`);
    };
    window.addEventListener("keydown", handleDevicesKeyDown);

    // Cleanup when component unmounts to prevent memory/event leak (keeps system fast and snappy)
    return () => {
      console.log("Deactivating media session...");
      try {
        audio.pause();
        audio.src = "";
        audio.load();
      } catch (err) {
        console.warn("Error stopping background audio:", err);
      }

      try {
        URL.revokeObjectURL(silentAudioUrl);
      } catch (err) {
        console.warn("Error revoking silent audio ObjectURL:", err);
      }

      window.removeEventListener("click", handleFirstInteraction);
      window.removeEventListener("keydown", handleFirstInteraction);
      window.removeEventListener("keydown", handleDevicesKeyDown);

      if ("mediaSession" in navigator) {
        const actions = [
          "play",
          "pause",
          "previoustrack",
          "nexttrack",
          "stop",
          "seekbackward",
          "seekforward"
        ] as const;
        actions.forEach(action => {
          try {
            navigator.mediaSession.setActionHandler(action, null);
          } catch (e) {
            // ignore
          }
        });
      }
    };
  }, []);

  // core command processor
  const handleProcessCommand = async (text: string) => {
    if (!text.trim()) return;
    setIsProcessing(true);
    setAiResponse("Processing command payload...");
    addLog("info", `Forwarding text query to local Jerry AI server at http://${config.serverIp}:${config.serverPort}...`, `Query: "${text}"`);

    // Add user message to chat history
    const userMsg: ChatMessage = {
      id: "user-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
      sender: "user",
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setChatMessages(prev => [...prev, userMsg]);

    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;
    const payload = {
      query: text,
      text: text,
      language: selectedLanguage,
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
        throw new Error(responseData.response_message || responseData.message || "Unknown error from local assistant");
      }

      const spokenConfirmation = responseData.response_message || responseData.message || responseData.response || responseData.nc_message || "Command executed successfully.";
      
      setAiResponse(spokenConfirmation);
      speakText(spokenConfirmation);
      addLog("success", spokenConfirmation, `Parsed and executed on AI server (${config.serverIp})`);

      // Add assistant response to chat history
      const assistantMsg: ChatMessage = {
        id: "assistant-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        sender: "assistant",
        text: spokenConfirmation,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMsg]);

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
      let fallbackText = "I encountered an issue communicating with the AI server. You can toggle any device manually above!";
      const lower = text.toLowerCase();
      if (lower.includes("light") && (lower.includes("off") || lower.includes("stop"))) {
        updateLocalStateOnly("living room", "ambient light", "turn_off");
        executeDeviceAction("living room", "ambient light", "turn_off");
        fallbackText = "Fallback: Turning off the living room ambient light.";
        setAiResponse(fallbackText);
        speakText("Turning off the ambient light.");
      } else if (lower.includes("light") && (lower.includes("on") || lower.includes("start"))) {
        updateLocalStateOnly("living room", "ambient light", "turn_on");
        executeDeviceAction("living room", "ambient light", "turn_on");
        fallbackText = "Fallback: Turning on the living room ambient light.";
        setAiResponse(fallbackText);
        speakText("Turning on the ambient light.");
      } else {
        setAiResponse(fallbackText);
      }

      // Add fallback assistant response to chat history
      const assistantMsg: ChatMessage = {
        id: "assistant-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        sender: "assistant",
        text: fallbackText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, assistantMsg]);
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
              updated.statusText = action === "turn_on" ? (dev.category === "ac" && dev.value ? `${dev.value}°C` : "On") : "Off";
            } else if (action === "set_fan_speed" && value !== undefined) {
              updated.value = value;
              updated.on = true;
              updated.statusText = `Speed ${value}`;
            } else if (action === "set_temp" && value !== undefined) {
              updated.value = value;
              updated.on = true;
              updated.statusText = `${value}°C`;
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
        addLog("success", `Dispatched packet safely to local network assistant at ${config.serverIp}!`, responseData.response_message || responseData.message || "Done");
      } else {
        throw new Error(`Device responded with error status ${dispatchResponse.status}`);
      }
    } catch (dispatchError: any) {
      console.warn("Direct LAN dispatch failed:", dispatchError);
      addLog(
        "warning",
        `LAN Server ${config.serverIp} unreachable`,
        `Dashboard successfully simulated state change locally, but the remote server at http://${config.serverIp}:${config.serverPort} is currently offline.\nReason: ${dispatchError.message || "Timeout"}.\n\nTips:\n1. Open our "Setup Guide" tab to download a simple Python IoT Bridge Script to run on your local server.\n2. Ensure your browser permissions permit mixed-content LAN queries.`
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
      case "ac":
        return <Thermometer className={`w-5 h-5 ${dev.on ? "text-amber-400 animate-pulse" : inactiveColor}`} />;
      case "media":
        return <Laptop className={`w-5 h-5 ${dev.on ? "text-purple-400" : inactiveColor}`} />;
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
            <h1 className="text-sm font-bold tracking-[0.2em] uppercase text-cyan-400 flex flex-wrap items-center gap-2">
              Voice IoT Hub
              <span className="text-[9px] font-mono font-normal tracking-normal text-slate-400 lowercase px-2 py-0.5 rounded-full bg-white/5">
                v1.2.0
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">LOCAL_LINUX_CONTAINER // SECURE_BRIDGE</p>
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
              onClick={() => setActiveTab("schedules")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === "schedules"
                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Clock className="w-4 h-4" />
              Automation Schedules
            </button>
            <button
              onClick={() => setActiveTab("chat")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === "chat"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.12)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Mic className="w-4 h-4" />
              Voice & Chat Assistant
            </button>
            <button
              onClick={() => setActiveTab("configurations")}
              className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                activeTab === "configurations"
                  ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-[0_0_15px_rgba(99,102,241,0.12)]"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Settings className="w-4 h-4" />
              Configurations
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

                <div className="flex flex-col gap-5">
                  {(Object.entries(
                    devices.reduce((acc, dev) => {
                      if (!acc[dev.room]) acc[dev.room] = [];
                      acc[dev.room].push(dev);
                      return acc;
                    }, {} as Record<string, Device[]>)
                  ) as Array<[string, Device[]]>).map(([roomName, roomDevs]) => {
                    const isExpanded = !!expandedRooms[roomName];
                    const activeCount = roomDevs.filter(d => d.on).length;
                    
                    return (
                      <div 
                        key={roomName} 
                        className={`p-4 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col transition-all duration-300 ${isExpanded ? "gap-3" : "gap-0"}`}
                      >
                        <div 
                          onClick={() => toggleRoom(roomName)}
                          className="flex justify-between items-center cursor-pointer select-none hover:bg-white/[0.03] p-2 -m-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            {isExpanded ? <ChevronUp className="w-4 h-4 text-cyan-400" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                            <h3 className="text-xs font-bold tracking-widest uppercase text-cyan-400 font-mono">
                              {roomName}
                            </h3>
                            <span className="text-[9px] font-mono text-slate-400 bg-cyan-400/10 px-1.5 py-0.5 rounded-full font-bold">
                              {activeCount}/{roomDevs.length} Active
                            </span>
                          </div>
                          {isLocalhost && (
                            <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => executeDeviceAction(roomName, null, "room_on")}
                                className="text-[9px] text-emerald-400 hover:text-emerald-300 font-bold uppercase tracking-wider bg-emerald-500/10 px-2.5 py-1 rounded transition-colors cursor-pointer"
                                title={`Turn on all in ${roomName}`}
                              >
                                All On
                              </button>
                              <button
                                onClick={() => executeDeviceAction(roomName, null, "room_off")}
                                className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider bg-rose-500/10 px-2.5 py-1 rounded transition-colors cursor-pointer"
                                title={`Turn off all in ${roomName}`}
                              >
                                All Off
                              </button>
                            </div>
                          )}
                        </div>

                        {isExpanded && (
                          <div className="space-y-2 mt-3 animate-fade-in border-t border-white/5 pt-3">
                            {roomDevs.map(dev => (
                              <div 
                                key={dev.id} 
                                onClick={(e) => {
                                  // Only toggle if they didn't click on the range input
                                  if ((e.target as HTMLElement).tagName !== "INPUT") {
                                    executeDeviceAction(dev.room, dev.deviceKey, dev.on ? "turn_off" : "turn_on");
                                  }
                                }}
                                className={`p-3 border rounded-xl flex flex-col gap-2 transition-all duration-300 cursor-pointer ${
                                  dev.on 
                                    ? "bg-cyan-500/10 border-cyan-500/25 hover:bg-cyan-500/15" 
                                    : "bg-white/5 hover:bg-white/10 border-white/5 hover:border-white/10"
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    {getDeviceIcon(dev)}
                                    <div>
                                      <p className="text-xs font-semibold text-white leading-tight">{dev.name}</p>
                                      <p className="text-[10px] text-slate-400 font-mono leading-none mt-1">{dev.statusText}</p>
                                    </div>
                                  </div>

                                  <div
                                    className={`p-1.5 rounded-lg border transition-all ${
                                      dev.on 
                                        ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/35 shadow-[0_0_10px_rgba(34,211,238,0.25)]" 
                                        : "bg-slate-800/40 text-slate-400 border-white/5"
                                    }`}
                                    title={`Turn ${dev.on ? "Off" : "On"}`}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                  </div>
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

                                {dev.on && dev.category === "ac" && dev.value !== undefined && (
                                  <div className="flex items-center gap-2.5 pt-1">
                                    <input
                                      type="range"
                                      min="16"
                                      max="30"
                                      value={dev.value}
                                      onChange={(e) => executeDeviceAction(dev.room, dev.deviceKey, "set_temp", parseInt(e.target.value, 10))}
                                      className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    />
                                    <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-400/5 px-1.5 py-0.5 rounded">
                                      {dev.value}°C
                                    </span>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-white/5 flex justify-between items-center text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5 text-slate-400" />
                  Linux Subsystem Connection:
                </span>
                <span className="text-emerald-400 font-semibold font-mono">STABLE</span>
              </div>
            </div>

            {/* Ecosystem Automations Control Panel */}
            <div className="lg:col-span-4 flex flex-col">
              
              {/* Master Control Card */}
              <div className="bg-[#11131f]/40 border border-white/5 p-5 rounded-2xl flex flex-col justify-between h-full gap-6">
                <div>
                  <div className="flex justify-between items-center pb-2 border-b border-white/5 mb-4">
                    <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400 animate-pulse" />
                      Ecosystem Automations
                    </h3>
                    <span className="text-[10px] font-mono text-cyan-400 font-bold bg-cyan-400/10 px-2.5 py-0.5 rounded-full animate-pulse">
                      Active
                    </span>
                  </div>

                  {/* Master Mode Selector (All Off, All On, Custom) */}
                  <div className="bg-slate-900/60 border border-white/5 rounded-xl p-3.5 flex flex-col gap-2 mb-4">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Master Mode Selector</span>
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                        automationMode === "all-off" ? "bg-rose-500/10 text-rose-400" :
                        automationMode === "all-on" ? "bg-emerald-500/10 text-emerald-400" : "bg-cyan-500/10 text-cyan-400"
                      }`}>
                        {automationMode === "all-off" ? "All Off" :
                         automationMode === "all-on" ? "Override (All On)" : "Custom Schedules"}
                      </span>
                    </div>
                    <select
                      value={automationMode}
                      onChange={(e) => {
                        const val = e.target.value as "all-off" | "all-on" | "custom";
                        setAutomationMode(val);
                        addLog("info", `Master Automation Mode switched to: ${val.toUpperCase()}`);
                      }}
                      className="bg-[#11131f] border border-white/10 text-xs text-slate-200 px-3 py-2 rounded-lg focus:outline-none focus:border-cyan-400/50 cursor-pointer font-sans w-full"
                    >
                      <option value="all-off">🔴 All Off (Pause All Schedules)</option>
                      <option value="all-on">🟢 All On (Activate All Schedules)</option>
                      <option value="custom">⚙️ Custom (Follow Individual Rules)</option>
                    </select>
                  </div>

                  {/* Kolkata Environment Sensor with real Sunset API Integration */}
                  <div className="bg-slate-900/40 border border-white/5 rounded-xl p-3.5 flex flex-col gap-3">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <div className="flex flex-col">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                          Kolkata Sunset Sensor
                        </span>
                        <span className="text-[9px] text-slate-500 font-mono">is_dark_in_kolkata()</span>
                      </div>
                      <button
                        onClick={fetchKolkataDarkStatus}
                        disabled={isLoadingSunset}
                        className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/5 disabled:opacity-50"
                        title="Re-sync with Sunrise-Sunset API"
                      >
                        <RefreshCw className={`w-3 h-3 ${isLoadingSunset ? 'animate-spin text-cyan-400' : ''}`} />
                      </button>
                    </div>

                    {sunsetInfo ? (
                      <div className="grid grid-cols-2 gap-2 text-[10px] font-mono bg-black/20 p-2 rounded-lg border border-white/5">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500 uppercase text-[8px] tracking-wider">Sunrise (Local)</span>
                          <span className="text-amber-400 font-bold">🌅 {sunsetInfo.sunrise}</span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-slate-500 uppercase text-[8px] tracking-wider">Sunset (Local)</span>
                          <span className="text-indigo-400 font-bold">🌙 {sunsetInfo.sunset}</span>
                        </div>
                        <div className="col-span-2 pt-1.5 border-t border-white/5 flex justify-between items-center text-[8px] text-slate-500">
                          <span>Checked: {sunsetInfo.lastChecked}</span>
                          {sunsetInfo.isAutoSynced ? (
                            <span className="text-emerald-500 flex items-center gap-0.5">● Synced</span>
                          ) : (
                            <span className="text-rose-400">Offline Fallback</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-2 text-[10px] text-slate-500 font-mono">
                        {isLoadingSunset ? "Querying Sunrise-Sunset API..." : "No sunset data loaded."}
                      </div>
                    )}

                    <div className="flex justify-between items-center gap-3 bg-black/10 p-2 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-400">Current Sensor Status</span>
                      <button
                        onClick={() => {
                          setIsDarkInKolkata(!isDarkInKolkata);
                          addLog("info", `Manual dark override triggered. Kolkata environment dark: ${!isDarkInKolkata}`);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all cursor-pointer ${
                          isDarkInKolkata 
                            ? "bg-indigo-500/15 text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.1)]" 
                            : "bg-amber-500/15 text-amber-400 border-amber-500/30 hover:bg-amber-500/25"
                        }`}
                      >
                        {isDarkInKolkata ? "🌙 Dark (Active)" : "☀️ Light (Inactive)"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

            </div>

          </div>
        )}

        {/* Schedules and Automation List Tab */}
        {activeTab === "schedules" && (
          <div className="w-full max-w-5xl mx-auto bg-[#11131f]/20 border border-white/5 p-6 rounded-2xl flex flex-col gap-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center pb-4 border-b border-white/10 gap-4">
              <div>
                <h2 className="text-sm font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  Scheduled Automation Tasks
                </h2>
                <p className="text-[11px] text-slate-500 mt-1 font-mono">
                  CONFIGURE AND MANAGE AUTOMATED IoT ROUTINES BY CLOCK TIME SENSORS
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-full ${
                  automationMode === "all-off" ? "bg-rose-500/10 text-rose-400 border border-rose-500/20" :
                  automationMode === "all-on" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                }`}>
                  Master Mode: {automationMode === "all-off" ? "ALL OFF (PAUSED)" : automationMode === "all-on" ? "ALL ON (OVERRIDE)" : "CUSTOM"}
                </span>
                <button
                  onClick={() => {
                    setDevices(INITIAL_DEVICES);
                    addLog("info", "Reset simulated device states to default layout.");
                  }}
                  className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] rounded-lg uppercase tracking-wider transition-colors text-slate-300 font-semibold cursor-pointer border border-white/5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Reset Devices
                </button>
              </div>
            </div>

            {/* Schedules Grid Layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* time_automation_on */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-cyan-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200">Time Automation On</span>
                        <span className="block text-[9px] font-mono text-cyan-400 mt-0.5">is_dark_in_kolkata() == true</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={automations.time_automation_on.enabled}
                        disabled={automationMode !== "custom"}
                        onChange={(e) => {
                          setAutomations(prev => ({
                            ...prev,
                            time_automation_on: { ...prev.time_automation_on, enabled: e.target.checked }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-cyan-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    Automatically triggers at the specified evening time. Turns on ambient and decorative lighting in active rooms, but only if the sunset detector reports it is dark in Kolkata.
                  </p>
                </div>
                
                <div className="flex gap-3 items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Target Time:</span>
                    <input
                      type="time"
                      value={automations.time_automation_on.time}
                      onChange={(e) => {
                        setAutomations(prev => ({
                          ...prev,
                          time_automation_on: { ...prev.time_automation_on, time: e.target.value }
                        }));
                      }}
                      className="bg-transparent text-xs text-cyan-400 font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={() => runAutomation("time_automation_on")}
                    className="px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] text-cyan-400 font-bold uppercase tracking-wider rounded-xl border border-cyan-500/20 transition-all cursor-pointer"
                  >
                    Trigger Now
                  </button>
                </div>
                {automations.time_automation_on.lastRun && (
                  <span className="text-[9px] font-mono text-slate-600">
                    Last execution: {automations.time_automation_on.lastRun}
                  </span>
                )}
              </div>

              {/* time_automation_off */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200">Time Automation Off</span>
                        <span className="block text-[9px] font-mono text-purple-400 mt-0.5">Auto-chains Night Lamp</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={automations.time_automation_off.enabled}
                        disabled={automationMode !== "custom"}
                        onChange={(e) => {
                          setAutomations(prev => ({
                            ...prev,
                            time_automation_off: { ...prev.time_automation_off, enabled: e.target.checked }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-purple-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    Triggers late evening. Turns off all main automation-managed lighting (excluding active climate controls like fan and AC). Automatically triggers the chained Night Lamp routine.
                  </p>
                </div>

                <div className="flex gap-3 items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Target Time:</span>
                    <input
                      type="time"
                      value={automations.time_automation_off.time}
                      onChange={(e) => {
                        setAutomations(prev => ({
                          ...prev,
                          time_automation_off: { ...prev.time_automation_off, time: e.target.value }
                        }));
                      }}
                      className="bg-transparent text-xs text-purple-400 font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={() => runAutomation("time_automation_off")}
                    className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-[10px] text-purple-400 font-bold uppercase tracking-wider rounded-xl border border-purple-500/20 transition-all cursor-pointer"
                  >
                    Trigger Now
                  </button>
                </div>
                {automations.time_automation_off.lastRun && (
                  <span className="text-[9px] font-mono text-slate-600">
                    Last execution: {automations.time_automation_off.lastRun}
                  </span>
                )}
              </div>

              {/* night_lamp_automation_on (Chained indicator) */}
              <div className="bg-indigo-500/5 border border-dashed border-indigo-500/25 rounded-2xl p-5 flex flex-col justify-between gap-3 md:col-span-2">
                <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
                    <span className="text-xs font-bold text-indigo-300">Night Lamp Automation On</span>
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase bg-indigo-500/25 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                    🔗 Chained Auto-Trigger
                  </span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This task is automatically chained to execute immediately whenever <strong>Time Automation Off</strong> fires. It locates the bedside lamp in the master Bedroom and turns it on to serve as a low-intensity night guide.
                </p>
                <div className="flex justify-between items-center pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-indigo-400">Trigger Action: bedroom.bedside_light = turn_on</span>
                  <button
                    onClick={() => runAutomation("night_lamp_automation_on")}
                    className="px-3 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-[9px] text-indigo-300 font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20 transition-all cursor-pointer"
                  >
                    Test Chain Action
                  </button>
                </div>
              </div>

              {/* time_automation_all_off */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-rose-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200">Time Automation All Off</span>
                        <span className="block text-[9px] font-mono text-rose-400 mt-0.5">Turns off all residual/media</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={automations.time_automation_all_off.enabled}
                        disabled={automationMode !== "custom"}
                        onChange={(e) => {
                          setAutomations(prev => ({
                            ...prev,
                            time_automation_all_off: { ...prev.time_automation_all_off, enabled: e.target.checked }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-rose-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    Triggers late at night. Sweeps and shuts down all residual decorative, entertainment, spot-lights, and passage nodes across the missing/non-automated set to maximize power saving (excluding fan and AC).
                  </p>
                </div>

                <div className="flex gap-3 items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Target Time:</span>
                    <input
                      type="time"
                      value={automations.time_automation_all_off.time}
                      onChange={(e) => {
                        setAutomations(prev => ({
                          ...prev,
                          time_automation_all_off: { ...prev.time_automation_all_off, time: e.target.value }
                        }));
                      }}
                      className="bg-transparent text-xs text-rose-400 font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={() => runAutomation("time_automation_all_off")}
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-[10px] text-rose-400 font-bold uppercase tracking-wider rounded-xl border border-rose-500/20 transition-all cursor-pointer"
                  >
                    Trigger Now
                  </button>
                </div>
                {automations.time_automation_all_off.lastRun && (
                  <span className="text-[9px] font-mono text-slate-600">
                    Last execution: {automations.time_automation_all_off.lastRun}
                  </span>
                )}
              </div>

              {/* night_lamp_automation_off */}
              <div className="bg-slate-900/40 border border-white/5 rounded-2xl p-5 flex flex-col justify-between gap-4">
                <div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2.5">
                      <Clock className="w-4 h-4 text-amber-400" />
                      <div>
                        <span className="text-xs font-bold text-slate-200">Night Lamp Automation Off</span>
                        <span className="block text-[9px] font-mono text-amber-400 mt-0.5">Deactivates bedside lights</span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={automations.night_lamp_automation_off.enabled}
                        disabled={automationMode !== "custom"}
                        onChange={(e) => {
                          setAutomations(prev => ({
                            ...prev,
                            night_lamp_automation_off: { ...prev.night_lamp_automation_off, enabled: e.target.checked }
                          }));
                        }}
                        className="sr-only peer"
                      />
                      <div className="w-8 h-4.5 bg-slate-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-slate-400 after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-amber-500 peer-checked:after:bg-white"></div>
                    </label>
                  </div>
                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    Morning routine trigger. Shuts off the active bedroom bedside lamp automatically at the set morning hour, fully closing the sunset-to-sunrise automation sequence.
                  </p>
                </div>

                <div className="flex gap-3 items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5">
                    <span className="text-[10px] font-mono text-slate-500 uppercase">Target Time:</span>
                    <input
                      type="time"
                      value={automations.night_lamp_automation_off.time}
                      onChange={(e) => {
                        setAutomations(prev => ({
                          ...prev,
                          night_lamp_automation_off: { ...prev.night_lamp_automation_off, time: e.target.value }
                        }));
                      }}
                      className="bg-transparent text-xs text-amber-400 font-mono font-semibold focus:outline-none cursor-pointer [color-scheme:dark]"
                    />
                  </div>
                  <button
                    onClick={() => runAutomation("night_lamp_automation_off")}
                    className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-400 font-bold uppercase tracking-wider rounded-xl border border-amber-500/20 transition-all cursor-pointer"
                  >
                    Trigger Now
                  </button>
                </div>
                {automations.night_lamp_automation_off.lastRun && (
                  <span className="text-[9px] font-mono text-slate-600">
                    Last execution: {automations.night_lamp_automation_off.lastRun}
                  </span>
                )}
              </div>

            </div>
          </div>
        )}

        {activeTab === "chat" && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
            
            {/* Left Part: Speech Assistant Orb & Controls */}
            <div className="lg:col-span-7 flex flex-col justify-between relative bg-[#11131f]/20 border border-white/5 rounded-2xl p-6 overflow-hidden min-h-[520px]">
              {/* Immersive Tech Aura Glows */}
              <div className="absolute w-72 h-72 bg-purple-500/5 blur-[80px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
              <div className="absolute w-48 h-48 bg-cyan-500/5 blur-[60px] rounded-full top-1/3 left-2/3 -translate-x-1/2 -translate-y-1/2"></div>

              {/* Header inside Panel */}
              <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                  Voice Control Console
                </h3>
                <div className="flex gap-2 relative z-10">
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

              {/* Floating Speech Orb & Status Area */}
              <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm mx-auto my-auto py-6">
                {/* Enclosing Circular Touch Area */}
                <div
                  onClick={toggleListening}
                  className={`w-48 h-48 rounded-full border border-dashed flex items-center justify-center transition-all duration-500 cursor-pointer p-4 select-none ${
                    listening 
                      ? "border-purple-500/40 bg-purple-500/5 shadow-[0_0_40px_rgba(168,85,247,0.25)] scale-105" 
                      : "border-cyan-400/20 bg-cyan-500/2 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.12)] hover:bg-cyan-500/5 active:scale-95"
                  }`}
                  title="Click anywhere inside the outer ring to talk"
                >
                  {/* The Inner Orb */}
                  <div className={`w-36 h-36 rounded-full border flex items-center justify-center p-3.5 transition-all duration-500 ${
                    listening 
                      ? "border-purple-400/50 bg-purple-500/10 shadow-[inset_0_0_30px_rgba(168,85,247,0.25)]" 
                      : "border-cyan-400/35 bg-[#11131f]/60 shadow-[inset_0_0_20px_rgba(34,211,238,0.1)]"
                  }`}>
                    <div className={`w-full h-full rounded-full border flex items-center justify-center transition-all duration-500 ${
                      listening 
                        ? "border-purple-400/20 bg-purple-500/15" 
                        : "border-cyan-400/10 bg-[#0c0d16]/80"
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
                  </div>
                </div>

                <div className="mt-5 space-y-3 w-full">
                  <p className={`text-xs font-bold tracking-[0.2em] uppercase transition-colors ${listening ? "text-purple-400" : "text-cyan-400"}`}>
                    {listening 
                      ? "Listening for command..." 
                      : "Tap Space or click orb to talk"}
                  </p>
                  
                  {transcript && (
                    <div className="flex justify-center">
                      <p className="text-xs text-slate-300 font-medium bg-white/5 border border-white/5 rounded-lg py-1.5 px-3 max-w-xs break-words font-mono">
                        "{transcript}"
                      </p>
                    </div>
                  )}

                  <div className="text-slate-400 text-xs text-center border-t border-white/5 pt-3">
                    <p className="text-slate-400 font-semibold text-[10px] mb-1 uppercase tracking-widest font-mono text-purple-400">Jerry Response Stream</p>
                    <p className="text-slate-200 text-xs leading-relaxed max-w-xs mx-auto">
                      {aiResponse}
                    </p>
                  </div>
                </div>
              </div>

              {/* Status / Listening Bar */}
              {listening && (
                <div className="relative z-10 bg-purple-500/5 border border-purple-500/15 rounded-xl px-4 py-2 mb-3 flex items-center justify-between text-xs animate-pulse text-purple-300">
                  <span className="flex items-center gap-2">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                    </span>
                    Listening for vocal command...
                  </span>
                </div>
              )}

              {/* Integrated Command Input Bar */}
              <div className="relative z-10 border-t border-white/5 pt-4">
                <form onSubmit={handleManualSubmit} className="bg-black/40 border border-white/10 rounded-xl px-4 py-2 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={toggleListening}
                    className={`p-2 rounded-lg transition-all duration-300 cursor-pointer ${
                      listening 
                        ? "bg-purple-500/20 text-purple-400 border border-purple-500/35" 
                        : "text-slate-400 hover:text-cyan-400 hover:bg-white/5"
                    }`}
                    title={listening ? "Stop voice listening" : "Start voice command"}
                  >
                    <Mic className={`w-4 h-4 ${listening ? "animate-pulse text-purple-400" : ""}`} />
                  </button>
                  <input
                    type="text"
                    value={manualInput}
                    onChange={(e) => setManualInput(e.target.value)}
                    placeholder="Type smart command (e.g. 'Turn on living room ambient light')..."
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

            {/* Right Part: Scrollable Chat History */}
            <div className="lg:col-span-5 flex flex-col justify-between relative bg-[#11131f]/20 border border-white/5 rounded-2xl p-6 overflow-hidden min-h-[520px]">
              
              {/* Header inside Panel */}
              <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-3">
                <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2 font-mono">
                  <Terminal className="w-4 h-4 text-cyan-400" />
                  Conversation Log
                </h3>
                <button 
                  onClick={() => setChatMessages([
                    {
                      id: "cleared-initial",
                      sender: "assistant",
                      text: "Chat history cleared. Jerry is ready for commands.",
                      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    }
                  ])}
                  className="text-[9px] text-rose-400 hover:text-rose-300 font-bold uppercase tracking-wider bg-rose-500/10 px-2 py-1 rounded transition-colors cursor-pointer"
                >
                  Clear Logs
                </button>
              </div>

              {/* Scrollable messages area (Height designed to comfortably show ~7 messages with scroll) */}
              <div className="relative z-10 flex-1 my-4 overflow-y-auto max-h-[380px] min-h-[380px] pr-2 space-y-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                {chatMessages.map((msg) => (
                  <div 
                    key={msg.id} 
                    className={`flex flex-col ${msg.sender === "user" ? "items-end" : "items-start"} w-full animate-fade-in`}
                  >
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">
                        {msg.sender === "user" ? "You" : "Jerry Assistant"}
                      </span>
                      <span className="text-[8px] font-mono text-slate-600">
                        {msg.timestamp}
                      </span>
                    </div>
                    <div 
                      className={`text-xs px-4 py-2.5 rounded-2xl max-w-[85%] break-words leading-relaxed shadow-sm border ${
                        msg.sender === "user" 
                          ? "bg-purple-500/10 border-purple-500/20 text-purple-200 rounded-tr-none" 
                          : "bg-slate-800/40 border-white/5 text-slate-200 rounded-tl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                ))}
                {isProcessing && (
                  <div className="flex flex-col items-start w-full animate-pulse">
                    <div className="flex items-center gap-2 mb-1 px-1">
                      <span className="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Jerry Assistant</span>
                      <span className="text-[8px] font-mono text-slate-600">processing</span>
                    </div>
                    <div className="bg-slate-800/20 border border-white/5 text-slate-400 text-xs px-4 py-2.5 rounded-2xl rounded-tl-none flex items-center gap-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                      <span>Jerry is processing command payload...</span>
                    </div>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

            </div>

          </div>
        )}

        {activeTab === "configurations" && (
          <div className="max-w-5xl mx-auto space-y-6">
            {/* Sub-navigation inside Configurations */}
            <div className="flex flex-wrap bg-[#11131f]/70 backdrop-blur-md border border-white/10 p-1 rounded-xl w-full md:w-max gap-1">
              <button
                onClick={() => setActiveConfigSubTab("gateway")}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeConfigSubTab === "gateway"
                    ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Settings className="w-4 h-4" />
                Gateway Configuration
              </button>
              <button
                onClick={() => setActiveConfigSubTab("console")}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeConfigSubTab === "console"
                    ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-[0_0_10px_rgba(99,102,241,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <Terminal className="w-4 h-4" />
                System Event Console
              </button>
              <button
                onClick={() => setActiveConfigSubTab("guide")}
                className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                  activeConfigSubTab === "guide"
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/25 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
                    : "text-slate-400 hover:text-white hover:bg-white/5"
                }`}
              >
                <HelpCircle className="w-4 h-4" />
                Setup Guide
              </button>
            </div>

            {/* Sub-tab Contents */}
            {activeConfigSubTab === "gateway" && (
              <div className="space-y-6 animate-fade-in">
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

            {activeConfigSubTab === "console" && (
              <div className="h-[550px] animate-fade-in">
                <SystemLogComponent logs={logs} onClear={() => setLogs([])} />
              </div>
            )}

            {activeConfigSubTab === "guide" && (
              <div className="animate-fade-in">
                <IntegrationGuide selectedLanguage={selectedLanguage} />
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
}
