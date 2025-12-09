// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyD-t79JyFVE90z4jbk5gfE_E6sY96uj44A",
  authDomain: "wifi-scan-dashbord-4de3e.firebaseapp.com",
  databaseURL: "https://wifi-scan-dashbord-4de3e-default-rtdb.firebaseio.com",
  projectId: "wifi-scan-dashbord-4de3e",
  storageBucket: "wifi-scan-dashbord-4de3e.firebasestorage.app",
  messagingSenderId: "462096576948",
  appId: "1:462096576948:web:aa913cf8f93f05dd8302e1",
  measurementId: "G-56LM0ESD1D"
};

let db = null;
let currentNetworks = [];
let currentSortBy = 'signal';
let allScanData = {}; // Store all fetched scan data

// Encryption type mapping
const encryptionTypes = {
  0: { name: 'Open', icon: 'fa-unlock', color: 'red' },
  1: { name: 'WEP', icon: 'fa-lock', color: 'orange' },
  2: { name: 'WPA-PSK', icon: 'fa-lock', color: 'yellow' },
  3: { name: 'WPA2-PSK', icon: 'fa-shield-alt', color: 'green' },
  4: { name: 'WPA/WPA2', icon: 'fa-shield-alt', color: 'green' },
  5: { name: 'WPA2-Enterprise', icon: 'fa-building', color: 'blue' },
  6: { name: 'WPA3-PSK', icon: 'fa-shield-alt', color: 'purple' },
  7: { name: 'WPA2/WPA3', icon: 'fa-shield-alt', color: 'purple' }
};

// Initialize Firebase
function initFirebase() {
  try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    updateStatus('Connected', 'green');
    setupRealtimeListeners();
  } catch (error) {
    console.error('Firebase init error:', error);
    updateStatus('Connection Error', 'red');
  }
}

// Update connection status
function updateStatus(text, color) {
  const dot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');

  dot.className = `w-3 h-3 rounded-full bg-${color}-500`;
  if (color === 'green') dot.classList.add('pulse-glow');
  statusText.textContent = text;
}

// Update last update time
function updateLastTime() {
  const now = new Date();
  document.getElementById('lastUpdate').textContent =
    `Last update: ${now.toLocaleTimeString()}`;
}

// Setup realtime listeners
function setupRealtimeListeners() {
  // Listen to latest scan
  db.ref('scans').orderByKey().limitToLast(1).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      const latestScanKey = Object.keys(data)[0];
      const latestScan = data[latestScanKey];
      updateDashboard(latestScan);
      updateLastTime();
    }
  });

  // Listen to scans (limit to last 2000 to prevent overload)
  db.ref('scans').orderByKey().limitToLast(2000).on('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      allScanData = data; // Store for modal
      const scanCount = Object.keys(data).length;
      document.getElementById('totalScans').textContent = scanCount >= 2000 ? '2000+' : scanCount;
      updateScanHistory(data);

      // Update modal if open
      if (!document.getElementById('historyModal').classList.contains('hidden')) {
        renderHistoryModal();
      }
    }
  });
}

// Update main dashboard with scan data
function updateDashboard(scanData) {
  // Update device name
  document.getElementById('deviceName').textContent = scanData.device || 'Unknown';

  // Update network count
  document.getElementById('networkCount').textContent = scanData.count || 0;

  // Store networks for sorting
  currentNetworks = scanData.networks || [];

  // Find strongest network
  if (currentNetworks.length > 0) {
    const strongest = currentNetworks.reduce((a, b) => a.rssi > b.rssi ? a : b);
    const strongestName = strongest.ssid || (strongest.hidden ? '<Hidden>' : 'Unknown');
    document.getElementById('strongestNetwork').textContent = strongestName;
    document.getElementById('strongestRSSI').textContent = `${strongest.rssi} dBm`;
  }

  // Update networks list
  sortNetworks(currentSortBy);

  // Update statistics
  updateSignalDistribution(currentNetworks);
  updateChannelChart(currentNetworks);
  updateEncryptionStats(currentNetworks);
}

// Sort and display networks
function sortNetworks(sortBy) {
  currentSortBy = sortBy;
  let sortedNetworks = [...currentNetworks];

  if (sortBy === 'signal') {
    sortedNetworks.sort((a, b) => b.rssi - a.rssi);
  } else if (sortBy === 'name') {
    sortedNetworks.sort((a, b) => (a.ssid || '').localeCompare(b.ssid || ''));
  }

  displayNetworks(sortedNetworks);
}

// Display networks list
function displayNetworks(networks) {
  const container = document.getElementById('networksList');

  if (networks.length === 0) {
    container.innerHTML = `
            <div class="text-gray-400 text-center py-8">
                <i class="fas fa-wifi-slash text-2xl mb-2"></i>
                <p>No networks found</p>
            </div>
        `;
    return;
  }

  container.innerHTML = networks.map((network, index) => {
    const signalInfo = getSignalInfo(network.rssi);
    const encryption = encryptionTypes[network.encryption] || encryptionTypes[0];
    // Logic for hidden networks
    let ssidDisplay = network.ssid;
    let isHidden = network.hidden;

    if (!ssidDisplay || ssidDisplay.length === 0) {
      ssidDisplay = 'Hidden Network';
      isHidden = true; // Force hidden flag if SSID is empty
    }

    return `
            <div class="network-card flex items-center justify-between p-4 bg-gray-700/50 rounded-xl transition-all duration-300 hover:bg-gray-700">
                <div class="flex items-center gap-4">
                    <div class="relative">
                        <div class="w-12 h-12 bg-${signalInfo.color}-500/20 rounded-xl flex items-center justify-center">
                            <i class="fas fa-wifi text-${signalInfo.color}-400 text-xl"></i>
                        </div>
                        ${isHidden ? '<span class="absolute -top-1 -right-1 w-5 h-5 bg-gray-600 border-2 border-gray-800 rounded-full flex items-center justify-center" title="Hidden Network"><i class="fas fa-eye-slash text-[10px] text-gray-300"></i></span>' : ''}
                    </div>
                    <div>
                        <p class="font-medium ${isHidden ? 'italic text-gray-400' : ''}">
                           ${ssidDisplay}
                           ${isHidden ? '<span class="ml-2 text-xs bg-gray-600 px-1.5 py-0.5 rounded text-gray-300">HIDDEN</span>' : ''}
                        </p>
                        <p class="text-sm text-gray-400 font-mono">${network.bssid || '--'}</p>
                    </div>
                </div>
                <div class="flex items-center gap-6">
                    <div class="text-center hidden sm:block">
                        <p class="text-xs text-gray-500">Channel</p>
                        <p class="font-medium">${network.channel || '--'}</p>
                    </div>
                    <div class="text-center hidden sm:block">
                        <p class="text-xs text-gray-500">Security</p>
                        <p class="text-${encryption.color}-400 text-sm flex items-center gap-1 justify-center">
                            <i class="fas ${encryption.icon}"></i>
                            ${encryption.name}
                        </p>
                    </div>
                    <div class="text-right min-w-[80px]">
                        <p class="font-bold text-${signalInfo.color}-400">${network.rssi} dBm</p>
                        <div class="flex items-end gap-0.5 justify-end mt-1">
                            ${generateSignalBars(network.rssi)}
                        </div>
                    </div>
                </div>
            </div>
        `;
  }).join('');
}

// Get signal info based on RSSI
function getSignalInfo(rssi) {
  if (rssi >= -50) return { level: 'Excellent', color: 'green' };
  if (rssi >= -60) return { level: 'Good', color: 'blue' };
  if (rssi >= -70) return { level: 'Fair', color: 'yellow' };
  return { level: 'Weak', color: 'red' };
}

// Generate signal bars HTML
function generateSignalBars(rssi) {
  let bars = 1;
  if (rssi >= -50) bars = 4;
  else if (rssi >= -60) bars = 3;
  else if (rssi >= -70) bars = 2;

  const signalInfo = getSignalInfo(rssi);
  let html = '';
  for (let i = 1; i <= 4; i++) {
    const height = i * 3 + 2;
    const active = i <= bars;
    html += `<div class="w-1.5 bg-${active ? signalInfo.color : 'gray'}-${active ? '400' : '600'} rounded-sm" style="height: ${height}px"></div>`;
  }
  return html;
}

// Update signal distribution chart
function updateSignalDistribution(networks) {
  let excellent = 0, good = 0, fair = 0, weak = 0;

  networks.forEach(n => {
    if (n.rssi >= -50) excellent++;
    else if (n.rssi >= -60) good++;
    else if (n.rssi >= -70) fair++;
    else weak++;
  });

  const total = networks.length || 1;

  document.getElementById('signalExcellent').style.width = `${(excellent / total) * 100}%`;
  document.getElementById('signalGood').style.width = `${(good / total) * 100}%`;
  document.getElementById('signalFair').style.width = `${(fair / total) * 100}%`;
  document.getElementById('signalWeak').style.width = `${(weak / total) * 100}%`;

  document.getElementById('countExcellent').textContent = excellent;
  document.getElementById('countGood').textContent = good;
  document.getElementById('countFair').textContent = fair;
  document.getElementById('countWeak').textContent = weak;
}

// Update channel usage chart
function updateChannelChart(networks) {
  const channels = {};
  for (let i = 1; i <= 14; i++) channels[i] = 0;

  networks.forEach(n => {
    if (n.channel && channels[n.channel] !== undefined) {
      channels[n.channel]++;
    }
  });

  const maxCount = Math.max(...Object.values(channels), 1);
  const container = document.getElementById('channelChart');

  container.innerHTML = Object.entries(channels).map(([ch, count]) => {
    const height = Math.max((count / maxCount) * 100, 10);
    const color = count > 0 ? (count > 2 ? 'orange' : 'blue') : 'gray';
    return `
            <div class="flex flex-col items-center gap-1">
                <div class="w-full bg-gray-700 rounded-t h-16 flex items-end">
                    <div class="w-full bg-${color}-500 rounded-t transition-all duration-500" style="height: ${height}%"></div>
                </div>
                <span class="text-xs text-gray-400">${ch}</span>
            </div>
        `;
  }).join('');
}

// Update encryption statistics
function updateEncryptionStats(networks) {
  const stats = {};

  networks.forEach(n => {
    const enc = encryptionTypes[n.encryption] || encryptionTypes[0];
    stats[enc.name] = (stats[enc.name] || 0) + 1;
  });

  const container = document.getElementById('encryptionStats');

  if (Object.keys(stats).length === 0) {
    container.innerHTML = '<p class="text-gray-400 text-sm">No data</p>';
    return;
  }

  container.innerHTML = Object.entries(stats).map(([name, count]) => {
    const encType = Object.values(encryptionTypes).find(e => e.name === name) || encryptionTypes[0];
    return `
            <div class="flex items-center justify-between py-2 border-b border-gray-700 last:border-0">
                <span class="flex items-center gap-2 text-sm">
                    <i class="fas ${encType.icon} text-${encType.color}-400"></i>
                    ${name}
                </span>
                <span class="bg-${encType.color}-500/20 text-${encType.color}-400 px-2 py-0.5 rounded text-sm">${count}</span>
            </div>
        `;
  }).join('');
}

// Update scan history
function updateScanHistory(allScans) {
  const container = document.getElementById('scanHistory');
  const scansArray = Object.entries(allScans)
    .map(([key, value]) => ({ key, ...value }))
    .reverse()
    .slice(0, 8);

  container.innerHTML = scansArray.map((scan, index) => {
    const networkCount = scan.count || 0;
    const strongest = scan.networks?.reduce((a, b) => a.rssi > b.rssi ? a : b, { rssi: -100 });
    const timestamp = getTimestampFromId(scan.key);
    const timeStr = new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    return `
            <div class="bg-gray-700/50 rounded-xl p-4 hover:bg-gray-700 transition cursor-pointer" onclick="loadScan('${scan.key}')">
                <div class="flex justify-between items-start mb-2">
                    <span class="text-xs text-gray-500">${timeStr}</span>
                    <span class="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs">${networkCount} networks</span>
                </div>
                <p class="font-medium text-sm truncate">${scan.device || 'Unknown'}</p>
                <p class="text-xs text-gray-400 mt-1">Strongest: ${strongest?.ssid || (strongest?.hidden ? 'Hidden' : '--')} (${strongest?.rssi || '--'} dBm)</p>
            </div>
        `;
  }).join('');
}

// Firebase Push ID Timestamp decoder
function getTimestampFromId(id) {
  try {
    const PUSH_CHARS = "-0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ_abcdefghijklmnopqrstuvwxyz";
    id = id.substring(0, 8);
    let timestamp = 0;
    for (let i = 0; i < 8; i++) {
      timestamp = timestamp * 64 + PUSH_CHARS.indexOf(id.charAt(i));
    }
    return timestamp;
  } catch (e) {
    return Date.now();
  }
}

// History Modal Functions
function openHistoryModal() {
  document.getElementById('historyModal').classList.remove('hidden');
  renderHistoryModal();
}

function closeHistoryModal() {
  document.getElementById('historyModal').classList.add('hidden');
}

function renderHistoryModal() {
  const container = document.getElementById('fullHistoryList');
  const loading = document.getElementById('historyLoading');
  const empty = document.getElementById('historyEmpty');

  container.innerHTML = '';

  // Filter last 30 days
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

  const historyItems = Object.entries(allScanData)
    .map(([key, value]) => {
      return {
        id: key,
        timestamp: getTimestampFromId(key),
        ...value
      };
    })
    .filter(item => item.timestamp > thirtyDaysAgo)
    .sort((a, b) => b.timestamp - a.timestamp); // Newest first

  document.getElementById('historyStats').textContent = `Showing ${historyItems.length} records`;

  if (historyItems.length === 0) {
    empty.classList.remove('hidden');
    return;
  } else {
    empty.classList.add('hidden');
  }

  container.innerHTML = historyItems.map(scan => {
    const date = new Date(scan.timestamp);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    const strongest = scan.networks?.reduce((a, b) => a.rssi > b.rssi ? a : b, { rssi: -100, ssid: '' });
    const strongestName = strongest.ssid || (strongest.hidden ? 'Hidden Network' : 'N/A');

    return `
            <tr class="border-b border-gray-700/50 hover:bg-gray-700/30 transition last:border-0">
                <td class="py-3 pl-2 text-gray-300 whitespace-nowrap">${dateStr}</td>
                <td class="py-3 text-gray-300">${scan.device || 'Unknown'}</td>
                <td class="py-3 text-center">
                    <span class="bg-gray-700 text-gray-300 px-2 py-1 rounded text-xs">${scan.count || 0}</span>
                </td>
                <td class="py-3">
                    <div class="flex items-center gap-2">
                        <span class="w-2 h-2 rounded-full ${strongest.rssi > -60 ? 'bg-green-500' : 'bg-yellow-500'}"></span>
                        <span class="text-gray-300 truncate max-w-[150px]" title="${strongestName}">${strongestName}</span>
                        <span class="text-xs text-gray-500">(${strongest.rssi} dBm)</span>
                    </div>
                </td>
                <td class="py-3 pr-2 text-right">
                    <button onclick="loadScanAndClose('${scan.id}')" class="text-blue-400 hover:text-blue-300 text-sm font-medium">
                        Load
                    </button>
                </td>
            </tr>
        `;
  }).join('');
}

function loadScanAndClose(scanId) {
  loadScan(scanId);
  closeHistoryModal();
}

function exportHistory() {
  const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
  const historyItems = Object.entries(allScanData)
    .map(([key, value]) => ({
      id: key,
      timestamp: getTimestampFromId(key),
      ...value
    }))
    .filter(item => item.timestamp > thirtyDaysAgo)
    .sort((a, b) => b.timestamp - a.timestamp);

  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Timestamp,Date,Time,Device,Network Count,Strongest SSID,Strongest RSSI,Hidden Networks Count\n";

  historyItems.forEach(item => {
    const date = new Date(item.timestamp);
    const strongest = item.networks?.reduce((a, b) => a.rssi > b.rssi ? a : b, { rssi: '', ssid: '' });
    const strongestName = strongest.ssid || (strongest.hidden ? '<Hidden>' : '');
    const hiddenCount = item.networks ? item.networks.filter(n => n.hidden).length : 0;

    const row = [
      item.timestamp,
      date.toLocaleDateString(),
      date.toLocaleTimeString(),
      item.device || 'Unknown',
      item.count || 0,
      `"${strongestName}"`,
      strongest.rssi || '',
      hiddenCount
    ].join(",");
    csvContent += row + "\n";
  });

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "wifi_scan_history.csv");
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Load specific scan
function loadScan(scanKey) {
  db.ref(`scans/${scanKey}`).once('value', (snapshot) => {
    const data = snapshot.val();
    if (data) {
      updateDashboard(data);
    }
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initFirebase);