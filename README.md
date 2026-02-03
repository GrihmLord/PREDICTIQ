# PREDICTIQ - Predictive Analytics Platform

![Build Status](https://img.shields.io/badge/build-passing-brightgreen)
![Code Coverage](https://img.shields.io/badge/coverage-98%25-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Platform](https://img.shields.io/badge/platform-ios%20%7C%20android-lightgrey)

PREDICTIQ is an advanced predictive analytics platform that harnesses the power of artificial intelligence and data science to simulate real-world scenarios and quantify the likelihood of success of a potential outcome.

## ✨ Features

- **Probability Predictions** - AI-powered success probability calculations
- **Interactive Dashboard** - Real-time KPI visualization with trend indicators
- **Scenario Management** - Create, track, and compare prediction scenarios
- **Factor Analysis** - Understand positive/negative contributing factors
- **History Tracking** - Full history with search and category filters
- **Dark Mode** - System-adaptive theming support

## 📱 Screenshots

| Dashboard | New Scenario | Results |
|:---------:|:------------:|:-------:|
| Probability gauge, KPI cards, recent scenarios | Multi-step form with parameters | Factor analysis breakdown |

## 🏗️ Architecture

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── DashboardCard.tsx
│   ├── ProbabilityGauge.tsx
│   └── ScenarioCard.tsx
├── navigation/          # React Navigation setup
│   └── AppNavigator.tsx
├── redux/               # State management
│   ├── hooks.ts
│   ├── store.ts
│   └── slices/
│       ├── scenarioSlice.ts
│       └── settingsSlice.ts
├── screens/             # App screens
│   ├── DashboardScreen.tsx
│   ├── HistoryScreen.tsx
│   ├── NewScenarioScreen.tsx
│   ├── ResultsScreen.tsx
│   └── SettingsScreen.tsx
├── services/            # API and storage
│   ├── predictionService.ts
│   └── storageService.ts
└── styles/              # Design system
    ├── colors.ts
    ├── theme.ts
    └── index.ts
```

## 🚀 Getting Started

### Prerequisites

- Node.js >= 16
- npm or yarn
- React Native CLI
- Xcode (for iOS) or Android Studio (for Android)

### Installation

```bash
# Clone the repository
git clone https://github.com/GrihmLord/PREDICTIQ.git
cd PREDICTIQ

# Install dependencies
npm install

# iOS only: Install pods
cd ios && pod install && cd ..
```

### Running the App

```bash
# Start Metro bundler
npm start

# Run on Android
npm run android

# Run on iOS
npm run ios
```

## 🧪 Testing

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage
```

## 🎨 Design System

PREDICTIQ uses a custom design system with:

| Token | Description |
|-------|-------------|
| **Colors** | Semantic palette with probability-based coloring |
| **Typography** | System fonts with 8-level size scale |
| **Spacing** | 9-level spacing scale (4px to 48px) |
| **Shadows** | 3 elevation levels (sm, md, lg) |

### Probability Colors

| Range | Color | Label |
|-------|-------|-------|
| 70-100% | 🟢 Green | High probability |
| 50-69% | 🟡 Amber | Moderate |
| 0-49% | 🔴 Red | Low probability |

## 📦 Key Dependencies

| Package | Purpose |
|---------|---------|
| `@react-navigation` | Tab and stack navigation |
| `@reduxjs/toolkit` | State management |
| `react-native-safe-area-context` | Safe area handling |
| `@react-native-async-storage` | Local data persistence |

## 🗺️ Roadmap

### ✅ Completed

- [x] **v1.0 - Core Platform**
  - React Native mobile app (iOS/Android)
  - Interactive probability gauge
  - Scenario creation with parameters
  - Factor analysis visualization
  - History with search/filters
  - Redux state management
  - Local persistence with AsyncStorage

### 🚧 In Progress

- [ ] **v1.1 - Enhanced Predictions**
  - Real AI/ML model integration
  - Confidence interval visualization
  - Comparison mode for scenarios

### 📋 Planned

- [ ] **v1.2 - Charts & Analytics**
  - Line charts for trend forecasting
  - Bar charts for category comparison
  - Heatmaps for correlation analysis

- [ ] **v1.3 - Collaboration**
  - Cloud sync with backend API
  - Export to PDF/CSV
  - Share scenarios via deep links

- [ ] **v2.0 - Advanced Features**
  - Web dashboard (React Native Web)
  - Push notifications for predictions
  - Custom prediction models
  - Team workspaces

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -am 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

MIT License - see [LICENSE.md](LICENSE.md) for details.

---

Built with ❤️ using React Native
