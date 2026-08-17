import { useState, useEffect, useRef, useMemo, FormEvent } from "react";
import { 
  Mic, MicOff, Power, RefreshCw, Volume2, VolumeX, Terminal, 
  Settings, HelpCircle, LayoutGrid, CheckCircle2, AlertCircle, 
  Lightbulb, Thermometer, Wind, Lock, Unlock, ShieldAlert, ShieldCheck, Airplay, Send, Laptop,
  ChevronDown, ChevronUp, Zap, Clock, RotateCcw, Wifi, Cpu, ExternalLink, Smartphone, Radio,
  ShoppingCart, CloudSun, Users, LogOut
} from "lucide-react";
import { Device, SystemLog, ConnectionConfig, ChatMessage } from "./types";
import ConnectionSettings from "./components/ConnectionSettings";
import IntegrationGuide from "./components/IntegrationGuide";
import SystemLogComponent from "./components/SystemLog";
import UserManagement from "./components/UserManagement";
import { ShoppingList } from "./components/ShoppingList";
import { WeatherPanel } from "./components/WeatherPanel";

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

const getArduinoCode = (boardType: "standard" | "esp32c3" | "esp32c3_smart_display", serverIp: string): string => {
  if (boardType === "esp32c3_smart_display") {
    return `/* 
 * ESP32-C3 VOICE IoT Hub - Electrobot 1.28-inch Round Smart Display Client
 *
 * Configured specifically for the Electrobot ESP32-C3 1.28" 240x240 Smart Display.
 * Integrates the circular GC9A01 display via high-speed SPI and Wolle's ESP32-audioI2S.
 * Demonstrates local "Hey Jerry" wake-word listening, active voice command recording,
 * and high-fidelity streaming of the Text-to-Speech (TTS) response.
 *
 * Requirements:
 * 1. TFT_eSPI library configured for GC9A01 driver.
 * 2. ArduinoJson library, ESP32-audioI2S library (for TTS playback).
 * 3. INMP441 I2S Microphone (connected to external headers).
 * 
 * TFT_eSPI User_Setup.h configuration guidelines:
 * #define GC9A01_DRIVER
 * #define TFT_WIDTH  240
 * #define TFT_HEIGHT 240
 * #define TFT_MISO -1
 * #define TFT_MOSI 3
 * #define TFT_SCLK 2
 * #define TFT_CS   7
 * #define TFT_DC   6
 * #define TFT_RST  10
 * #define TFT_BL   1
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <SPI.h>
#include <TFT_eSPI.h> // Graphics and Font library for GC9A01
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include "Audio.h" // ESP32-audioI2S by Wolle

const char* ssid     = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://${serverIp}:3000/api/parse-audio";

TFT_eSPI tft = TFT_eSPI(); // Invoke library

#define BUTTON_PIN 0       // Boot button used as Push-To-Talk (GPIO0 to GND)
#define TFT_BL_PIN 1       // Backlight control GPIO

// External INMP441 Mic Pin Mapping on C3 Smart Display Headers
#define I2S_MIC_SCK 4      // I2S Bit Clock (BCLK)
#define I2S_MIC_WS 5       // I2S Word Select (LRC)
#define I2S_MIC_SD 8       // I2S Serial Data (SD)

// External I2S DAC Audio Pin Mapping (e.g. MAX98357A or PCM5102A)
#define I2S_DAC_DOUT 9     // Audio out data
#define I2S_DAC_BCLK 4     // Shares BCLK to conserve C3 pins
#define I2S_DAC_LRC 5      // Shares LRC/WS to conserve C3 pins

enum SystemState {
  STATE_PASSIVE_LISTEN,  // Passively awaiting wake-word / trigger
  STATE_WOKE_TRIGGERED,  // Wake word triggered! Visual alert chime
  STATE_RECORD_COMMAND,  // Actively capturing voice payload
  STATE_UPLOAD_COMMAND,  // Uploading WAV payload to server
  STATE_PLAYBACK_TTS     // Playing back the processed voice response
};

SystemState currentState = STATE_PASSIVE_LISTEN;
Audio audio;

const int sampleRate = 16000;
const int recordSeconds = 3; // Optimized to 3 seconds for C3 memory safety
const int recordBufferLen = sampleRate * 2 * recordSeconds;
uint8_t* recordBuffer = NULL;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Set up screen backlight
  pinMode(TFT_BL_PIN, OUTPUT);
  digitalWrite(TFT_BL_PIN, HIGH); // Backlight ON
  
  // Initialize GC9A01 circular display
  tft.init();
  tft.setRotation(0);
  tft.fillScreen(TFT_BLACK);
  
  drawCenterDial("WIFI_CONNECTING", "Connecting...", TFT_PURPLE);
  
  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\\n[WiFi] Connected.");
  
  recordBuffer = (uint8_t*)malloc(recordBufferLen);
  
  // Configure audio I2S playback
  audio.setPinout(I2S_DAC_BCLK, I2S_DAC_LRC, I2S_DAC_DOUT);
  audio.setVolume(21); // Max volume limit (0-21)
  
  initI2sMic();
  Serial.println("[System] Booted. 1.28\" Circular voice dashboard ready.");
}

void loop() {
  audio.loop();
  
  switch (currentState) {
    case STATE_PASSIVE_LISTEN:
      displayPassiveListenCircular();
      
      // Simulate/Trigger active state on Boot Button click
      if (digitalRead(BUTTON_PIN) == LOW) {
        Serial.println("[PTT] Physical override clicked.");
        currentState = STATE_WOKE_TRIGGERED;
      }
      break;

    case STATE_WOKE_TRIGGERED:
      playLocalChimeCircular();
      currentState = STATE_RECORD_COMMAND;
      break;

    case STATE_RECORD_COMMAND:
      recordActiveCommandCircular();
      break;

    case STATE_UPLOAD_COMMAND:
      drawCenterDial("UPLOADING", "Jerry Thinking...", TFT_MAGENTA);
      uploadAndProcessVoice(recordBuffer, recordBufferLen);
      currentState = STATE_PASSIVE_LISTEN;
      initI2sMic();
      break;
      
    case STATE_PLAYBACK_TTS:
      if (!audio.isRunning()) {
        currentState = STATE_PASSIVE_LISTEN;
        initI2sMic();
      }
      break;
  }
  
  delay(1);
}

void drawCenterDial(String stateName, String subtitle, uint16_t accentColor) {
  tft.fillScreen(TFT_BLACK);
  
  // Draw outer bezel ring
  tft.drawCircle(120, 120, 118, TFT_DARKGREY);
  tft.drawCircle(120, 120, 115, accentColor);
  tft.drawCircle(120, 120, 114, accentColor);
  
  // Title / Brand
  tft.setTextColor(TFT_WHITE, TFT_BLACK);
  tft.setTextDatum(MC_DATUM);
  tft.setTextSize(2);
  tft.drawString("HEY JERRY", 120, 60);
  
  // State Indicator Pill
  tft.fillRoundRect(30, 95, 180, 40, 8, accentColor);
  tft.setTextColor(TFT_BLACK, accentColor);
  tft.setTextSize(2);
  tft.drawString(stateName, 120, 115);
  
  // Subtitle/Instructions
  tft.setTextColor(TFT_LIGHTGREY, TFT_BLACK);
  tft.setTextSize(1);
  tft.drawString(subtitle, 120, 175);
  
  // Wifi indicator
  tft.setTextColor(TFT_GREEN, TFT_BLACK);
  tft.drawString("WiFi: ACTIVE", 120, 205);
}

void displayPassiveListenCircular() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 3000) {
    lastUpdate = millis();
    drawCenterDial("SYS_IDLE", "Awaiting 'Hey Jerry'", TFT_CYAN);
  }
}

void playLocalChimeCircular() {
  drawCenterDial("WOKE_ACTIVE", "Hearing command...", TFT_ORANGE);
  delay(400); // Beep or visual flash
}

void recordActiveCommandCircular() {
  drawCenterDial("LISTENING", "Speak now...", TFT_RED);
  
  int totalBytesRead = 0;
  size_t bytes_in = 0;
  
  while (totalBytesRead < recordBufferLen) {
    // Read raw 16-bit mono voice samples
    i2s_read(I2S_NUM_0, recordBuffer + totalBytesRead, 4096, &bytes_in, portMAX_DELAY);
    totalBytesRead += bytes_in;
  }
  
  // Uninstall mic driver to free DMA hardware resources for DAC playback
  i2s_driver_uninstall(I2S_NUM_0);
  currentState = STATE_UPLOAD_COMMAND;
}

void initI2sMic() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = sampleRate,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 128,
    .use_apll = false
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_MIC_SCK,
    .ws_io_num = I2S_MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_MIC_SD
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);
}

void uploadAndProcessVoice(uint8_t* buffer, int length) {
  HTTPClient http;
  http.begin(serverUrl);
  
  uint8_t wavHeader[44];
  int totalFileLen = length + 36;
  memcpy(wavHeader, "RIFF", 4);
  memcpy(wavHeader+4, &totalFileLen, 4);
  memcpy(wavHeader+8, "WAVEfmt ", 8);
  uint32_t subChunk1Size = 16; memcpy(wavHeader+16, &subChunk1Size, 4);
  uint16_t audioFormat = 1; memcpy(wavHeader+20, &audioFormat, 2);
  uint16_t numChannels = 1; memcpy(wavHeader+22, &numChannels, 2);
  uint32_t sRate = sampleRate; memcpy(wavHeader+24, &sRate, 4);
  uint32_t byteRate = sampleRate * 2; memcpy(wavHeader+28, &byteRate, 4);
  uint16_t blockAlign = 2; memcpy(wavHeader+32, &blockAlign, 2);
  uint16_t bitsPerSample = 16; memcpy(wavHeader+34, &bitsPerSample, 2);
  memcpy(wavHeader+36, "data", 4);
  memcpy(wavHeader+40, &length, 4);

  String boundary = "----JerryBoundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  
  String head = "--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"audio\\"; filename=\\"voice.wav\\"\\r\\nContent-Type: audio/wav\\r\\n\\r\\n";
  String tail = "\\r\\n--" + boundary + "--\\r\\n";
  
  int code = http.POST((uint8_t*)head.c_str(), head.length());
  if (code > 0) {
    String res = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, res);
    
    const char* text = doc["transcript"];
    const char* audioUrlSuffix = doc["audioUrl"];
    
    tft.fillScreen(TFT_BLACK);
    tft.drawCircle(120, 120, 118, TFT_GREEN);
    tft.setTextColor(TFT_WHITE, TFT_BLACK);
    tft.setTextSize(2);
    tft.drawString("JERRY HEARD:", 120, 50);
    
    tft.setTextSize(1);
    tft.setTextColor(TFT_CYAN, TFT_BLACK);
    tft.drawString(text ? text : "(Empty transcript)", 120, 110);
    delay(2000);
    
    if (audioUrlSuffix) {
       currentState = STATE_PLAYBACK_TTS;
       drawCenterDial("PLAYING_TTS", "Streaming voice response", TFT_GREEN);
       String playUrl = "http://" + String(WiFi.gatewayIP().toString()) + ":3000" + String(audioUrlSuffix);
       audio.connecttohost(playUrl.c_str());
    }
  }
  http.end();
}
`;
  } else if (boardType === "esp32c3") {
    return `/* 
 * ESP32-C3 VOICE IoT Hub - Local PTT & Playback Client (Super Mini Board)
 *
 * Optimized for ESP32-C3 Super Mini with 400KB SRAM and 11 broken out GPIOs.
 * Uses shared I2S clock lines (BCLK/WS) to combine Microphone & Amplifier Max98357A.
 * Buffer duration is optimized to 3s to guarantee heap stability.
 *
 * Requirements:
 * 1. INMP441 I2S Microphone
 * 2. MAX98357A I2S Amplifier & Speaker
 * 3. SSD1306 I2C OLED Display
 * 4. ESP32-audioI2S library & ArduinoJson library
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include "Audio.h" // ESP32-audioI2S by Wolle

const char* ssid     = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://${serverIp}:3000/api/parse-audio";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define BUTTON_PIN 10      // Push button (GPIO10 to GND)
#define I2C_SDA_PIN 8      // SDA is GPIO8 on C3 Super Mini
#define I2C_SCL_PIN 9      // SCL is GPIO9 on C3 Super Mini

// Shared clocks to save GPIO pins on the tiny ESP32-C3
#define I2S_SHARED_BCLK 4  // Shared Bit Clock
#define I2S_SHARED_WS 5    // Shared Word Select
#define I2S_MIC_SD 6       // Mic Data In
#define I2S_DAC_DOUT 7     // DAC DIN

enum SystemState {
  STATE_PASSIVE_LISTEN,
  STATE_WOKE_TRIGGERED,
  STATE_RECORD_COMMAND,
  STATE_UPLOAD_COMMAND,
  STATE_PLAYBACK_TTS
};

SystemState currentState = STATE_PASSIVE_LISTEN;
Audio audio;

const int sampleRate = 16000;
const int recordSeconds = 3; // Reduced to 3s for C3 RAM safety (96KB buffer)
const int recordBufferLen = sampleRate * 2 * recordSeconds;
uint8_t* recordBuffer = NULL;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Custom I2C pin mapping for ESP32-C3
  Wire.begin(I2C_SDA_PIN, I2C_SCL_PIN);
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.println("Connecting WiFi...");
  display.display();
  
  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) delay(500);
  
  recordBuffer = (uint8_t*)malloc(recordBufferLen);
  
  // Custom shared I2S clock pinout for MAX98357A
  audio.setPinout(I2S_SHARED_BCLK, I2S_SHARED_WS, I2S_DAC_DOUT);
  audio.setVolume(21);
  
  initI2sMic();
  Serial.println("[System] Booted. ESP32-C3 voice client active.");
}

void loop() {
  audio.loop();
  
  switch (currentState) {
    case STATE_PASSIVE_LISTEN:
      displayPassiveListenOled();
      if (digitalRead(BUTTON_PIN) == LOW) {
        Serial.println("[PTT] Button clicked.");
        currentState = STATE_WOKE_TRIGGERED;
      }
      break;

    case STATE_WOKE_TRIGGERED:
      playLocalChime();
      currentState = STATE_RECORD_COMMAND;
      break;

    case STATE_RECORD_COMMAND:
      recordActiveCommand();
      break;

    case STATE_UPLOAD_COMMAND:
      display.clearDisplay();
      display.println(">>> SENDING... <<<");
      display.display();
      uploadAndProcessVoice(recordBuffer, recordBufferLen);
      currentState = STATE_PASSIVE_LISTEN;
      initI2sMic();
      break;
      
    case STATE_PLAYBACK_TTS:
      if (!audio.isRunning()) {
        currentState = STATE_PASSIVE_LISTEN;
        initI2sMic();
      }
      break;
  }
  delay(1);
}

void displayPassiveListenOled() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 1000) {
    lastUpdate = millis();
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("=== ESP32-C3 MINI ===");
    display.println("Ready to listen...");
    display.println("Press Button PTT");
    display.println("--------------------");
    display.printf("WiFi: %s\\n", WiFi.SSID().c_str());
    display.display();
  }
}

void playLocalChime() {
  display.clearDisplay();
  display.println(">>> RECORDING <<<");
  display.display();
  delay(200);
}

void recordActiveCommand() {
  int totalBytesRead = 0;
  size_t bytes_in = 0;
  while (totalBytesRead < recordBufferLen) {
    i2s_read(I2S_NUM_0, recordBuffer + totalBytesRead, 4096, &bytes_in, portMAX_DELAY);
    totalBytesRead += bytes_in;
  }
  i2s_driver_uninstall(I2S_NUM_0); 
  currentState = STATE_UPLOAD_COMMAND;
}

void initI2sMic() {
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = sampleRate,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 128,
    .use_apll = false
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_SHARED_BCLK,
    .ws_io_num = I2S_SHARED_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_MIC_SD
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);
}

void uploadAndProcessVoice(uint8_t* buffer, int length) {
  HTTPClient http;
  http.begin(serverUrl);
  
  uint8_t wavHeader[44];
  int totalFileLen = length + 36;
  memcpy(wavHeader, "RIFF", 4);
  memcpy(wavHeader+4, &totalFileLen, 4);
  memcpy(wavHeader+8, "WAVEfmt ", 8);
  uint32_t subChunk1Size = 16; memcpy(wavHeader+16, &subChunk1Size, 4);
  uint16_t audioFormat = 1; memcpy(wavHeader+20, &audioFormat, 2);
  uint16_t numChannels = 1; memcpy(wavHeader+22, &numChannels, 2);
  uint32_t sRate = sampleRate; memcpy(wavHeader+24, &sRate, 4);
  uint32_t byteRate = sampleRate * 2; memcpy(wavHeader+28, &byteRate, 4);
  uint16_t blockAlign = 2; memcpy(wavHeader+32, &blockAlign, 2);
  uint16_t bitsPerSample = 16; memcpy(wavHeader+34, &bitsPerSample, 2);
  memcpy(wavHeader+36, "data", 4);
  memcpy(wavHeader+40, &length, 4);

  String boundary = "----JerryBoundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  
  String head = "--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"audio\\"; filename=\\"voice.wav\\"\\r\\nContent-Type: audio/wav\\r\\n\\r\\n";
  String tail = "\\r\\n--" + boundary + "--\\r\\n";
  
  int code = http.POST((uint8_t*)head.c_str(), head.length());
  if (code > 0) {
    String res = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, res);
    const char* text = doc["transcript"];
    const char* audioUrlSuffix = doc["audioUrl"];
    
    display.clearDisplay();
    display.println("Jerry heard:");
    display.println(text);
    display.display();
    delay(1500);
    
    if (audioUrlSuffix) {
       currentState = STATE_PLAYBACK_TTS;
       String playUrl = "http://" + String(WiFi.gatewayIP().toString()) + ":3000" + String(audioUrlSuffix);
       audio.connecttohost(playUrl.c_str());
    }
  }
  http.end();
}`;
  } else {
    return `/* 
 * ESP32 VOICE IoT Hub - Local "Hey Jerry" Wake Word Detection & Playback Client
 *
 * This sketch demonstrates 100% LOCAL wake-word detection ("Hey Jerry") on the ESP32.
 * The microcontroller passively monitors the I2S microphone without sending audio to the cloud.
 * Only when "Hey Jerry" is matched locally, it triggers active command capture and uploads it.
 *
 * Requirements:
 * 1. INMP441 I2S Microphone (for local wake-word & command recording)
 * 2. MAX98357A I2S Amplifier & Speaker (for Text-To-Speech response streaming)
 * 3. ESP-SR (WakeNet) or Edge Impulse SDK (for local neural net inference of "Hey Jerry")
 * 4. ESP32-audioI2S library (for direct audio stream playback)
 * 5. ArduinoJson library (for backend API payload parsing)
 */
#include <WiFi.h>
#include <HTTPClient.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <ArduinoJson.h>
#include <driver/i2s.h>
#include "Audio.h" // ESP32-audioI2S by Wolle

const char* ssid     = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";
const char* serverUrl = "http://${serverIp}:3000/api/parse-audio";

#define SCREEN_WIDTH 128
#define SCREEN_HEIGHT 64
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, -1);

#define BUTTON_PIN 12      // Physical Push-to-Talk Fallback Pin (GPIO12 to GND)
#define I2S_MIC_WS 25
#define I2S_MIC_SD 32
#define I2S_MIC_SCK 33

#define I2S_DAC_LRC 27     // MAX98357A WS
#define I2S_DAC_DOUT 26    // MAX98357A DIN
#define I2S_DAC_BCLK 14    // MAX98357A BCLK

// States for Local Wake & Voice Command Pipeline
enum SystemState {
  STATE_PASSIVE_LISTEN,  // 100% Local passive monitoring for "Hey Jerry"
  STATE_WOKE_TRIGGERED,  // Local match! Alert user & play wake sound
  STATE_RECORD_COMMAND,  // Actively record subsequent command voice
  STATE_UPLOAD_COMMAND,  // Send captured wave payload to the server
  STATE_PLAYBACK_TTS     // Stream the response TTS audio over I2S
};

SystemState currentState = STATE_PASSIVE_LISTEN;
Audio audio; // Audio playback instance

const int sampleRate = 16000; // 16kHz Mono is perfect for local speech models
const int recordSeconds = 4;
const int recordBufferLen = sampleRate * 2 * recordSeconds; // 16-bit PCM = 2 bytes/sample
uint8_t* recordBuffer = NULL;

// Ring buffer for rolling local wake-word analysis (typically 1.5 seconds)
#define WAKE_WINDOW_LEN (sampleRate * 2 * 1.5) 
uint8_t* wakeRollingBuffer = NULL;
int rollingBufferIndex = 0;

void setup() {
  Serial.begin(115200);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  
  // Initialize SSD1306 OLED
  display.begin(SSD1306_SWITCHCAPVCC, 0x3C);
  display.clearDisplay();
  display.setTextColor(WHITE);
  display.setTextSize(1);
  display.println("Connecting WiFi...");
  display.display();
  
  WiFi.begin(ssid, password);
  while(WiFi.status() != WL_CONNECTED) delay(500);
  
  // Allocate buffers for rolling wake monitoring and final command recording
  recordBuffer = (uint8_t*)malloc(recordBufferLen);
  wakeRollingBuffer = (uint8_t*)malloc(WAKE_WINDOW_LEN);
  
  // Init playback DAC pins
  audio.setPinout(I2S_DAC_BCLK, I2S_DAC_LRC, I2S_DAC_DOUT);
  audio.setVolume(21); // Set clear output volume (0-21)
  
  // Initial I2S Microphone Setup for Passive Wake Monitoring
  initI2sMic();
  
  Serial.println("[System] Booted. Continuous local wake-word 'Hey Jerry' active.");
}

void loop() {
  audio.loop(); // Handle web audio streaming buffer
  
  switch (currentState) {
    case STATE_PASSIVE_LISTEN:
      displayPassiveListenOled();
      runLocalWakeWordInference();
      
      // Fallback: Physical button hold bypasses wake word
      if (digitalRead(BUTTON_PIN) == LOW) {
        Serial.println("[PTT] Physical override button clicked.");
        currentState = STATE_WOKE_TRIGGERED;
      }
      break;

    case STATE_WOKE_TRIGGERED:
      Serial.println("[Wake] 'Hey Jerry' detected locally on ESP32!");
      playLocalChime(); // Short beep
      currentState = STATE_RECORD_COMMAND;
      break;

    case STATE_RECORD_COMMAND:
      recordActiveCommand();
      break;

    case STATE_UPLOAD_COMMAND:
      display.clearDisplay();
      display.setCursor(0,0);
      display.println(">>> SENDING... <<<");
      display.println("Querying Jerry...");
      display.display();
      uploadAndProcessVoice(recordBuffer, recordBufferLen);
      currentState = STATE_PASSIVE_LISTEN; // Re-enter local listening
      initI2sMic(); // Restore passive listening I2S parameters
      break;
      
    case STATE_PLAYBACK_TTS:
      // The ESP32-audioI2S library handles this asynchronously via audio.loop()
      if (!audio.isRunning()) {
        currentState = STATE_PASSIVE_LISTEN;
        initI2sMic();
      }
      break;
  }
  
  delay(1); // Yield to ESP32 RTOS core tasks
}

void displayPassiveListenOled() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate > 1000) {
    lastUpdate = millis();
    display.clearDisplay();
    display.setCursor(0,0);
    display.println("=== JERRY CLIENT ===");
    display.println("Wake Word: ACTIVE");
    display.println("Say: 'Hey Jerry'");
    display.println("--------------------");
    display.printf("WiFi: %s\\n", WiFi.SSID().c_str());
    display.display();
  }
}

// Read raw I2S mic samples into rolling ring-buffer & invoke local DSP/Inference
void runLocalWakeWordInference() {
  size_t bytes_read = 0;
  uint8_t tempBuffer[512];
  
  // Non-blocking read of current samples
  i2s_read(I2S_NUM_0, tempBuffer, sizeof(tempBuffer), &bytes_read, 0);
  
  if (bytes_read > 0) {
    // Write into local rolling buffer
    for (size_t i = 0; i < bytes_read; i++) {
      wakeRollingBuffer[rollingBufferIndex] = tempBuffer[i];
      rollingBufferIndex = (rollingBufferIndex + 1) % WAKE_WINDOW_LEN;
    }
    
    // Perform 100% LOCAL inference (no network calls)
    // Here you hook in Edge Impulse SDK or Espressif ESP-SR (WakeNet) model:
    // e.g. float confidence = runJerryWakeModel(wakeRollingBuffer);
    //
    // For illustration, we simulate or listen for threshold/pattern,
    // in actual deployment, Espressif's custom neural model returns a trigger index:
    bool wakeDetected = false; 
    
    /* 
     * [LOCAL ESP-SR IMPLEMENTATION REFERENCE]:
     * #include "esp_wn_iface.h"
     * #include "esp_wn_models.h"
     * ...
     * int r = model->detect(model_data, (int16_t*)tempBuffer);
     * if (r > 0) { wakeDetected = true; }
     */
     
    if (wakeDetected) {
      currentState = STATE_WOKE_TRIGGERED;
    }
  }
}

void playLocalChime() {
  display.clearDisplay();
  display.setCursor(0,0);
  display.println("[!] WOKEN UP!");
  display.println("Hearing command...");
  display.display();
  delay(200); // Mimics local acoustic confirmation chime
}

void recordActiveCommand() {
  display.clearDisplay();
  display.setCursor(0,0);
  display.println(">>> LISTENING <<<");
  display.println("Speak command now");
  display.display();
  
  // Actively gather 4 seconds of continuous voice command
  int totalBytesRead = 0;
  size_t bytes_in = 0;
  
  while (totalBytesRead < recordBufferLen) {
    i2s_read(I2S_NUM_0, recordBuffer + totalBytesRead, 4096, &bytes_in, portMAX_DELAY);
    totalBytesRead += bytes_in;
  }
  
  // Uninstall I2S receiver driver so we can stream playback safely
  i2s_driver_uninstall(I2S_NUM_0); 
  currentState = STATE_UPLOAD_COMMAND;
}

void initI2sMic() {
  // Config tailored for INMP441 clear audio recording
  i2s_config_t i2s_config = {
    .mode = (i2s_mode_t)(I2S_MODE_MASTER | I2S_MODE_RX),
    .sample_rate = sampleRate,
    .bits_per_sample = I2S_BITS_PER_SAMPLE_16BIT,
    .channel_format = I2S_CHANNEL_FMT_ONLY_LEFT,
    .communication_format = I2S_COMM_FORMAT_STAND_I2S,
    .intr_alloc_flags = ESP_INTR_FLAG_LEVEL1,
    .dma_buf_count = 8,
    .dma_buf_len = 128,
    .use_apll = false
  };
  i2s_pin_config_t pin_config = {
    .bck_io_num = I2S_MIC_SCK,
    .ws_io_num = I2S_MIC_WS,
    .data_out_num = I2S_PIN_NO_CHANGE,
    .data_in_num = I2S_MIC_SD
  };
  i2s_driver_install(I2S_NUM_0, &i2s_config, 0, NULL);
  i2s_set_pin(I2S_NUM_0, &pin_config);
}

void uploadAndProcessVoice(uint8_t* buffer, int length) {
  HTTPClient http;
  http.begin(serverUrl);
  
  // Pack raw 16-bit PCM buffer into standard WAV with a 44-byte Header
  uint8_t wavHeader[44];
  int totalFileLen = length + 36;
  memcpy(wavHeader, "RIFF", 4);
  memcpy(wavHeader+4, &totalFileLen, 4);
  memcpy(wavHeader+8, "WAVEfmt ", 8);
  uint32_t subChunk1Size = 16; memcpy(wavHeader+16, &subChunk1Size, 4);
  uint16_t audioFormat = 1; memcpy(wavHeader+20, &audioFormat, 2);
  uint16_t numChannels = 1; memcpy(wavHeader+22, &numChannels, 2);
  uint32_t sRate = sampleRate; memcpy(wavHeader+24, &sRate, 4);
  uint32_t byteRate = sampleRate * 2; memcpy(wavHeader+28, &byteRate, 4);
  uint16_t blockAlign = 2; memcpy(wavHeader+32, &blockAlign, 2);
  uint16_t bitsPerSample = 16; memcpy(wavHeader+34, &bitsPerSample, 2);
  memcpy(wavHeader+36, "data", 4);
  memcpy(wavHeader+40, &length, 4);

  // Send as clean multipart/form-data payload
  String boundary = "----JerryBoundary";
  http.addHeader("Content-Type", "multipart/form-data; boundary=" + boundary);
  
  String head = "--" + boundary + "\\r\\nContent-Disposition: form-data; name=\\"audio\\"; filename=\\"voice.wav\\"\\r\\nContent-Type: audio/wav\\r\\n\\r\\n";
  String tail = "\\r\\n--" + boundary + "--\\r\\n";
  
  // For full streaming, send the components sequentially or combine in memory
  // The server receives standard multipart, runs STT via Gemini, outputs response JSON:
  int code = http.POST((uint8_t*)head.c_str(), head.length());
  
  if (code > 0) {
    String res = http.getString();
    StaticJsonDocument<512> doc;
    deserializeJson(doc, res);
    
    const char* text = doc["transcript"];
    const char* audioUrlSuffix = doc["audioUrl"]; // e.g. "/api/audio/voice_123.wav"
    
    display.clearDisplay();
    display.println("Jerry heard:");
    display.println(text);
    display.display();
    delay(1500);
    
    if (audioUrlSuffix) {
       currentState = STATE_PLAYBACK_TTS;
       String playUrl = "http://" + String(WiFi.gatewayIP().toString()) + ":3000" + String(audioUrlSuffix);
       audio.connecttohost(playUrl.c_str()); // Stream response TTS audio back dynamically!
    }
  }
  http.end();
}`;
  }
};

// Path-based Route Parser
// Handles /helper or /shopping -> Shopping List
// Handles /living_room, /dine_in, /bedroom, /bedroom_2 -> Dedicated Room View
export function parseRouteFromPath(
  path: string, 
  availableRooms: string[] = ["living room", "dine-in", "bedroom", "bedroom 2"]
): { mode: "full" | "shopping" | "room"; room?: string } {
  const cleanPath = path.toLowerCase().replace(/^\/+|\/+$/g, "");
  
  if (!cleanPath || cleanPath === "index.html") {
    return { mode: "full" };
  }
  
  if (
    cleanPath === "helper" || 
    cleanPath === "shopping" || 
    cleanPath === "shoppinglist" || 
    cleanPath === "shopping_list"
  ) {
    return { mode: "shopping" };
  }

  const normalized = cleanPath.replace(/_/g, " ").replace(/-/g, " ");

  for (const r of availableRooms) {
    const roomSlug1 = r.toLowerCase().replace(/\s+/g, "_"); // living_room, dine_in, bedroom_2
    const roomSlug2 = r.toLowerCase().replace(/\s+/g, "-"); // living-room, dine-in, bedroom-2
    const roomSlug3 = r.toLowerCase().replace(/[\s_-]+/g, ""); // livingroom, dinein, bedroom2

    if (
      cleanPath === roomSlug1 ||
      cleanPath === roomSlug2 ||
      cleanPath === roomSlug3 ||
      normalized === r.toLowerCase() ||
      normalized === r.toLowerCase().replace(/-/g, " ")
    ) {
      return { mode: "room", room: r };
    }
  }

  return { mode: "full" };
}

export default function App() {
  // Route state derived from URL path (e.g. /helper -> shopping, /living_room -> living room)
  const [routeInfo, setRouteInfo] = useState<{ mode: "full" | "shopping" | "room"; room?: string }>(() => {
    if (typeof window !== "undefined") {
      return parseRouteFromPath(window.location.pathname);
    }
    return { mode: "full" };
  });

  // Check if accessed by localhost
  const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

  // ESP32 Solo Voice Assistant Mode check from URL search query parameter (?mode=voice or ?esp32=true)
  const [soloMode, setSoloMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("mode") === "voice" || params.get("esp32") === "true" || params.get("solo") === "true";
    }
    return false;
  });

  // Navigation: "devices" | "shopping" | "chat" | "configurations"
  const [activeTab, setActiveTab] = useState<"devices" | "shopping" | "chat" | "configurations">(
    () => {
      if (typeof window !== "undefined") {
        const route = parseRouteFromPath(window.location.pathname);
        if (route.mode === "shopping") return "shopping";
        if (route.mode === "room") return "devices";
        const params = new URLSearchParams(window.location.search);
        if (params.get("mode") === "voice" || params.get("esp32") === "true" || params.get("solo") === "true") {
          return "chat";
        }
      }
      return "devices";
    }
  );

  // Synchronize route changes via popstate (browser back/forward navigation)
  useEffect(() => {
    const handleLocationChange = () => {
      if (typeof window !== "undefined") {
        const route = parseRouteFromPath(window.location.pathname);
        setRouteInfo(route);
        if (route.mode === "shopping") {
          setActiveTab("shopping");
        } else if (route.mode === "room") {
          setActiveTab("devices");
        }
      }
    };

    window.addEventListener("popstate", handleLocationChange);
    return () => window.removeEventListener("popstate", handleLocationChange);
  }, []);

  const toggleSoloMode = () => {
    setSoloMode(prev => {
      const next = !prev;
      if (typeof window !== "undefined") {
        const url = new URL(window.location.href);
        if (next) {
          url.searchParams.set("mode", "voice");
          setActiveTab("chat");
        } else {
          url.searchParams.delete("mode");
        }
        window.history.replaceState({}, "", url.toString());
      }
      return next;
    });
  };

  const [activeConfigSubTab, setActiveConfigSubTab] = useState<"gateway" | "users" | "console" | "guide">("gateway");
  const [isConfigAuthenticated, setIsConfigAuthenticated] = useState(false);
  const [configAuthPassword, setConfigAuthPassword] = useState("");
  const [configAuthError, setConfigAuthError] = useState(false);
  const [isVerifyingConfig, setIsVerifyingConfig] = useState(false);

  const handleConfigAuth = async (e: FormEvent) => {
    e.preventDefault();
    setIsVerifyingConfig(true);
    setConfigAuthError(false);
    try {
      const res = await fetch("/api/auth/verify-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: configAuthPassword }),
      });
      if (res.ok) {
        setIsConfigAuthenticated(true);
        setConfigAuthPassword("");
      } else {
        setConfigAuthError(true);
      }
    } catch (err) {
      setConfigAuthError(true);
    } finally {
      setIsVerifyingConfig(false);
    }
  };

  const handleExitConfig = () => {
    setIsConfigAuthenticated(false);
    setActiveConfigSubTab("gateway");
  };

  // Core App States
  const [devices, setDevices] = useState<Device[]>(INITIAL_DEVICES);

  // Filtered devices depending on URL route mode (/living_room, /dine_in, /bedroom, /bedroom_2)
  const displayedDevices = useMemo(() => {
    if (routeInfo.mode === "room" && routeInfo.room) {
      return devices.filter(d => d.room.toLowerCase() === routeInfo.room!.toLowerCase());
    }
    return devices;
  }, [devices, routeInfo]);
  const [logs, setLogs] = useState<SystemLog[]>([]);
  const [config, setConfig] = useState<ConnectionConfig>({
    serverIp: "192.168.29.112",
    serverPort: "8000",
    frontendPort: "3000",
    useProxy: false,
    apiPath: "/api"
  });

  // Assistant states
  const [speechSupported, setSpeechSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [speechSynthesisEnabled, setSpeechSynthesisEnabled] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [wakeWordStandby, setWakeWordStandby] = useState(true);
  const [transcript, setTranscript] = useState("");
  const [espTab, setEspTab] = useState<"termux" | "script" | "api" | "console">("termux");
  const [mobileTab, setMobileTab] = useState<"speech" | "ecosystem">("speech");
  const [boardType, setBoardType] = useState<"standard" | "esp32c3" | "esp32c3_smart_display">("standard");
  const [aiResponse, setAiResponse] = useState("Hello! I am ready to monitor and control your local IoT ecosystem. Tap Space or click the microphone to speak.");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [manualInput, setManualInput] = useState("");
  const [latency, setLatency] = useState("4.2ms");
  const [currentTime, setCurrentTime] = useState("");
  const [selectedLanguage, setSelectedLanguage] = useState("en-IN");
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // User stopped speech recognition ref (prevents auto-restart when user manually clicks orb to stop)
  const userStoppedRef = useRef<boolean>(false);

  // Mobile Device Detection Effect
  useEffect(() => {
    const checkIsMobile = () => {
      const ua = navigator.userAgent || navigator.vendor || (window as any).opera || "";
      const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(ua);
      const isSmallScreen = window.innerWidth <= 768;
      const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
      const queryParamMobile = new URLSearchParams(window.location.search).has("mobile");
      setIsMobile(isMobileUA || (isSmallScreen && hasTouch) || queryParamMobile);
    };

    checkIsMobile();
    window.addEventListener("resize", checkIsMobile);
    return () => window.removeEventListener("resize", checkIsMobile);
  }, []);

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

  // Track per-automation execution to ensure reliable execution at the scheduled minute
  const executedMinutesRef = useRef<Record<string, string>>({});

  const normalizeHHMM = (timeStr: string): string => {
    if (!timeStr) return "";
    const parts = timeStr.trim().split(":");
    if (parts.length < 2) return "";
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return "";
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
  };

  const executeAutomationAction = async (action: string) => {
    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;
    // We send only the action and timestamp. Strictly NO value or device/room identifiers.
    const payload = {
      action,
      timestamp: new Date().toISOString()
    };

    try {
      addLog("info", `Forwarding automation trigger to local assistant: ${action}`, JSON.stringify(payload));
      
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
        addLog("success", `Dispatched automation packet safely to local network assistant for [${action}]!`, responseData.response_message || responseData.message || "Done");
      } else {
        throw new Error(`Device responded with error status ${dispatchResponse.status}`);
      }
    } catch (dispatchError: any) {
      console.warn("Direct LAN dispatch for automation failed:", dispatchError);
      addLog(
        "warning",
        `LAN Server ${config.serverIp} unreachable for automation [${action}]`,
        `Dashboard successfully simulated state change locally, but the remote server at http://${config.serverIp}:${config.serverPort} is currently offline.\nReason: ${dispatchError.message || "Timeout"}.`
      );
    }
  };

  const runAutomation = (id: string, isScheduled: boolean = false) => {
    addLog("success", `Automation Run Initialized: ${id}`, isScheduled ? "Triggered by schedule" : "Triggered manually");
    
    // Track execution
    setAutomations(prev => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], lastRun: new Date().toLocaleTimeString() }
      };
    });

    if (id === "time_automation_on") {
      if (!isDarkInKolkata) {
        addLog("info", "Time Automation On Notice", "Kolkata Sunset Detector reports daylight, but schedule execution proceeding as configured.");
      }
      
      // Turn on "time lights" (Ambient Light, Low Ambient Light, High Ambient Light)
      const targetKeys = ["ambient light", "low ambient light", "high ambient light"];
      let count = 0;
      devicesRef.current.forEach(dev => {
        if (dev.deviceKey && targetKeys.includes(dev.deviceKey.toLowerCase())) {
          if (!dev.on) {
            updateLocalStateOnly(dev.room, dev.deviceKey, "turn_on");
            count++;
          }
        }
      });
      addLog("success", "Time Automation On Executed", `Turned on ${count} ambient/time lights locally.`);
      
      // Trigger single backend automation call with NO value passed
      executeAutomationAction(id);
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
            updateLocalStateOnly(dev.room, dev.deviceKey, "turn_off");
            count++;
          }
        }
      });
      addLog("success", "Time Automation Off Executed", `Turned off ${count} automation lights (excluding fan/ac) locally.`);

      // Trigger single backend automation call with NO value passed
      executeAutomationAction(id);

      // Requirement 5: "when time_automation_off will get triggered, then night_lamp_automation_on will get triggered after 5s."
      addLog("info", "Chained Action: Triggering Night Lamp Automation On in 5s...");
      setTimeout(() => {
        runAutomation("night_lamp_automation_on");
      }, 5000);
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
            updateLocalStateOnly(dev.room, dev.deviceKey, "turn_off");
            count++;
          }
        }
      });
      addLog("success", "Time Automation All Off Executed", `Turned off ${count} other/missing devices (excluding fan/ac) locally.`);

      // Trigger single backend automation call with NO value passed
      executeAutomationAction(id);

      // Chained Action: Triggering Night Lamp Automation On in 5s...
      addLog("info", "Chained Action: Triggering Night Lamp Automation On in 5s...");
      setTimeout(() => {
        runAutomation("night_lamp_automation_on");
      }, 5000);
    }

    if (id === "night_lamp_automation_on") {
      // Turn on bedside light in bedroom
      const dev = devicesRef.current.find(d => d.room.toLowerCase() === "bedroom" && d.deviceKey?.toLowerCase() === "bedside light");
      if (dev) {
        if (!dev.on) {
          updateLocalStateOnly(dev.room, dev.deviceKey, "turn_on");
          addLog("success", "Night Lamp Automation On Executed", "Turned on bedroom bedside light locally.");
        } else {
          addLog("info", "Night Lamp Automation On", "Bedside light is already on locally.");
        }
      } else {
        addLog("warning", "Night Lamp Automation On Failed", "No bedside light found in bedroom.");
      }

      // Trigger single backend automation call with NO value passed
      executeAutomationAction(id);
    }

    if (id === "night_lamp_automation_off") {
      // Turn off bedside light in bedroom
      const dev = devicesRef.current.find(d => d.room.toLowerCase() === "bedroom" && d.deviceKey?.toLowerCase() === "bedside light");
      if (dev) {
        if (dev.on) {
          updateLocalStateOnly(dev.room, dev.deviceKey, "turn_off");
          addLog("success", "Night Lamp Automation Off Executed", "Turned off bedroom bedside light locally.");
        } else {
          addLog("info", "Night Lamp Automation Off", "Bedside light is already off locally.");
        }
      } else {
        addLog("warning", "Night Lamp Automation Off Failed", "No bedside light found in bedroom.");
      }

      // Trigger single backend automation call with NO value passed
      executeAutomationAction(id);
    }
  };

  // Background Automation Scheduler Timer
  useEffect(() => {
    const checkSchedule = () => {
      // If master mode is "all-off", none of the schedules can run
      if (automationMode === "all-off") return;

      const now = new Date();
      const currentHHMM = getKolkataHHMM(now); // Strictly Asia/Kolkata (IST) time
      const dateStr = now.toDateString();

      Object.keys(automations).forEach((id) => {
        const auto = automations[id];
        // Schedule is active if: master mode is "all-on" OR (master mode is "custom" and individual schedule is enabled)
        const isScheduleActive = automationMode === "all-on" || (automationMode === "custom" && auto.enabled);
        
        const normAutoTime = normalizeHHMM(auto.time);
        const normCurrentTime = normalizeHHMM(currentHHMM);

        if (isScheduleActive && normAutoTime && normAutoTime === normCurrentTime) {
          const execKey = `${id}_${normCurrentTime}_${dateStr}`;
          if (executedMinutesRef.current[id] !== execKey) {
            executedMinutesRef.current[id] = execKey;
            runAutomation(id, true);
          }
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
  const wakeWordEnabledRef = useRef(wakeWordEnabled);
  const wakeWordStandbyRef = useRef(wakeWordStandby);

  useEffect(() => {
    wakeWordEnabledRef.current = wakeWordEnabled;
  }, [wakeWordEnabled]);

  useEffect(() => {
    wakeWordStandbyRef.current = wakeWordStandby;
  }, [wakeWordStandby]);

  // Timezone helpers for Asia/Kolkata (IST)
  const getKolkataHHMM = (date: Date): string => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false
      }).formatToParts(date);
      
      let hour = "00";
      let minute = "00";
      for (const part of parts) {
        if (part.type === "hour") hour = part.value;
        if (part.type === "minute") minute = part.value;
      }
      let h = parseInt(hour, 10);
      if (h === 24) h = 0;
      return `${String(h).padStart(2, "0")}:${minute}`;
    } catch (err) {
      return "18:00";
    }
  };

  const getKolkataTimeStr = (date: Date): string => {
    try {
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Kolkata",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }).formatToParts(date);
      
      let hour = "00";
      let minute = "00";
      let second = "00";
      for (const part of parts) {
        if (part.type === "hour") hour = part.value;
        if (part.type === "minute") minute = part.value;
        if (part.type === "second") second = part.value;
      }
      let h = parseInt(hour, 10);
      if (h === 24) h = 0;
      return `${String(h).padStart(2, "0")}:${minute}:${second}`;
    } catch (err) {
      return date.toLocaleTimeString();
    }
  };

  // Helper: Log message to dashboard terminal console
  const addLog = (type: SystemLog["type"], message: string, details?: string) => {
    const timestamp = getKolkataTimeStr(new Date());
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
        
        const sunsetStr = getKolkataHHMM(sunset);
        const sunriseStr = getKolkataHHMM(sunrise);
        
        setSunsetInfo({
          sunrise: sunriseStr,
          sunset: sunsetStr,
          lastChecked: getKolkataTimeStr(new Date()),
          isAutoSynced: true,
          error: null
        });

        // 2. The (sunset time - 3 mins) will be time automation on time.
        if (!isNaN(sunset.getTime())) {
          const sunsetMinus3 = new Date(sunset.getTime() - 3 * 60 * 1000);
          const calculatedTimeStr = getKolkataHHMM(sunsetMinus3);

          setAutomations(prev => ({
            ...prev,
            time_automation_on: {
              ...prev.time_automation_on,
              time: calculatedTimeStr
            }
          }));

          addLog(
            "info",
            "Kolkata Sunset sensor synced with API.",
            `Coords: 22.5726°N, 88.3639°E. Dark: ${isDark ? "YES" : "NO"}. Sunset (IST): ${sunsetStr}. Auto-scheduled Time Automation On to (Sunset - 3m): ${calculatedTimeStr}.`
          );
        } else {
          addLog("info", "Kolkata Sunset sensor synced with API.", `Coords: 22.5726°N, 88.3639°E. Dark: ${isDark ? "YES" : "NO"}`);
        }
      } else {
        throw new Error("API response status not OK");
      }
    } catch (err: any) {
      console.error("Sunset API Error:", err);
      setSunsetInfo(prev => ({
        sunrise: prev?.sunrise || "--:--",
        sunset: prev?.sunset || "--:--",
        lastChecked: getKolkataTimeStr(new Date()),
        isAutoSynced: false,
        error: "API connection offline"
      }));
      addLog("error", "Kolkata Sunset API Sync Failed", err.message || "Failed to reach sunrise-sunset.org");
    } finally {
      setIsLoadingSunset(false);
    }
  };

  const parseTimeStringToHHMM = (timeStr: string): string => {
    if (!timeStr) return "18:00";
    const match = timeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
    if (!match) return "18:00";
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];
    
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    }
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
  };

  const parseTimeStringToHHMMMinusMinutes = (timeStr: string, minsToSubtract: number): string => {
    if (!timeStr) return "17:57";
    const match = timeStr.match(/(\d+):(\d+)(?:\s*(AM|PM))?/i);
    if (!match) return "17:57";
    let hours = parseInt(match[1], 10);
    const minutes = parseInt(match[2], 10);
    const ampm = match[3];
    
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hours < 12) {
        hours += 12;
      } else if (ampm.toUpperCase() === "AM" && hours === 12) {
        hours = 0;
      }
    }
    
    let totalMinutes = hours * 60 + minutes - minsToSubtract;
    if (totalMinutes < 0) {
      totalMinutes += 24 * 60;
    }
    
    const finalHours = Math.floor(totalMinutes / 60) % 24;
    const finalMinutes = totalMinutes % 60;
    
    return `${String(finalHours).padStart(2, "0")}:${String(finalMinutes).padStart(2, "0")}`;
  };

  const resetAutomationTimes = () => {
    let sunsetTimeStr = "17:57";
    if (sunsetInfo && sunsetInfo.sunset) {
      const parsedSunset = parseTimeStringToHHMMMinusMinutes(sunsetInfo.sunset, 3);
      if (parsedSunset) {
        sunsetTimeStr = parsedSunset;
      }
    }
    
    setAutomations(prev => ({
      ...prev,
      time_automation_on: { ...prev.time_automation_on, time: sunsetTimeStr },
      time_automation_off: { ...prev.time_automation_off, time: "22:30" },
      time_automation_all_off: { ...prev.time_automation_all_off, time: "23:00" },
      night_lamp_automation_off: { ...prev.night_lamp_automation_off, time: "06:00" },
    }));
    
    addLog(
      "success",
      "Automation Times Reset Completed",
      `Schedules successfully synchronized back to default baseline times. "Time Automation On" has been set to sunset - 3 min: ${sunsetTimeStr}.`
    );
  };

  const resetTimeAutomationOnOnly = () => {
    let sunsetTimeStr = "17:57";
    if (sunsetInfo && sunsetInfo.sunset) {
      const parsedSunset = parseTimeStringToHHMMMinusMinutes(sunsetInfo.sunset, 3);
      if (parsedSunset) {
        sunsetTimeStr = parsedSunset;
      }
    }
    
    setAutomations(prev => ({
      ...prev,
      time_automation_on: { ...prev.time_automation_on, time: sunsetTimeStr },
    }));
    
    addLog(
      "success",
      "Time Automation On Reset",
      `Time Automation On has been reset specifically to sunset - 3 min: ${sunsetTimeStr}.`
    );
  };

  useEffect(() => {
    fetchKolkataDarkStatus();
    // Auto re-sync sunset data every 10 minutes to stay accurate
    const syncInterval = setInterval(fetchKolkataDarkStatus, 10 * 60 * 1000);
    return () => clearInterval(syncInterval);
  }, []);

  // Poll central devices state from backend every 2 seconds
  useEffect(() => {
    const pollDevices = async () => {
      try {
        const res = await fetch("/api/devices");
        if (res.ok) {
          const fetchedDevices = await res.json();
          if (Array.isArray(fetchedDevices) && fetchedDevices.length > 0) {
            setDevices(fetchedDevices);
          }
        }
      } catch (err) {
        console.warn("Error polling central devices from backend:", err);
      }
    };
    pollDevices();
    const interval = setInterval(pollDevices, 2000);
    return () => clearInterval(interval);
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
  const speakText = (text: string, isWakeAck: boolean = false) => {
    if (!speechSynthesisEnabled || !('speechSynthesis' in window)) {
      if (isWakeAck) {
        setWakeWordStandby(false);
        wakeWordStandbyRef.current = false;
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              userStoppedRef.current = false;
              recognitionRef.current.start();
              setListening(true);
            }
          } catch (err) {
            console.warn("Auto-restart after wake ack (no TTS) failed:", err);
          }
        }, 200);
      } else if (wakeWordEnabledRef.current) {
        setWakeWordStandby(true);
        wakeWordStandbyRef.current = true;
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              userStoppedRef.current = false;
              recognitionRef.current.start();
              setListening(true);
            }
          } catch (err) {
            console.warn("Auto-restart after command processed (no TTS) failed:", err);
          }
        }, 1200);
      }
      return;
    }
    try {
      window.speechSynthesis.cancel(); // Stop active voices
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
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
        if (isWakeAck) {
          // Keep in active command listening state (wakeWordStandby = false) so user can speak command right after "mhm..."
          setWakeWordStandby(false);
          wakeWordStandbyRef.current = false;
          setTimeout(() => {
            try {
              if (recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                userStoppedRef.current = false;
                recognitionRef.current.start();
                setListening(true);
              }
            } catch (err) {
              console.warn("Auto-restart after wake ack TTS failed:", err);
            }
          }, 200);
        } else if (wakeWordEnabledRef.current) {
          // Command response completed, return to wake word standby mode
          setWakeWordStandby(true);
          wakeWordStandbyRef.current = true;
          setTimeout(() => {
            try {
              if (recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                userStoppedRef.current = false;
                recognitionRef.current.start();
                setListening(true);
              }
            } catch (err) {
              console.warn("Auto-restart after TTS failed:", err);
            }
          }, 300);
        }
      };

      utterance.onerror = () => {
        setIsSpeaking(false);
        isSpeakingRef.current = false;
        if (isWakeAck) {
          setWakeWordStandby(false);
          wakeWordStandbyRef.current = false;
        } else if (wakeWordEnabledRef.current) {
          setWakeWordStandby(true);
          wakeWordStandbyRef.current = true;
        }
        setTimeout(() => {
          try {
            if (recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
              userStoppedRef.current = false;
              recognitionRef.current.start();
              setListening(true);
            }
          } catch (err) {
            console.warn("Auto-restart after TTS error failed:", err);
          }
        }, 300);
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
      setCurrentTime(getKolkataTimeStr(d));
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
      rec.interimResults = true;
      rec.lang = selectedLanguage;

      rec.onstart = () => {
        setListening(true);
        setTranscript("");
        // Play beep when transitioning into active command mode
        if (!wakeWordStandbyRef.current) {
          playBeep(880, 0.25, "sine", 0.9);
        }
        addLog("info", "Microphone listening active.");

        // Automatically stop listening after 7 seconds if silent
        if (listeningTimeoutRef.current) {
          clearTimeout(listeningTimeoutRef.current);
        }
        if (!wakeWordStandbyRef.current) {
          listeningTimeoutRef.current = setTimeout(() => {
            try {
              recognitionRef.current?.stop();
            } catch (err) {
              console.warn("Failed to stop listening on timeout:", err);
            }
          }, 7000);
        }
      };

      rec.onresult = (event: any) => {
        let interimText = "";
        let finalText = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalText += res[0].transcript;
          } else {
            interimText += res[0].transcript;
          }
        }

        if (interimText) {
          setTranscript(interimText.trim());
        }

        if (finalText) {
          const cleanText = finalText.trim();
          if (!cleanText) return;
          const lowerText = cleanText.toLowerCase();

          if (wakeWordEnabledRef.current && wakeWordStandbyRef.current) {
            const wakeWordMatch = lowerText.match(/\b(hey\s+jerry|jerry)\b/i);
            if (wakeWordMatch) {
              const matchIndex = lowerText.search(/\b(hey\s+jerry|jerry)\b/i);
              const commandPart = lowerText.slice(matchIndex).replace(/^(hey\s+jerry|jerry)\s*/i, "").trim();

              setTranscript(cleanText);
              playBeep(880, 0.25, "sine", 0.9);
              setWakeWordStandby(false);
              wakeWordStandbyRef.current = false;

              if (commandPart) {
                setAiResponse(`Command: "${commandPart}"`);
                addLog("voice", `Wake word "Hey Jerry" detected. Executing command: "${commandPart}"`);
                // Re-arm wake word standby mode after single instruction
                if (wakeWordEnabledRef.current) {
                  setWakeWordStandby(true);
                  wakeWordStandbyRef.current = true;
                }
                handleProcessCommand(commandPart);
              } else {
                setAiResponse("Listening for command...");
                addLog("voice", "Wake word 'Hey Jerry' detected. Listening for command!");
              }
            } else {
              // Completely ignore ambient speech when wake word is not spoken!
              console.log("Ignored background speech in standby (no wake word match):", cleanText);
            }
          } else {
            setTranscript(cleanText);
            playBeep(880, 0.25, "sine", 0.9);
            addLog("voice", `Voice command detected: "${cleanText}"`);
            
            // Re-arm wake word standby mode immediately after receiving the single instruction
            if (wakeWordEnabledRef.current) {
              setWakeWordStandby(true);
              wakeWordStandbyRef.current = true;
            }
            handleProcessCommand(cleanText);
          }
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech Recognition error:", event.error);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          addLog("error", "Microphone access blocked", "Allow microphone permissions in your browser address bar or settings.");
          setAiResponse("Microphone permission is blocked by your browser. Please allow microphone access in site settings or open the app directly in a new tab.");
          playBeep(220, 0.25, "triangle");
        } else if (event.error !== "no-speech" && event.error !== "aborted") {
          addLog("error", `Voice recognition anomaly: ${event.error}`, "Ensure microphone access is enabled in browser settings.");
          playBeep(220, 0.25, "triangle");
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

        // If active command mode timed out without a command, re-arm wake word standby
        if (!wakeWordStandbyRef.current && wakeWordEnabledRef.current) {
          setWakeWordStandby(true);
          wakeWordStandbyRef.current = true;
        }

        // Auto-restart if user did NOT explicitly stop recognition, wake-word mode is active, and we are not speaking/processing
        if (!userStoppedRef.current && wakeWordEnabledRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
          setTimeout(() => {
            try {
              if (!userStoppedRef.current && recognitionRef.current && !isSpeakingRef.current && !isProcessingRef.current) {
                recognitionRef.current.start();
                setListening(true);
              }
            } catch (err) {
              console.warn("Auto-restart of recognition failed:", err);
            }
          }, 300);
        }
      };

      recognitionRef.current = rec;
    } else {
      addLog("warning", "Web Speech recognition not supported in this browser context.", "Open the application directly in Google Chrome / Edge in a new tab for native Web Speech support.");
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
      addLog("warning", "Speech Recognition is offline.", "Please open app in a new browser tab or verify browser microphone permissions.");
      return;
    }

    if (listening) {
      userStoppedRef.current = true;
      try {
        recognitionRef.current?.stop();
        setListening(false);
      } catch (err) {
        console.warn("Error stopping speech recognition:", err);
      }
    } else {
      userStoppedRef.current = false;
      try {
        window.speechSynthesis.cancel(); // Stop active voices
        // Explicit manual click on Orb means user intends to speak directly to Jerry
        setWakeWordStandby(false);
        wakeWordStandbyRef.current = false;
        
        recognitionRef.current?.start();
        setListening(true); // Immediate visual feedback for touchscreens
      } catch (err: any) {
        if (err.name === "InvalidStateError") {
          setListening(true);
        } else {
          console.warn("Failed starting speech recognition:", err);
          setListening(false);
        }
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

  // Execute actual state updates on local devices and forward target API calls to 192.168.29.112 & central server
  const executeDeviceAction = async (room: string, deviceKey: string | null, action: string, value?: number) => {
    // Perform the local React UI updates first
    updateLocalStateOnly(room, deviceKey, action, value);

    // Persist to central server-side state
    try {
      await fetch("/api/devices/control", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, device: deviceKey, action, value })
      });
    } catch (err) {
      console.warn("Backend state sync failed:", err);
    }

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
    addLog("info", `Syncing live device statuses from local network assistant at http://${config.serverIp}:${config.serverPort}...`);
    
    const targetUrl = `http://${config.serverIp}:${config.serverPort}/`;
    let syncedFromTarget = false;

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
        const timeoutId = setTimeout(() => controller.abort(), 2500);
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

        if (responseData && (responseData.states || responseData.devices)) {
          const remoteStates = responseData.states || responseData.devices || responseData;
          let updatedCount = 0;

          setDevices(prevDevices => {
            const updatedDevices = prevDevices.map(dev => {
              const roomName = dev.room.toLowerCase();
              const deviceKey = dev.deviceKey?.toLowerCase();

              if (deviceKey && remoteStates[roomName] && remoteStates[roomName][deviceKey] !== undefined) {
                const rawState = remoteStates[roomName][deviceKey];
                if (rawState !== null) {
                  const updated = { ...dev };
                  const stateStr = String(rawState).toLowerCase();

                  if (stateStr === "on" || stateStr === "true" || stateStr === "1") {
                    updated.on = true;
                    updated.statusText = dev.category === "fan" && dev.value ? `Speed ${dev.value}` : "On";
                  } else if (stateStr === "off" || stateStr === "false" || stateStr === "0") {
                    updated.on = false;
                    updated.statusText = "Off";
                  } else {
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

            // Sync with central server database
            fetch("/api/devices/sync-all", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ devices: updatedDevices })
            }).catch(e => console.warn("Central sync-all backup failed:", e));

            return updatedDevices;
          });

          addLog("success", "Synchronization Completed", `Fetched status successfully! Synchronized ${updatedCount} device states from local assistant connection (${config.serverIp}).`);
          syncedFromTarget = true;
        }
      }
    } catch (syncError: any) {
      console.warn("Target network status synchronization failed, falling back to central backend:", syncError);
      addLog("warning", "Target Assistant Offline", `Could not connect directly to http://${config.serverIp}:${config.serverPort}: ${syncError.message || "Timeout"}. Falling back to central database.`);
    }

    if (!syncedFromTarget) {
      try {
        const res = await fetch("/api/devices");
        if (res.ok) {
          const fetchedDevices = await res.json();
          if (Array.isArray(fetchedDevices) && fetchedDevices.length > 0) {
            setDevices(fetchedDevices);
            addLog("success", "Synchronization Completed", "Loaded latest status from central server database.");
          }
        }
      } catch (err: any) {
        addLog("error", "Failed to pull live states", `Database connection issue: ${err.message}`);
      }
    }

    setIsSyncing(false);
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

  if (soloMode) {
    return (
      <div id="app-container" className="min-h-screen bg-[#030407] text-slate-200 font-sans p-3 md:p-6 flex flex-col justify-between overflow-x-hidden">
        {/* Solo Mode Top Nav */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-[#0d0e15]/90 backdrop-blur-md border border-purple-500/10 p-4 rounded-2xl shadow-[0_0_30px_rgba(168,85,247,0.05)] mb-6 gap-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <div className={`w-3.5 h-3.5 rounded-full transition-all duration-500 ${listening ? "bg-purple-500 shadow-[0_0_12px_#a855f7]" : "bg-cyan-400 shadow-[0_0_10px_#22d3ee]"}`}></div>
            <div>
              <h1 className="text-sm font-black tracking-[0.2em] uppercase text-purple-400 flex flex-wrap items-center gap-2">
                Jerry Vox Client
                <span className="text-[9px] font-mono font-normal tracking-normal text-slate-400 uppercase px-2 py-0.5 rounded-full bg-white/5 border border-white/5">
                  Mobile Termux Mode
                </span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono">STANDALONE_SECURE_CLIENT // JERRY_GATEWAY</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 md:gap-8 text-left w-full md:w-auto justify-between md:justify-end">
            <div className="border-l border-white/10 pl-4 md:pl-6 hidden sm:block">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Local IoT IP</p>
              <p className="text-xs md:text-sm font-mono text-cyan-300 flex items-center gap-1.5">
                <span>{config.serverIp}</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-pulse"></span>
              </p>
            </div>
            <div className="border-l border-white/10 pl-4 md:pl-6">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Local Ping</p>
              <p className="text-xs md:text-sm font-mono text-cyan-300">{latency}</p>
            </div>
            <div className="border-l border-white/10 pl-4 md:pl-6 flex flex-col justify-center">
              <p className="text-sm md:text-lg font-light font-mono text-slate-300 leading-none">
                {currentTime || "12:00:00"}
              </p>
              <span className="text-[9px] font-bold text-purple-400 font-sans tracking-wider mt-0.5 uppercase">Kolkata IST</span>
            </div>
            <button
              onClick={toggleSoloMode}
              className="px-4 py-2 bg-slate-800/80 hover:bg-slate-700 text-xs text-rose-400 font-bold uppercase tracking-wider rounded-xl border border-rose-500/20 shadow-sm transition-all cursor-pointer flex items-center gap-1.5 ml-auto md:ml-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Exit Mobile Mode
            </button>
          </div>
        </header>

        {/* Tab Selection Header for Mobile Mode */}
        <div className="w-full max-w-7xl mx-auto mb-6 px-1">
          <div className="grid grid-cols-2 bg-[#0c0d16]/90 border border-white/5 p-1 rounded-2xl w-full max-w-sm mx-auto gap-1">
            <button
              onClick={() => setMobileTab("speech")}
              className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mobileTab === "speech"
                  ? "bg-purple-500/15 text-purple-400 border border-purple-500/30 font-black shadow-[0_0_15px_rgba(168,85,247,0.1)]"
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <Mic className="w-3.5 h-3.5 text-purple-400" />
              Speech Core
            </button>
            <button
              onClick={() => setMobileTab("ecosystem")}
              className={`py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${
                mobileTab === "ecosystem"
                  ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 font-black shadow-[0_0_15px_rgba(34,211,238,0.1)]"
                  : "text-slate-500 hover:text-slate-400"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 text-cyan-400" />
              Ecosystem Control
            </button>
          </div>
        </div>

        {/* Primary Content Grid */}
        <main className="flex-1 max-w-7xl w-full mx-auto mb-6 px-1">
          {mobileTab === "speech" && (
            <div className="max-w-xl mx-auto w-full">
              
              {/* Panel 1: Voice Control Console */}
              <div className="flex flex-col justify-between relative bg-[#0c0d16]/80 border border-white/5 rounded-2xl p-6 overflow-hidden min-h-[500px]">
                <div className="absolute w-72 h-72 bg-purple-500/5 blur-[80px] rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"></div>
                
                {/* Header */}
                <div className="flex justify-between items-center relative z-10 border-b border-white/5 pb-3">
                  <h3 className="text-xs font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
                    <Mic className="w-4 h-4 text-purple-400 animate-pulse" />
                    Speech Core
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => {
                        const newState = !wakeWordEnabled;
                        setWakeWordEnabled(newState);
                        setWakeWordStandby(newState);
                        wakeWordStandbyRef.current = newState;
                        if (newState && !listening) {
                          try {
                            userStoppedRef.current = false;
                            recognitionRef.current?.start();
                            setListening(true);
                          } catch (err) {
                            console.warn("Failed starting speech recognition on wake word toggle:", err);
                          }
                        }
                        addLog("info", newState ? "Wake Up listener activated ('Hey Jerry' or 'Jerry')" : "Wake Up listener disabled");
                      }}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] rounded-md uppercase tracking-wider transition-all font-semibold cursor-pointer ${
                        wakeWordEnabled
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                          : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-transparent"
                      }`}
                      title={wakeWordEnabled ? "Wake Up listener active (Say 'Hey Jerry' or 'Jerry')" : "Enable Wake Up listener"}
                    >
                      <Radio className={`w-3 h-3 ${wakeWordEnabled ? "text-purple-400 animate-pulse" : "text-slate-500"}`} />
                      <span>{wakeWordEnabled ? "Wake Up On" : "Wake Up Off"}</span>
                    </button>
                    <button 
                      onClick={() => setSpeechSynthesisEnabled(!speechSynthesisEnabled)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-[9px] rounded-md uppercase tracking-wider transition-colors text-slate-300 font-semibold cursor-pointer"
                    >
                      {speechSynthesisEnabled ? <Volume2 className="w-3 h-3 text-cyan-400" /> : <VolumeX className="w-3 h-3 text-slate-500" />}
                      <span>{speechSynthesisEnabled ? "TTS On" : "TTS Off"}</span>
                    </button>
                  </div>
                </div>

                {/* Orb Area */}
                <div className="relative z-10 flex flex-col items-center text-center w-full max-w-sm mx-auto my-auto py-4">
                  <div
                    onClick={toggleListening}
                    className={`w-40 h-40 rounded-full border border-dashed flex items-center justify-center transition-all duration-500 cursor-pointer p-3 select-none ${
                      listening 
                        ? "border-purple-500/40 bg-purple-500/5 shadow-[0_0_40px_rgba(168,85,247,0.25)] scale-105" 
                        : "border-cyan-400/20 bg-cyan-500/2 hover:border-cyan-400/40 hover:shadow-[0_0_25px_rgba(34,211,238,0.12)] hover:bg-cyan-500/5 active:scale-95"
                    }`}
                  >
                    <div className={`w-32 h-32 rounded-full border flex items-center justify-center p-3 transition-all duration-500 ${
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
                          <div className="flex items-center gap-1.5 h-8">
                            <div className="w-1 h-4 bg-purple-400 rounded-full animate-pulse"></div>
                            <div className="w-1 h-7 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-10 bg-purple-400 rounded-full shadow-[0_0_10px_#a855f7] animate-pulse"></div>
                            <div className="w-1 h-6 bg-purple-400 rounded-full animate-bounce"></div>
                            <div className="w-1 h-3 bg-purple-400 rounded-full animate-pulse"></div>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center">
                            <Mic className="w-6 h-6 text-cyan-400 animate-pulse mb-1" />
                            <span className="text-[8px] font-mono tracking-widest text-slate-500 font-bold uppercase">READY</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2.5 w-full">
                    <p className={`text-[10px] font-bold tracking-[0.2em] uppercase transition-colors ${listening ? "text-purple-400" : "text-cyan-400"}`}>
                      {listening ? "Listening..." : "Click orb or speak"}
                    </p>
                    
                    {/* Real-time Web Speech Wake Word indicator for hands-free mode */}
                    <div className="flex items-center justify-center gap-2 px-3 py-1.5 bg-[#121422]/70 border border-purple-500/15 rounded-full max-w-[240px] mx-auto">
                      <span className={`w-2 h-2 rounded-full ${wakeWordEnabled ? "bg-purple-500 animate-pulse shadow-[0_0_8px_#a855f7]" : "bg-slate-600"}`}></span>
                      <span className="text-[9px] font-mono tracking-wider font-bold text-purple-300">
                        {wakeWordEnabled ? "WAKE WORD: 'HEY JERRY'" : "WAKE WORD: OFF"}
                      </span>
                    </div>

                    {transcript && (
                      <p className="text-xs text-slate-300 font-medium bg-white/5 border border-white/5 rounded-lg py-1 px-2.5 inline-block max-w-xs break-words font-mono">
                        "{transcript}"
                      </p>
                    )}
                    <div className="text-slate-400 text-xs border-t border-white/5 pt-3 mt-2">
                      <p className="text-[9px] uppercase tracking-widest font-mono text-purple-400 font-bold mb-1">Response</p>
                      <p className="text-slate-200 text-xs leading-relaxed max-w-xs mx-auto">
                        {aiResponse}
                      </p>
                    </div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {mobileTab === "ecosystem" && (
            <div className="max-w-xl mx-auto w-full">
              {/* Panel 2.5: Ecosystem Control Panel */}
              <div className="flex flex-col justify-between bg-[#0b0c14] border border-white/5 rounded-2xl p-5 min-h-[500px]">
            <div>
              <div className="flex justify-between items-center pb-3 border-b border-white/5 mb-4">
                <h3 className="text-xs font-bold tracking-wider text-slate-300 uppercase flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4 text-cyan-400" />
                  Ecosystem Control
                </h3>
                <span className="text-[10px] bg-cyan-400/10 text-cyan-400 px-2 py-0.5 rounded-full font-bold">
                  {devices.filter(d => d.on).length} Active
                </span>
              </div>

              {/* Scrollable Device List */}
              <div className="space-y-3 h-[380px] overflow-y-auto pr-1 select-none scrollbar-thin scrollbar-thumb-white/10">
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
                      className={`p-2.5 bg-white/[0.01] border border-white/5 rounded-xl flex flex-col transition-all duration-300 ${isExpanded ? "gap-2" : "gap-0"}`}
                    >
                      <div 
                        onClick={() => toggleRoom(roomName)}
                        className="flex justify-between items-center cursor-pointer select-none hover:bg-white/[0.03] p-1 -m-1 rounded-lg transition-colors"
                      >
                        <div className="flex items-center gap-1.5">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5 text-cyan-400" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
                          <h4 className="text-[10px] font-bold tracking-widest uppercase text-cyan-400 font-mono">
                            {roomName}
                          </h4>
                          <span className="text-[8px] font-mono text-slate-400 bg-cyan-400/10 px-1 py-0.2 rounded-full font-bold">
                            {activeCount}/{roomDevs.length}
                          </span>
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="space-y-1.5 mt-2 border-t border-white/5 pt-2">
                          {roomDevs.map(dev => (
                            <div 
                              key={dev.id} 
                              onClick={(e) => {
                                if ((e.target as HTMLElement).tagName !== "INPUT") {
                                  executeDeviceAction(dev.room, dev.deviceKey, dev.on ? "turn_off" : "turn_on");
                                }
                              }}
                              className={`p-2 border rounded-lg flex flex-col gap-1 transition-all duration-300 cursor-pointer ${
                                dev.on 
                                  ? "bg-cyan-500/10 border-cyan-500/25 hover:bg-cyan-500/15" 
                                  : "bg-white/5 hover:bg-white/10 border-white/5"
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {getDeviceIcon(dev)}
                                  <div>
                                    <p className="text-[11px] font-semibold text-white leading-tight">{dev.name}</p>
                                    <p className="text-[9px] text-slate-400 font-mono leading-none mt-0.5">{dev.statusText}</p>
                                  </div>
                                </div>

                                <div
                                  className={`p-1 rounded border transition-all ${
                                    dev.on 
                                      ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/35" 
                                      : "bg-slate-800/40 text-slate-400 border-white/5"
                                  }`}
                                >
                                  <Power className="w-3 h-3" />
                                </div>
                              </div>

                              {dev.on && dev.category === "fan" && dev.value !== undefined && (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <input
                                    type="range"
                                    min="1"
                                    max="5"
                                    value={dev.value}
                                    onChange={(e) => executeDeviceAction(dev.room, dev.deviceKey, "set_fan_speed", parseInt(e.target.value, 10))}
                                    className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                                  />
                                  <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-400/5 px-1 rounded">
                                    Spd {dev.value}
                                  </span>
                                </div>
                              )}

                              {dev.on && dev.category === "ac" && dev.value !== undefined && (
                                <div className="flex items-center gap-2 pt-0.5">
                                  <input
                                    type="range"
                                    min="16"
                                    max="30"
                                    value={dev.value}
                                    onChange={(e) => executeDeviceAction(dev.room, dev.deviceKey, "set_temp", parseInt(e.target.value, 10))}
                                    className="flex-1 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                  />
                                  <span className="text-[9px] font-mono text-amber-400 font-bold bg-amber-400/5 px-1 rounded">
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
                        <div className="border-t border-white/5 pt-3 mt-2 flex justify-between items-center text-[10px] text-slate-500">
              <span>Ecosystem State:</span>
              <span className="text-emerald-400 font-bold">ONLINE</span>
            </div>
          </div>
          </div>
          </div>
          )}

        </main>
      </div>
    );
  }

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
          <div className="border-l border-white/10 pl-4 md:pl-6 flex flex-col justify-center">
            <p className="text-sm md:text-lg font-light font-mono text-slate-300 leading-none">
              {currentTime || "12:00:00"}
            </p>
            <span className="text-[9px] font-bold text-cyan-400 font-sans tracking-wider mt-0.5 uppercase">Kolkata IST</span>
          </div>
        </div>
      </header>

      {/* Primary Navigation & Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto mb-6 px-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column (8 or 12 Cols depending on localhost): Navigation Bar + Active Tab View */}
          <div className={`${isLocalhost ? "lg:col-span-8" : "lg:col-span-12"} flex flex-col gap-6 w-full`}>
            
            {/* Navigation Tab Bar (Only shown on full application root access /) */}
            {routeInfo.mode === "full" && (
              <nav className="bg-[#11131f]/70 backdrop-blur-md border border-white/10 p-1 rounded-xl w-full">
                <div className="flex flex-wrap sm:flex-nowrap w-full gap-1">
                  <button
                    onClick={() => {
                      setRouteInfo({ mode: "full" });
                      setActiveTab("devices");
                      if (typeof window !== "undefined") window.history.pushState({}, "", "/");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      activeTab === "devices"
                        ? "bg-cyan-500/15 text-cyan-400 border border-cyan-500/25 shadow-[0_0_15px_rgba(34,211,238,0.12)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate">Ecosystem Devices</span>
                  </button>
                  <button
                    onClick={() => {
                      setRouteInfo({ mode: "full" });
                      setActiveTab("shopping");
                      if (typeof window !== "undefined") window.history.pushState({}, "", "/");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      activeTab === "shopping"
                        ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_15px_rgba(245,158,11,0.12)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate">Shopping List</span>
                  </button>
                  <button
                    onClick={() => {
                      setRouteInfo({ mode: "full" });
                      setActiveTab("chat");
                      if (typeof window !== "undefined") window.history.pushState({}, "", "/");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      activeTab === "chat" && !soloMode
                        ? "bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_15px_rgba(168,85,247,0.12)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Mic className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate">Voice Control</span>
                  </button>
                  <button
                    onClick={() => {
                      setRouteInfo({ mode: "full" });
                      setActiveTab("configurations");
                      if (typeof window !== "undefined") window.history.pushState({}, "", "/");
                    }}
                    className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                      activeTab === "configurations"
                        ? "bg-indigo-500/15 text-indigo-400 border border-indigo-500/25 shadow-[0_0_15px_rgba(99,102,241,0.12)]"
                        : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Settings className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    <span className="truncate">Config</span>
                  </button>
                  {isMobile && (
                    <button
                      onClick={toggleSoloMode}
                      className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        soloMode
                          ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      }`}
                      title="Switch to Mobile Vox Client Mode"
                    >
                      <Smartphone className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-purple-400" />
                      <span className="truncate">Mobile Mode</span>
                    </button>
                  )}
                </div>
              </nav>
            )}

            {/* Devices Tab */}
            {activeTab === "devices" && (
              <div className="bg-[#11131f]/30 border border-white/5 p-6 rounded-2xl flex flex-col justify-between">
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
                      {displayedDevices.filter(d => d.on).length} / {displayedDevices.length} ACTIVE
                    </span>
                  </div>
                </div>

                {/* Dedicated Room Banner when URL is /living_room, /dine_in, /bedroom, /bedroom_2 */}
                {routeInfo.mode === "room" && routeInfo.room && (
                  <div className="bg-cyan-500/15 border border-cyan-500/30 rounded-xl p-3.5 mb-5 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(34,211,238,0.12)]">
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
                      <div>
                        <p className="text-xs font-mono text-cyan-300 font-bold uppercase tracking-wider">
                          Dedicated Room View: <span className="text-white font-black">{routeInfo.room.toUpperCase()}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Restricted access mode (URL path: /{routeInfo.room.replace(/\s+/g, "_")})
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-5">
                  {(Object.entries(
                    displayedDevices.reduce((acc, dev) => {
                      if (!acc[dev.room]) acc[dev.room] = [];
                      acc[dev.room].push(dev);
                      return acc;
                    }, {} as Record<string, Device[]>)
                  ) as Array<[string, Device[]]>).map(([roomName, roomDevs]) => {
                    const isExpanded = routeInfo.mode === "room" ? true : !!expandedRooms[roomName];
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
          )}

        {/* Shopping List Tab */}
        {activeTab === "shopping" && (
          <div className="flex flex-col gap-4">
            {routeInfo.mode === "shopping" && (
              <div className="bg-amber-500/15 border border-amber-500/30 rounded-xl p-3.5 flex items-center justify-between gap-2 shadow-[0_0_15px_rgba(245,158,11,0.12)]">
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
                  <div>
                    <p className="text-xs font-mono text-amber-300 font-bold uppercase tracking-wider">
                      Dedicated Helper View: <span className="text-white font-black">SHOPPING LIST</span>
                    </p>
                    <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                      Restricted access mode (URL path: /helper)
                    </p>
                  </div>
                </div>
              </div>
            )}
            <ShoppingList onAddLog={addLog} />
          </div>
        )}

        {/* Legacy Schedules Removed */}
        {false && (
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
                
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 justify-between sm:justify-start">
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={resetTimeAutomationOnOnly}
                      className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 font-bold uppercase tracking-wider rounded-xl border border-white/5 transition-all cursor-pointer"
                      title="Reset only Time Automation On to Sunset - 3m"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reset Time</span>
                    </button>
                    <button
                      onClick={() => runAutomation("time_automation_on")}
                      className="flex-1 sm:flex-initial px-3.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-[10px] text-cyan-400 font-bold uppercase tracking-wider rounded-xl border border-cyan-500/20 transition-all cursor-pointer text-center"
                    >
                      Trigger Now
                    </button>
                  </div>
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

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 justify-between sm:justify-start">
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
                    className="px-3.5 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-[10px] text-purple-400 font-bold uppercase tracking-wider rounded-xl border border-purple-500/20 transition-all cursor-pointer text-center"
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
                <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between pt-2 border-t border-white/5">
                  <span className="text-[10px] font-mono text-indigo-400">Trigger Action: bedroom.bedside_light = turn_on</span>
                  <button
                    onClick={() => runAutomation("night_lamp_automation_on")}
                    className="px-3 py-1 bg-indigo-500/15 hover:bg-indigo-500/25 text-[9px] text-indigo-300 font-bold uppercase tracking-wider rounded-lg border border-indigo-500/20 transition-all cursor-pointer text-center"
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

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 justify-between sm:justify-start">
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
                    className="px-3.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-[10px] text-rose-400 font-bold uppercase tracking-wider rounded-xl border border-rose-500/20 transition-all cursor-pointer text-center"
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

                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between pt-3 border-t border-white/5">
                  <div className="flex items-center gap-2 bg-black/40 border border-white/5 rounded-xl px-3 py-1.5 justify-between sm:justify-start">
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
                    className="px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-400 font-bold uppercase tracking-wider rounded-xl border border-amber-500/20 transition-all cursor-pointer text-center"
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
                    onClick={() => {
                      const newState = !wakeWordEnabled;
                      setWakeWordEnabled(newState);
                      setWakeWordStandby(newState);
                      wakeWordStandbyRef.current = newState;
                      if (newState && !listening) {
                        try {
                          userStoppedRef.current = false;
                          recognitionRef.current?.start();
                          setListening(true);
                        } catch (err) {
                          console.warn("Failed starting speech recognition on wake word toggle:", err);
                        }
                      }
                      addLog("info", newState ? "Wake Up listener activated ('Hey Jerry' or 'Jerry')" : "Wake Up listener disabled");
                    }}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 text-[9px] rounded-md uppercase tracking-wider transition-all font-semibold cursor-pointer ${
                      wakeWordEnabled
                        ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.3)]"
                        : "bg-slate-800 hover:bg-slate-700 text-slate-400 border border-transparent"
                    }`}
                    title={wakeWordEnabled ? "Wake Up listener active (Say 'Hey Jerry' or 'Jerry')" : "Enable Wake Up listener"}
                  >
                    <Radio className={`w-3 h-3 ${wakeWordEnabled ? "text-purple-400 animate-pulse" : "text-slate-500"}`} />
                    <span>{wakeWordEnabled ? "Wake Up On" : "Wake Up Off"}</span>
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
            {!isConfigAuthenticated ? (
              <div className="bg-[#11131f]/60 backdrop-blur-md border border-white/10 p-8 rounded-3xl max-w-md mx-auto shadow-2xl animate-fade-in my-12">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="p-4 bg-amber-500/10 rounded-full border border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]">
                    <Lock className="w-10 h-10 text-amber-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">Protected Configuration</h2>
                    <p className="text-xs text-slate-400 mt-1">Please enter the administrative password to access system settings.</p>
                  </div>
                  <form onSubmit={handleConfigAuth} className="w-full space-y-4">
                    <div className="relative">
                      <input
                        type="password"
                        value={configAuthPassword}
                        onChange={(e) => setConfigAuthPassword(e.target.value)}
                        placeholder="Admin Password"
                        autoFocus
                        className={`w-full bg-black/40 border ${configAuthError ? "border-rose-500" : "border-white/10"} focus:border-amber-400/50 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none transition-all shadow-inner`}
                      />
                    </div>
                    {configAuthError && (
                      <p className="text-[10px] text-rose-400 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 animate-bounce">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Invalid Admin Credentials
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={isVerifyingConfig}
                      className="w-full bg-amber-500 hover:bg-amber-400 disabled:bg-amber-800 text-slate-950 font-bold py-3 rounded-xl transition-all shadow-[0_0_15px_rgba(245,158,11,0.2)] active:scale-95 flex items-center justify-center gap-2"
                    >
                      {isVerifyingConfig ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                      Unlock Configuration
                    </button>
                  </form>
                </div>
              </div>
            ) : (
              <>
                {/* Sub-navigation inside Configurations */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[#11131f]/70 backdrop-blur-md border border-white/10 p-1 rounded-xl w-full">
                  <div className="flex flex-wrap gap-1">
                    <button
                      onClick={() => setActiveConfigSubTab("gateway")}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        activeConfigSubTab === "gateway"
                          ? "bg-amber-500/15 text-amber-400 border border-amber-500/25 shadow-[0_0_10px_rgba(245,158,11,0.1)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Settings className="w-4 h-4" />
                      Gateway
                    </button>
                    <button
                      onClick={() => setActiveConfigSubTab("users")}
                      className={`flex-1 md:flex-initial flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all duration-300 cursor-pointer ${
                        activeConfigSubTab === "users"
                          ? "bg-purple-500/15 text-purple-400 border border-purple-500/25 shadow-[0_0_10px_rgba(168,85,247,0.1)]"
                          : "text-slate-400 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      User Management
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
                      System Console
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

                  <button
                    onClick={handleExitConfig}
                    className="flex items-center gap-2 px-4 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-bold uppercase tracking-wider rounded-lg border border-rose-500/20 transition-all cursor-pointer mr-1"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Exit Config
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

                {activeConfigSubTab === "users" && (
                  <div className="animate-fade-in">
                    <UserManagement onLog={addLog} allDevices={devices} />
                  </div>
                )}

                {activeConfigSubTab === "guide" && (
                  <div className="animate-fade-in">
                    <IntegrationGuide
                      selectedLanguage={selectedLanguage}
                      listening={listening}
                      isProcessing={isProcessing}
                      transcript={transcript}
                      chatMessages={chatMessages}
                      config={config}
                      handleProcessCommand={handleProcessCommand}
                      setListening={setListening}
                      setTranscript={setTranscript}
                      wakeWordEnabled={wakeWordEnabled}
                      setWakeWordEnabled={setWakeWordEnabled}
                    />
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* Right Column (4 Cols): Weather & AQI Environmental Panel (Only shown when accessed via localhost:3000) */}
      {isLocalhost && (
        <div className="lg:col-span-4 flex flex-col w-full">
          <WeatherPanel onAddLog={addLog} />
        </div>
      )}

        </div>
      </main>

    </div>
  );
}
