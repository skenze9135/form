// -----------------------------------------------------
// 1. Firebase Configuration
// -----------------------------------------------------
const firebaseConfig = {
    databaseURL: "https://esp32-scanner-810f5-default-rtdb.firebaseio.com/"
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.database();

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

// -----------------------------------------------------
// 3. Live Data Listener
// -----------------------------------------------------
firebase.database().ref("scans/latest").on("value", (snapshot) => {
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
        const ssidDisplay = net.ssid || '<Hidden Network>';
        const ssidClass = net.ssid ? 'ssid-text' : 'ssid-text ssid-hidden';

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
        </div>
      </td>
      <td class="px-6 py-4">
        <div class="rssi-badge rssi-${signal.level}">
          ${createSignalBars(net.rssi)}
          <span>${net.rssi} dBm</span>
        </div>
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
// 4. Animate Value Helper
// -----------------------------------------------------
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
// 5. Connection Status Check
// -----------------------------------------------------
firebase.database().ref(".info/connected").on("value", (snapshot) => {
    const statusDot = document.getElementById("statusDot");
    if (snapshot.val() === true) {
        statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-slate-900 animate-pulse';
    } else {
        statusDot.className = 'absolute -top-1 -right-1 w-4 h-4 bg-red-400 rounded-full border-2 border-slate-900';
    }
});
