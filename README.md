# Smart Home Security Butler

> AI-Powered Smart Home Security Monitoring & Automation System

[中文文档](README.zh-CN.md) | [GitHub](https://github.com/symi-daguo/smart-home-security-butler) | [Issues](https://github.com/symi-daguo/smart-home-security-butler/issues) | [Releases](https://github.com/symi-daguo/smart-home-security-butler/releases)

> Sister project: [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX Gateway, Home Assistant, and Node-RED automation skill pack (operation & control layer)

AI-powered security monitoring and automation for smart homes. Proactively monitors Home Assistant, Node-RED, and KNX Gateways to detect security threats, send alerts, and generate intelligent automation recommendations.

---

## Table of Contents

- [Quick Start](#quick-start)
- [Features](#features)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Detection Categories](#detection-categories)
- [Security Scoring System](#security-scoring-system)
- [Project Structure](#project-structure)
- [System Requirements](#system-requirements)
- [Version](#version)
- [Related Projects](#related-projects)
- [License](#license)

---

## Quick Start

### 1. Docker Deployment (Recommended)

```bash
git clone https://github.com/symi-daguo/smart-home-security-butler.git
cd smart-home-security-butler
cp .env.example .env
# Edit .env with your configuration
docker compose up -d --build
```

Access the web UI: http://localhost:3000

### 2. Verify Installation

```bash
# Check container health
curl http://localhost:3000/api/health

# View system status
curl http://localhost:3000/api/status
```

---

## Features

| Feature | Description |
|---------|-------------|
| **Multi-source Collection** | Home Assistant, Node-RED, KNX Gateway, Matter Hub |
| **Security Detection** | Away mode anomalies, device faults, energy anomalies, door access violations |
| **AI Assistant** | Natural language conversation, security analysis, automation generation |
| **Multi-channel Alerts** | Telegram, Bark, ServerChan (WeChat) |
| **Security Scoring** | 0-100 comprehensive score with 5 dimensions |
| **Trend Analysis** | Alert trends, device health, energy patterns |
| **Local Processing** | All data stays local, no cloud dependency |
| **CasaOS Ready** | One-click deployment via CasaOS app store |

---

## Configuration

### Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for AI | - |
| `OPENROUTER_MODEL` | No | Primary AI model | `nvidia/nemotron-3-super-120b-a12b:free` |
| `HA_BASE_URL` | Recommended | Home Assistant URL | `http://172.17.0.1:8123` |
| `HA_TOKEN` | Recommended | HA long-lived access token | - |
| `NODERED_BASE_URL` | No | Node-RED URL | `http://172.17.0.1:1880` |
| `NODERED_TOKEN` | No | Node-RED token | - |
| `KNX_BASE_URL` | No | KNX Gateway URL | - |
| `KNX_TOKEN` | No | KNX Gateway token | - |
| `TELEGRAM_BOT_TOKEN` | No | Telegram bot token | - |
| `TELEGRAM_CHAT_ID` | No | Telegram chat ID | - |
| `BARK_DEVICE_KEY` | No | Bark device key | - |
| `SERVERCHAN_SEND_KEY` | No | ServerChan send key | - |
| `DETECTION_INTERVAL` | No | Detection interval (ms) | `300000` |
| `TZ` | No | Timezone | `Asia/Shanghai` |

### Home Assistant Token Setup

1. Go to your Home Assistant profile page
2. Scroll to **Long-Lived Access Tokens**
3. Click **Create Token**
4. Enter a name (e.g., "Smart Home Butler")
5. Copy the token and paste it into your `.env` file

---

## API Reference

### System

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/health` | GET | Health check |
| `/api/status` | GET | Full system status & metrics |
| `/api/settings` | GET/PUT | View/update settings |

### Devices & Scenes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/devices` | GET | List all devices/entities |
| `/api/devices/control` | POST | Control a device |
| `/api/scenes` | GET | List scenes & automations |
| `/api/scenes/activate` | POST | Activate a scene |
| `/api/rooms` | GET | Room/area statistics |

### Security

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/alerts` | GET | List security alerts |
| `/api/alerts/:id/acknowledge` | POST | Acknowledge alert |
| `/api/alerts/:id/close` | POST | Close alert |
| `/api/security-score` | GET | Security score details |
| `/api/detect` | POST | Run detection manually |
| `/api/trends` | GET | Trend analysis data |
| `/api/insights` | GET | AI security insights |

### AI

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/chat` | POST | Chat with AI assistant |
| `/api/chat/sessions` | GET | List chat sessions |
| `/api/chat/sessions/:id/messages` | GET | Session messages |
| `/api/chat/clear` | POST | Clear chat history |
| `/api/ai/test` | POST | Test AI connection |

### Automation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/templates` | GET | Automation templates |
| `/api/automation/generate` | POST | Generate automation from description |
| `/api/automation/apply` | POST | Apply automation |

### Notifications

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/collectors` | GET | List data collectors |
| `/api/collectors/test` | POST | Test collector connection |
| `/api/notifications/test` | POST | Test notification channel |

---

## Detection Categories

| Category | Severity | Description |
|----------|----------|-------------|
| Away Mode Anomaly | High | Devices turned on when home is in away mode |
| Device Fault | Medium | Offline, unavailable, or error-state devices |
| Energy Anomaly | Low | Unusual power consumption patterns |
| Door Access Violation | Critical | Doors/windows open at unexpected times |

---

## Security Scoring System

Comprehensive 0-100 score evaluating 5 dimensions:

| Dimension | Weight | Description |
|-----------|--------|-------------|
| Device Safety | 30% | Online rate, fault rate, battery health |
| Access Control | 25% | Door/window status, access violations |
| Energy Safety | 15% | Energy anomalies, consumption patterns |
| Automation Coverage | 15% | Resolution rate, response time |
| Away Mode Safety | 15% | Away mode security, abnormal activity |

**Grades**: A (90-100) | B (80-89) | C (70-79) | D (60-69) | F (<60)

---

## Project Structure

```
smart-home-security-butler/
├── .github/
│   ├── agents/           # Custom Copilot agents
│   ├── workflows/        # CI/CD & CodeQL workflows
│   ├── ISSUE_TEMPLATE/   # Issue templates
│   ├── CODEOWNERS        # Code review owners
│   ├── CONTRIBUTING.md   # Contribution guidelines
│   └── dependabot.yml    # Dependency auto-update
├── skills/               # Agent skill packages
│   ├── SKILL.md          # Main skill definition
│   ├── ha-log-collector/
│   ├── nodered-log-collector/
│   ├── security-detection/
│   └── automation-generator/
├── src/                  # Source code
│   ├── collectors/       # Data collection layer
│   ├── detectors/        # Security detection engine
│   ├── ai/               # AI agent & LLM integration
│   ├── analytics/        # Trend analysis & reporting
│   ├── automation/       # Automation generation
│   ├── notifier/         # Notification channels
│   ├── storage/          # Data persistence
│   ├── server.ts         # HTTP API server
│   └── index.ts          # Core butler class
├── public/               # Web UI frontend
├── scripts/              # Deployment scripts
├── Dockerfile            # Container build config
├── docker-compose.yml    # Docker compose file
├── casaos-app.json       # CasaOS app store config
├── SECURITY.md           # Security policy
└── README.md             # This file
```

---

## Version

**Current Version**: 0.6.1

### v0.6.1 (2026-06-30)

- **Custom Copilot Agents**: Added 3 specialized agents (security-review, docs-maintainer, troubleshooter) in `.github/agents/` directory
- **GitHub Agents Support**: Repository fully supports GitHub Copilot custom agents feature
- **README Optimization**: Added table of contents for better navigation, improved document structure
- **Documentation Refinement**: Simplified version history, only display latest version changelog
- **Version Strategy**: Adopted semantic versioning (MAJOR.MINOR.PATCH), small fixes use patch version

---

## System Requirements

- **CPU**: 1 core minimum
- **RAM**: 128MB minimum, 256MB recommended
- **Storage**: 500MB+ for data and logs
- **Docker**: Docker & Docker Compose
- **Home Assistant**: 2024.1+ (recommended)

**CasaOS Verified** (J1900):
- Memory usage: ~80-120MB
- CPU usage: < 5% idle
- Startup time: < 10 seconds

---

## Related Projects

- [knx-gateway-skills](https://github.com/symi-daguo/knx-gateway-skills) - KNX Gateway automation skills (operation & control layer)

---

## License

MIT

---

## Maintainer

symi-daguo
