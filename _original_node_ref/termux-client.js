#!/usr/bin/env node

/**
 * Jerry Voice IoT - Termux Mobile Client
 * 
 * This Node.js CLI tool runs directly inside Termux on Android devices.
 * It lets you record voice commands, send them to your central dashboard server,
 * view device ecosystem status, and play back the vocal response (TTS).
 * 
 * Installation in Termux:
 * 1. Update pkg and install packages:
 *    pkg update && pkg install nodejs sox termux-api mpv -y
 * 
 * 2. Run this client:
 *    node termux-client.js
 */

const { exec, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Configurable Server Base URL
// By default, it will point to the host serving this dashboard.
let SERVER_URL = 'https://ais-dev-cazoub75ea5fnrsgrtkda3-172241432777.asia-southeast1.run.app'; // Will be replaced/customizable

const RECORD_FILE = path.join(__dirname, 'voice.wav');
const PLAY_FILE = path.join(__dirname, 'response.wav');

// Setup readline interface
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper: Custom terminal colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  blue: '\x1b[34m',
  bgBlack: '\x1b[40m',
  bgBlue: '\x1b[44m'
};

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function showHeader() {
  console.log(`${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.bright}${colors.magenta}      🤖 JERRY VOICE IoT HUB - TERMUX CLIENT 🤖      ${colors.reset}`);
  console.log(`${colors.dim}       Zero-latency voice and ecosystem command console${colors.reset}`);
  console.log(`${colors.cyan}====================================================${colors.reset}`);
  console.log(`${colors.dim}Target Server: ${colors.reset}${colors.yellow}${SERVER_URL}${colors.reset}`);
  console.log();
}

// Check installed system utilities in Termux
function checkDependencies() {
  const status = {
    rec: false,
    termuxMic: false,
    play: false,
    mpv: false,
    termuxPlay: false
  };

  try {
    execSync('which rec', { stdio: 'ignore' });
    status.rec = true;
  } catch (e) {}

  try {
    execSync('which termux-microphone-record', { stdio: 'ignore' });
    status.termuxMic = true;
  } catch (e) {}

  try {
    execSync('which play', { stdio: 'ignore' });
    status.play = true;
  } catch (e) {}

  try {
    execSync('which mpv', { stdio: 'ignore' });
    status.mpv = true;
  } catch (e) {}

  try {
    execSync('which termux-media-player', { stdio: 'ignore' });
    status.termuxPlay = true;
  } catch (e) {}

  return status;
}

// Record voice audio command (3 seconds)
function recordVoice(deps) {
  return new Promise((resolve, reject) => {
    // Delete old recording file if any
    if (fs.existsSync(RECORD_FILE)) {
      try { fs.unlinkSync(RECORD_FILE); } catch(e) {}
    }

    console.log(`\n${colors.bright}${colors.red}🎤 RECORDING STARTED... Speak into your mobile device now!${colors.reset}`);
    console.log(`${colors.dim}Capturing 3 seconds of audio...${colors.reset}\n`);

    let recordCmd = '';
    if (deps.rec) {
      // Use SoX recorder (recommended)
      recordCmd = `rec -c 1 -r 16000 -b 16 "${RECORD_FILE}" trim 0 3`;
    } else if (deps.termuxMic) {
      // Use termux native api
      recordCmd = `termux-microphone-record -f "${RECORD_FILE}" -l 3`;
    } else {
      console.log(`${colors.red}❌ No recorder utility found!${colors.reset}`);
      console.log(`Please install 'sox' or 'termux-api' first:`);
      console.log(`${colors.yellow}pkg install sox termux-api -y${colors.reset}`);
      return reject(new Error('No recorder installed'));
    }

    // Print a countdown / progress bar
    let secondsLeft = 3;
    const interval = setInterval(() => {
      secondsLeft--;
      if (secondsLeft > 0) {
        console.log(`${colors.yellow}   Remaining: ${secondsLeft}s...${colors.reset}`);
      }
    }, 1000);

    exec(recordCmd, (err) => {
      clearInterval(interval);
      if (err) {
        console.log(`${colors.red}❌ Recording command failed!${colors.reset}`);
        return reject(err);
      }
      console.log(`\n${colors.green}✓ Audio capture finished successfully.${colors.reset}`);
      resolve(RECORD_FILE);
    });
  });
}

// Download and Play TTS Audio response
async function playAudioResponse(audioUrl, deps) {
  if (!audioUrl) return;

  try {
    const fullAudioUrl = audioUrl.startsWith('http') ? audioUrl : `${SERVER_URL}${audioUrl}`;
    console.log(`${colors.dim}Streaming response voice...${colors.reset}`);

    // Download audio file to local path
    const response = await fetch(fullAudioUrl);
    if (!response.ok) throw new Error('Failed to fetch audio stream');
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync(PLAY_FILE, buffer);

    // Playback strategy
    let playCmd = '';
    if (deps.play) {
      playCmd = `play "${PLAY_FILE}" > /dev/null 2>&1`;
    } else if (deps.mpv) {
      playCmd = `mpv --no-video "${PLAY_FILE}" > /dev/null 2>&1`;
    } else if (deps.termuxPlay) {
      playCmd = `termux-media-player play "${PLAY_FILE}" > /dev/null 2>&1`;
    } else {
      console.log(`${colors.yellow}⚠️ Cannot play audio response back. No audio player ('sox', 'mpv', or 'termux-api') found.${colors.reset}`);
      return;
    }

    exec(playCmd);
  } catch (err) {
    console.log(`${colors.red}⚠️ Playback failed: ${err.message}${colors.reset}`);
  }
}

// Send voice command to server
async function uploadVoiceCommand(filePath, deps) {
  console.log(`${colors.cyan}⚡ Uploading audio command to Jerry AI Server...${colors.reset}`);
  
  try {
    if (!fs.existsSync(filePath)) {
      throw new Error('Recording file not found.');
    }

    const fileBuffer = fs.readFileSync(filePath);
    
    // Create native multipart form data
    const formData = new FormData();
    const audioBlob = new Blob([fileBuffer], { type: 'audio/wav' });
    formData.append('audio', audioBlob, 'voice.wav');

    const response = await fetch(`${SERVER_URL}/api/parse-audio`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    printCommandResult(data);

    // Stream playback
    if (data.audioUrl) {
      await playAudioResponse(data.audioUrl, deps);
    }
  } catch (err) {
    console.log(`${colors.red}❌ Failed to process voice: ${err.message}${colors.reset}`);
  }
}

// Send text command to server
async function sendTextCommand(text, deps) {
  console.log(`${colors.cyan}⚡ Parsing command text...${colors.reset}`);
  try {
    const response = await fetch(`${SERVER_URL}/api/parse-command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!response.ok) {
      throw new Error(`Server returned status ${response.status}`);
    }

    const data = await response.json();
    printCommandResult(data);

    // Request on-demand TTS
    if (data.response) {
      const ttsResponse = await fetch(`${SERVER_URL}/api/tts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: data.response })
      });
      if (ttsResponse.ok) {
        const ttsData = await ttsResponse.json();
        if (ttsData.audioUrl) {
          await playAudioResponse(ttsData.audioUrl, deps);
        }
      }
    }
  } catch (err) {
    console.log(`${colors.red}❌ Failed to process text: ${err.message}${colors.reset}`);
  }
}

function printCommandResult(data) {
  console.log(`\n${colors.cyan}----------------------------------------------------${colors.reset}`);
  console.log(`${colors.bright}${colors.green}🗣️ Transcript Heard: "${data.transcript || '(Unintelligible)'}"${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}💬 Jerry's Response: "${data.response}"${colors.reset}`);
  
  if (data.commands && data.commands.length > 0) {
    console.log(`\n${colors.yellow}🛠️ Executed Ecosystem Controls:${colors.reset}`);
    data.commands.forEach(cmd => {
      console.log(`   ➔ Room: ${colors.bright}${cmd.room}${colors.reset} | Device: ${colors.green}${cmd.device || 'All Room'}${colors.reset} | Action: ${colors.magenta}${cmd.action}${colors.reset}${cmd.value ? ` | Value: ${colors.cyan}${cmd.value}${colors.reset}` : ''}`);
    });
  } else {
    console.log(`\n${colors.dim}No specific ecosystem controls triggered.${colors.reset}`);
  }
  
  if (data.warning) {
    console.log(`\n${colors.yellow}⚠️ Warning: ${data.warning}${colors.reset}`);
  }
  console.log(`${colors.cyan}----------------------------------------------------${colors.reset}\n`);
}

// Fetch and list central devices state
async function listDevices() {
  console.log(`${colors.cyan}⌛ Fetching live ecosystem states...${colors.reset}`);
  try {
    const response = await fetch(`${SERVER_URL}/api/devices`);
    if (!response.ok) throw new Error('Could not fetch devices');
    
    const devices = await response.json();
    
    console.log(`\n${colors.bright}${colors.green}🏡 ECOSYSTEM STATUS REPORT:${colors.reset}`);
    console.log(`${colors.dim}--------------------------------------------------------------------------${colors.reset}`);
    
    // Group devices by room
    const rooms = {};
    devices.forEach(dev => {
      if (!rooms[dev.room]) rooms[dev.room] = [];
      rooms[dev.room].push(dev);
    });

    for (const [room, list] of Object.entries(rooms)) {
      console.log(`${colors.bright}${colors.magenta}📍 ${room.toUpperCase()}:${colors.reset}`);
      list.forEach(dev => {
        const stateColor = dev.on ? colors.green : colors.dim;
        const icon = dev.on ? '●' : '○';
        const valueStr = dev.value !== undefined ? ` [${dev.value}${dev.unit || ''}]` : '';
        console.log(`   ${stateColor}${icon}${colors.reset} ${dev.name.padEnd(22)}: ${stateColor}${dev.statusText}${colors.reset}${valueStr} ${colors.dim}(${dev.entityId})${colors.reset}`);
      });
      console.log();
    }
    console.log(`${colors.dim}--------------------------------------------------------------------------${colors.reset}\n`);
  } catch (err) {
    console.log(`${colors.red}❌ Could not connect to device hub: ${err.message}${colors.reset}\n`);
  }
}

// Manually control a device
async function toggleDevicePrompt() {
  try {
    const response = await fetch(`${SERVER_URL}/api/devices`);
    if (!response.ok) throw new Error('Could not fetch devices');
    const devices = await response.json();

    console.log(`\n${colors.bright}Select a device to toggle:${colors.reset}`);
    devices.forEach((dev, idx) => {
      console.log(`  [${idx + 1}] ${colors.cyan}${dev.room}${colors.reset} - ${dev.name} (${dev.on ? colors.green + 'ON' : colors.red + 'OFF'}${colors.reset})`);
    });
    console.log(`  [C] Cancel`);

    rl.question(`\nEnter choice: `, async (choice) => {
      if (choice.toLowerCase() === 'c') {
        mainLoop();
        return;
      }
      const num = parseInt(choice, 10);
      if (isNaN(num) || num < 1 || num > devices.length) {
        console.log(`${colors.red}Invalid choice.${colors.reset}`);
        setTimeout(mainLoop, 1500);
        return;
      }

      const selected = devices[num - 1];
      const nextAction = selected.on ? 'turn_off' : 'turn_on';
      
      console.log(`${colors.cyan}Issuing control...${colors.reset}`);
      const controlResponse = await fetch(`${SERVER_URL}/api/devices/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          room: selected.room,
          device: selected.deviceKey,
          action: nextAction
        })
      });

      if (controlResponse.ok) {
        const resData = await controlResponse.json();
        console.log(`${colors.green}✓ ${resData.device.name} updated: ${resData.device.statusText}${colors.reset}`);
      } else {
        console.log(`${colors.red}Failed to control device.${colors.reset}`);
      }
      setTimeout(mainLoop, 1500);
    });
  } catch (err) {
    console.log(`${colors.red}Error: ${err.message}${colors.reset}`);
    setTimeout(mainLoop, 2000);
  }
}

// Fetch and list central shopping list
async function listShoppingList() {
  try {
    console.log(`\n${colors.bright}Fetching Shopping List from server...${colors.reset}\n`);
    const response = await fetch(`${SERVER_URL}/api/shopping-list`);
    if (!response.ok) throw new Error('Failed to fetch shopping list');
    const items = await response.json();

    if (items.length === 0) {
      console.log(`${colors.yellow}Shopping list is currently empty.${colors.reset}\n`);
      return;
    }

    console.log(`${colors.bright}🛒 SMART SHOPPING LIST (${items.length} items):${colors.reset}`);
    items.forEach((item) => {
      const statusIcon = item.completed ? `${colors.green}[✓]` : `${colors.yellow}[ ]`;
      const textStyle = item.completed ? `${colors.dim}` : `${colors.bright}${colors.cyan}`;
      console.log(`  ${statusIcon} ${textStyle}${item.text}${colors.reset}`);
    });
    console.log();
  } catch (err) {
    console.log(`${colors.red}❌ Could not fetch shopping list: ${err.message}${colors.reset}\n`);
  }
}

// Modify Server URL
function updateServerUrlPrompt() {
  rl.question(`\nEnter new Server Base URL (e.g., http://192.168.1.100:3000):\n> `, (url) => {
    if (url.trim()) {
      SERVER_URL = url.trim();
      if (SERVER_URL.endsWith('/')) SERVER_URL = SERVER_URL.slice(0, -1);
      console.log(`${colors.green}✓ Server updated to: ${SERVER_URL}${colors.reset}\n`);
    } else {
      console.log(`${colors.yellow}No change made.${colors.reset}\n`);
    }
    setTimeout(mainLoop, 1500);
  });
}

function mainLoop() {
  clearScreen();
  showHeader();

  const deps = checkDependencies();

  console.log(`${colors.bright}👉 SELECT AN OPTION:${colors.reset}`);
  console.log(`  [1] ${colors.bright}${colors.green}🎙️ SPEAK VOICE COMMAND (Record 3 seconds)${colors.reset}`);
  console.log(`  [2] ${colors.cyan}💬 TYPE CHAT COMMAND (e.g. "add milk to shopping list")${colors.reset}`);
  console.log(`  [3] 🏡 LIST ECOSYSTEM DEVICES (Live status reporting)`);
  console.log(`  [4] ⚡ TOGGLE DEVICE MANUALLY`);
  console.log(`  [5] 🛒 VIEW SHOPPING LIST (Central synchronized list)`);
  console.log(`  [6] ⚙️  CHANGE SERVER TARGET IP/URL`);
  console.log(`  [E] ❌ EXIT`);
  console.log();
  console.log(`${colors.dim}Recorder found: ${deps.rec ? colors.green + 'SoX (rec)' : deps.termuxMic ? colors.green + 'Termux API (native)' : colors.red + 'None (Please install sox or termux-api)'}${colors.reset}`);
  console.log(`${colors.dim}Audio playback: ${deps.play ? colors.green + 'SoX (play)' : deps.mpv ? colors.green + 'mpv player' : deps.termuxPlay ? colors.green + 'Termux native' : colors.red + 'None'}${colors.reset}`);
  console.log();

  rl.question(`${colors.bright}Choice > ${colors.reset}`, async (answer) => {
    const opt = answer.trim().toLowerCase();

    if (opt === '1') {
      try {
        await recordVoice(deps);
        await uploadVoiceCommand(RECORD_FILE, deps);
      } catch (err) {
        console.log(`${colors.red}Error recording/uploading voice: ${err.message}${colors.reset}`);
      }
      rl.question(`\nPress Enter to return to menu...`, () => mainLoop());
    } else if (opt === '2') {
      rl.question(`\nEnter your voice command:\n> `, async (cmd) => {
        if (cmd.trim()) {
          await sendTextCommand(cmd.trim(), deps);
        }
        rl.question(`\nPress Enter to return to menu...`, () => mainLoop());
      });
    } else if (opt === '3') {
      await listDevices();
      rl.question(`\nPress Enter to return to menu...`, () => mainLoop());
    } else if (opt === '4') {
      toggleDevicePrompt();
    } else if (opt === '5') {
      await listShoppingList();
      rl.question(`\nPress Enter to return to menu...`, () => mainLoop());
    } else if (opt === '6') {
      updateServerUrlPrompt();
    } else if (opt === 'e') {
      console.log(`\nGoodbye! Thanks for using Jerry Voice IoT.\n`);
      rl.close();
      process.exit(0);
    } else {
      console.log(`${colors.red}Invalid selection. Try again.${colors.reset}`);
      setTimeout(mainLoop, 1000);
    }
  });
}

// Start CLI
mainLoop();
