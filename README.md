**📡 ESP32 WiFi Scanner Dashboard**

A real-time dashboard that displays WiFi scan data from an ESP32. The ESP32 sends RSSI, MAC address, and timestamp information to Firebase Realtime Database, and the dashboard updates instantly in the browser. No backend is required—everything runs on client-side JavaScript.


**Repository Overview**

/public
   ├── index.html     → Main dashboard webpage
   ├── script.js      → Firebase connection + live data handling
   └── styles.css     → UI styling

firebase.json         → Firebase hosting configuration
.firebaserc           → Firebase project reference
README.md             → Project info

