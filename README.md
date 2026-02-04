# PREDICTIQ - Desktop Predictive Analytics Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Platform](https://img.shields.io/badge/platform-desktop%20%7C%20web-blue)
![License](https://img.shields.io/badge/license-MIT-blue)

PREDICTIQ is an advanced desktop predictive analytics platform built with **Electron** and **React Native Web**. It harnesses simulated artificial intelligence to quantify the likelihood of success for business scenarios, featuring real-time interactive vizualizations and local data persistence.

## ✨ Features

- **🖥️ Desktop Experience** - Native Windows application powered by Electron.
- **🧠 Predictive Engine** - Simulates AI analysis with probability & confidence scoring.
- **🛡️ Global Risk Protocol** - "War Room" interface with DEFCON monitoring and expert consensus.
- **⚡ Neural Activation** - Visualizes real-time expert attention and severity scoring.
- **📊 Interactive Charts** - Visualization of market trends and growth forecasts using `recharts`.
- **💾 Local Persistence** - Secure data saving with `electron-store` (offline-first).
- **📂 Scenario Management** - Create, track, and compare prediction scenarios.
- **🌗 Adaptive UI** - Dark-themed, responsive interface designed for professionals.
- **📡 Global Intelligence** - Live GDELT data streams with automatic **English Translation**.
- **🌍 3D War Room** - Interactive WebGL globe visualizing geopolitical hotspots.
- **📑 Enterprise Reporting** - One-click generation of PDF/PPTX audit logs.
- **🔐 Secure by Design** - Full Content Security Policy (CSP), Context Isolation, and Encrypted Storage.
- **🛡️ Developer Protections** - Clear Security Policy and Licensing.

## 🏗️ Architecture

The project follows a modular architecture separating the Electron main process from the React Native Web renderer.

```
PREDICTIQ/
├── electron/            # Main Process
│   └── main.js          # Electron entry point & window management
├── src/                 # Renderer Process (React Native Web)
│   ├── components/      # Reusable UI (ExpertSelector, Charts)
│   ├── screens_web/     # Desktop-optimized Screens
│   │   ├── DashboardScreen.tsx
│   │   ├── HistoryScreen.tsx
│   │   └── SettingsScreen.tsx
│   ├── services/        # Logic Layer
│   │   ├── PredictionService.ts   # Analysis Simulation
│   │   ├── GlobalRiskService.ts   # Council of Experts Logic
│   │   ├── ExpertVectorService.ts # Embedding-based Routing
│   │   └── StorageService.ts      # Persistence (Electron Store)
│   ├── navigation/      # Web Tab Navigator
│   └── App.tsx          # App Entry & Layout
└── package.json         # Dependencies & Scripts
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- macOS / Windows / Linux

### Installation

```bash
# Clone the repository
git clone https://github.com/GrihmLord/PREDICTIQ.git
cd PREDICTIQ

# Install dependencies
npm install
```

### Running the App

**Development Mode (Recommended):**
Runs the Electron app with live reloading.

```bash
npm run electron:dev
```

**Production Build:**
Builds the executable.

```bash
npm run electron:build
```

## 🎨 Design System

PREDICTIQ utilizes a professional dark mode palette:

| Element | Color | Hex |
| cost | --- | --- |
| **Background** | Slate | `#0F172A` |
| **Surface** | Dark Slate | `#1E293B` |
| **Primary** | Violet | `#8B5CF6` |
| **Success** | Emerald | `#10B981` |
| **Warning** | Amber | `#F59E0B` |

## 📦 Key Technologies

- **Electron**: Desktop runtime
- **React Native Web**: UI Framework
- **Recharts**: Data Visualization
- **Electron Store**: Persistence
- **TypeScript**: Type Safety

## 🔒 Security

PREDICTIQ is built with a "Security First" architecture:

- **Context Isolation**: Enabled to prevent renderer tampering.
- **No Node Integration**: Renderer process is sandboxed.
- **Secure Bridge**: Data access via controlled preload scripts.
- **CSP**: Strict Content Security Policy blocks unauthorized remote scripts.
- **Encrypted Storage**: Sensitive keys are encrypted at rest (on supported platforms).

## 🗺️ Roadmap

### ✅ Completed
- [x] **v1.0 - Core Desktop Platform**
  - Electron integration
  - Dashboard with probability gauge
  - Simulated AI Prediction Service
  - Local File Persistence
  - Interactive Trend Charts
- [x] **v1.2 - Global Risk & Neural Activation**
  - MoE (Mixture of Experts) Architecture
  - Vector-based Expert Routing
  - Round Table Consensus Protocol
  - Real-time Attention Visualization
- [x] **v1.3 - Production & Deep Control**
  - **Neural Engine**: Configurable Sensitivity, Chaos/Temperature, & Speed.
  - **Data Sovereignty**: Auto-pruning logs, JSON Import/Export, "Nuclear" Wipe.
  - **Production Ready**: Signed `.exe` installer, optimized build, hardened security.
  - **UX**: Advanced Settings, Dark Mode toggles, & Accessibility controls.

### 🚧 In Progress
- [ ] **v2.0 - Hybrid Cloud Intelligence**
  - Connect to real OpenAI/Anthropic API (`Connectivity` settings prepared).
  - [x] Stream real-time geopolitical data feeds (Completed in v2.1).
  - Team collaboration & Cloud Sync.

- [x] **v2.1 - Enterprise Reporting & Connectivity**
  - **Reporting Engine**: PDF/PPTX Export pipeline.
  - **White-Labeling**: Enterprise branding with dynamic theme injection.
  - **Real-Time Feeds**: Live GDELT WebSocket connection for breaking news.
  - **SSO Integration**: Mock Enterprise OAuth login flow.
- [x] **v2.2 - Geospatial Intelligence (Bonus)**
  - **3D Globe**: `react-globe.gl` integration.
  - **Volumetric Analysis**: Visualizing conflict intensity as 3D spikes.
  - **Dark Mode Optimization**: "Night View" aesthetic.

### 📋 Planned

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -am 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.
