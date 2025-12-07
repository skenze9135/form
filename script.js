// -----------------------------------------------------
// 1. Firebase Configuration (Modular SDK v12.6.0)
// -----------------------------------------------------
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/12.6.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyDJ4yFNi8MJ5W8fzCP2Tw3yVDam8IxyZuA",
  authDomain: "esp32-scanner-810f5.firebaseapp.com",
  databaseURL: "https://esp32-scanner-810f5-default-rtdb.firebaseio.com",
  projectId: "esp32-scanner-810f5",
  storageBucket: "esp32-scanner-810f5.firebasestorage.app",
  messagingSenderId: "631684355138",
  appId: "1:631684355138:web:073ca5067dca5b450149db",
  measurementId: "G-MP6S370VDF"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// -----------------------------------------------------
// 2. Helper Functions
// -----------------------------------------------------

// Get signal strength category
function getSignalStrength(rssi) {
  if (rssi >= -50) return { level: 'excellent', bars: 5, label: 'Excellent' };
  if (rssi >= -60) return { level: 'good', bars: 4, label: 'Good' };
  if (rssi >= -70) return { level: 'fair', bars: 3, label: 'Fair' };
  if (rssi >= -80) return { level: 'weak', bars: 2, label: 'Weak' };
  return { level: 'poor', bars: 1, label: 'Poor' };
}

// Get encryption type from ESP32 encryption code
function getEncryptionType(encryption) {
  const types = {
    0: { name: 'Open', class: 'open', icon: 'unlock' },
    1: { name: 'WEP', class: 'wep', icon: 'lock' },
    2: { name: 'WPA', class: 'wpa', icon: 'lock' },
    3: { name: 'WPA2', class: 'wpa2', icon: 'lock' },
    4: { name: 'WPA/WPA2', class: 'wpa2', icon: 'lock' },
    5: { name: 'Enterprise', class: 'enterprise', icon: 'shield' },
    6: { name: 'WPA3', class: 'wpa3', icon: 'shield' },
    7: { name: 'WPA2/WPA3', class: 'wpa3', icon: 'shield' },
    8: { name: 'WAPI', class: 'wpa2', icon: 'lock' }
  };
  return types[encryption] || { name: 'Unknown', class: 'open', icon: 'help' };
}

// Create encryption icon SVG
function createEncryptionIcon(type) {
  if (type === 'unlock') {
    return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>`;
  } else if (type === 'shield') {
    return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>`;
  } else {
    return `<svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>`;
  }
}

// Create signal bars HTML
function createSignalBars(rssi) {
  const signal = getSignalStrength(rssi);
  const heights = [4, 7, 10, 13, 16];

  let barsHtml = `<div class="signal-bars signal-${signal.level}">`;
  for (let i = 0; i < 5; i++) {
    const isActive = i < signal.bars;
    barsHtml += `<div class="signal-bar ${isActive ? 'active' : 'inactive'}" style="height: ${heights[i]}px;"></div>`;
  }
  barsHtml += '</div>';

  return barsHtml;
}

// Create WiFi icon SVG
function createWifiIcon() {
  return `
    <svg class="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.14 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
    </svg>
  `;
}

// Format time ago
function timeAgo(date) {
  const seconds = Math.floor((new Date() - date) / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return date.toLocaleDateString();
}

// Animate Value Helper
function animateValue(element, start, end, duration) {
  if (start === end) return;

  const range = end - start;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function
    const easeOutQuart = 1 - Math.pow(1 - progress, 4);
    const current = Math.round(start + range * easeOutQuart);

    element.textContent = current;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

// -----------------------------------------------------
// 3. Live Data Listener
// -----------------------------------------------------
const scansRef = ref(db, "scanner/latest");

onValue(scansRef, (snapshot) => {
  const data = snapshot.val();
  const emptyState = document.getElementById("emptyState");
  const statusDot = document.getElementById("statusDot");

  if (!data) {
    emptyState.style.display = 'block';
    statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-slate-900';
    return;
  }

  // Hide empty state
  emptyState.style.display = 'none';

  // Update status dot to green
  statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse';

  // Update stats with animation
  const countEl = document.getElementById("count");
  const strongestEl = document.getElementById("strongest");
  const timeEl = document.getElementById("time");

  // Animate count
  animateValue(countEl, parseInt(countEl.textContent) || 0, data.count, 500);

  // Update strongest signal
  strongestEl.textContent = data.strongest;

  // Update time
  const date = new Date(data.timestamp);
  timeEl.textContent = date.toLocaleTimeString();

  // Update time periodically
  clearInterval(window.timeUpdateInterval);
  window.timeUpdateInterval = setInterval(() => {
    timeEl.textContent = timeAgo(date);
  }, 10000);

  // -------- Fill Table --------
  const table = document.getElementById("wifiTable");
  table.innerHTML = "";

  // Sort networks by signal strength (strongest first)
  const networks = [...data.networks].sort((a, b) => b.rssi - a.rssi);

  networks.forEach((net, index) => {
    const signal = getSignalStrength(net.rssi);
    const encryption = getEncryptionType(net.encryption);
    const isHidden = net.hidden || !net.ssid;
    const ssidDisplay = isHidden ? 'Hidden Network' : net.ssid;
    const ssidClass = isHidden ? 'ssid-text ssid-hidden' : 'ssid-text';
    const hiddenBadge = isHidden ? '<span class="hidden-badge">Hidden</span>' : '';

    const row = document.createElement('tr');
    row.className = 'table-row';
    row.style.animationDelay = `${index * 50}ms`;

    row.innerHTML = `
      <td class="px-6 py-4">
        <div class="ssid-name">
          <div class="ssid-icon">
            ${createWifiIcon()}
          </div>
          <span class="${ssidClass}">${ssidDisplay}</span>
          ${hiddenBadge}
        </div>
      </td>
      <td class="px-6 py-4">
        <div class="rssi-badge rssi-${signal.level}">
          ${createSignalBars(net.rssi)}
          <span>${net.rssi} dBm</span>
        </div>
      </td>
      <td class="px-6 py-4">
        <span class="encryption-badge encryption-${encryption.class}">
          ${createEncryptionIcon(encryption.icon)}
          ${encryption.name}
        </span>
      </td>
      <td class="px-6 py-4">
        <span class="channel-badge">${net.channel}</span>
      </td>
      <td class="px-6 py-4">
        <span class="bssid">${net.bssid}</span>
      </td>
    `;

    table.appendChild(row);
  });
});

// -----------------------------------------------------
// 4. Connection Status Check
// -----------------------------------------------------
const connectedRef = ref(db, ".info/connected");

onValue(connectedRef, (snapshot) => {
  const statusDot = document.getElementById("statusDot");
  if (snapshot.val() === true) {
    statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse';
  } else {
    statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-slate-900';
  }
});
